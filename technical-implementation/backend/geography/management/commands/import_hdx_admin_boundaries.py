import json
import re
import tempfile
import zipfile
from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import urlopen

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from xml.etree import ElementTree

from geography.models import AdministrativeUnit
from geography.shapefile_geojson import ShapefileError, read_shapefile_features


HDX_XLSX_URL = (
    'https://data.humdata.org/dataset/cb58fa1f-687d-4cac-81a7-655ab1efb2d0/'
    'resource/e43e2790-f867-4b24-89cf-acfd9bc514e5/download/eth_admin_boundaries.xlsx'
)
HDX_DATASET_NAME = 'Ethiopia - Subnational Administrative Boundaries'
HDX_SOURCE = 'CSA + Regional Bureau of Finance and Economic Development (BoFED), via OCHA HDX'

NS = {
    'main': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
    'rel': 'http://schemas.openxmlformats.org/package/2006/relationships',
}


class Command(BaseCommand):
    help = 'Import Ethiopia HDX COD-AB administrative boundaries into AdministrativeUnit.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--source',
            default=HDX_XLSX_URL,
            help='HDX XLSX URL or local .xlsx path. Defaults to the Ethiopia COD-AB HDX resource.',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Parse the source and report changes without writing to the database.',
        )
        parser.add_argument(
            '--geojson-source',
            help=(
                'Optional local or remote GeoJSON file, .shp file, or shapefile ZIP with boundary features. '
                'Feature properties must include HDX admin P-codes.'
            ),
        )
        parser.add_argument(
            '--skip-country',
            action='store_true',
            help='Skip the admin0 Ethiopia row and import regions as top-level units.',
        )

    def handle(self, *args, **options):
        source = options['source']
        dry_run = options['dry_run']
        include_country = not options['skip_country']

        xlsx_path = self._resolve_source(source)
        workbook = XlsxWorkbook(xlsx_path)

        rows = []
        if include_country:
            rows.extend(self._rows_for_level(workbook, 'eth_admin0', AdministrativeUnit.Level.COUNTRY))
        rows.extend(
            self._rows_for_level(
                workbook,
                'eth_admin1',
                AdministrativeUnit.Level.REGION,
                keep_parent=include_country,
            )
        )
        rows.extend(self._rows_for_level(workbook, 'eth_admin2', AdministrativeUnit.Level.ZONE))
        rows.extend(self._rows_for_level(workbook, 'eth_admin3', AdministrativeUnit.Level.WOREDA))

        boundaries = {}
        if options.get('geojson_source'):
            boundaries = self._load_boundaries(options['geojson_source'])

        if not rows:
            raise CommandError('No administrative unit rows were found in the workbook.')

        if dry_run:
            self.stdout.write(
                self.style.WARNING(f'Dry run parsed {len(rows)} administrative units; no rows were saved.')
            )
            return

        created = 0
        updated = 0

        with transaction.atomic():
            for row in rows:
                parent = None
                if row['parent_code']:
                    parent = AdministrativeUnit.objects.filter(code=row['parent_code']).first()
                    if parent is None:
                        raise CommandError(
                            f"Parent unit {row['parent_code']} was not found for {row['code']}."
                        )

                unit, was_created = AdministrativeUnit.objects.update_or_create(
                    code=row['code'],
                    defaults={
                        'name': row['name'],
                        'name_alt': row['name_alt'],
                        'level': row['level'],
                        'parent': parent,
                        'source': HDX_SOURCE,
                        'source_dataset': HDX_DATASET_NAME,
                        'area_sqkm': row['area_sqkm'],
                        'latitude': row['latitude'],
                        'longitude': row['longitude'],
                        'bbox': boundaries.get(row['code'], {}).get('bbox'),
                        'boundary_geojson': boundaries.get(row['code'], {}).get('geometry'),
                        'valid_on': row['valid_on'],
                        'valid_to': row['valid_to'],
                        'data_version': row['data_version'],
                        'is_active': True,
                    },
                )
                created += int(was_created)
                updated += int(not was_created)

        self.stdout.write(
            self.style.SUCCESS(
                f'Imported {len(rows)} HDX administrative units: {created} created, {updated} updated.'
            )
        )

    def _resolve_source(self, source):
        parsed = urlparse(source)
        if parsed.scheme in {'http', 'https'}:
            try:
                with urlopen(source, timeout=60) as response:
                    content = response.read()
            except OSError as exc:
                raise CommandError(f'Could not download source file: {exc}') from exc

            temp = tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False)
            temp.write(content)
            temp.close()
            return Path(temp.name)

        path = Path(source)
        if not path.exists():
            raise CommandError(f'Source file not found: {path}')
        return path

    def _rows_for_level(self, workbook, sheet_name, level, keep_parent=True):
        sheet = workbook.sheet(sheet_name)
        if not sheet:
            raise CommandError(f'Missing expected sheet: {sheet_name}')

        headers = [normalize_header(value) for value in sheet[0]]
        records = []
        for row in sheet[1:]:
            values = dict(zip(headers, row))
            code = get_first(values, f'adm{level_to_number(level)}_pcode', 'admin3_pcod', 'admin0_pcod')
            name = get_first(
                values,
                f'adm{level_to_number(level)}_name',
                f'adm{level_to_number(level)}_ref_name',
                'admin3name',
                'admin0_name',
            )
            if not code or not name:
                continue

            parent_code = parent_code_for(values, level) if keep_parent else None
            records.append(
                {
                    'code': code,
                    'name': name,
                    'name_alt': alternate_names(values, level),
                    'level': level,
                    'parent_code': parent_code,
                    'area_sqkm': parse_decimal(get_first(values, 'area_sqkm')),
                    'latitude': parse_decimal(get_first(values, 'center_lat', 'lat')),
                    'longitude': parse_decimal(get_first(values, 'center_lon', 'long')),
                    'valid_on': parse_date(get_first(values, 'valid_on')),
                    'valid_to': parse_date(get_first(values, 'valid_to')),
                    'data_version': get_first(values, 'version'),
                }
            )
        return records

    def _load_boundaries(self, source):
        path = self._resolve_source(source)
        if is_shapefile_source(path):
            try:
                features = read_shapefile_features(path)
            except ShapefileError as exc:
                raise CommandError(str(exc)) from exc
        else:
            with open(path, 'r', encoding='utf-8') as handle:
                payload = json.load(handle)
            features = payload.get('features', [])

        boundaries = {}
        for feature in features:
            properties = feature.get('properties') or {}
            code = get_first_case_insensitive(
                properties,
                'adm3_pcode',
                'adm2_pcode',
                'adm1_pcode',
                'adm0_pcode',
                'admin3_pcod',
                'admin2_pcod',
                'admin1_pcod',
                'admin0_pcod',
                'pcode',
                'code',
            )
            geometry = feature.get('geometry')
            if code and geometry:
                boundaries[code] = {'geometry': geometry, 'bbox': geometry_bbox(geometry)}
        return boundaries


class XlsxWorkbook:
    def __init__(self, path):
        self.path = path
        self.archive = zipfile.ZipFile(path)
        self.shared_strings = self._read_shared_strings()
        self.sheets = self._read_sheet_paths()

    def sheet(self, name):
        sheet_path = self.sheets.get(name)
        if sheet_path is None:
            return None
        return self._read_sheet(sheet_path)

    def _read_shared_strings(self):
        if 'xl/sharedStrings.xml' not in self.archive.namelist():
            return []

        root = ElementTree.fromstring(self.archive.read('xl/sharedStrings.xml'))
        strings = []
        for item in root.findall('main:si', NS):
            parts = [node.text or '' for node in item.findall('.//main:t', NS)]
            strings.append(''.join(parts))
        return strings

    def _read_sheet_paths(self):
        workbook_root = ElementTree.fromstring(self.archive.read('xl/workbook.xml'))
        rels_root = ElementTree.fromstring(self.archive.read('xl/_rels/workbook.xml.rels'))
        rel_targets = {
            rel.attrib['Id']: rel.attrib['Target']
            for rel in rels_root.findall('rel:Relationship', NS)
        }

        paths = {}
        for sheet in workbook_root.findall('main:sheets/main:sheet', NS):
            rel_id = sheet.attrib[
                '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id'
            ]
            target = rel_targets[rel_id]
            paths[sheet.attrib['name']] = normalize_xlsx_path(target)
        return paths

    def _read_sheet(self, sheet_path):
        root = ElementTree.fromstring(self.archive.read(sheet_path))
        rows = []
        for row in root.findall('.//main:sheetData/main:row', NS):
            cells = {}
            for cell in row.findall('main:c', NS):
                ref = cell.attrib.get('r', '')
                index = column_index(ref)
                cells[index] = self._cell_value(cell)
            if cells:
                max_index = max(cells)
                rows.append([cells.get(index, '') for index in range(max_index + 1)])
        return rows

    def _cell_value(self, cell):
        cell_type = cell.attrib.get('t')
        value_node = cell.find('main:v', NS)
        inline_node = cell.find('main:is/main:t', NS)

        if inline_node is not None:
            return inline_node.text or ''
        if value_node is None:
            return ''

        value = value_node.text or ''
        if cell_type == 's':
            return self.shared_strings[int(value)]
        return value


def normalize_header(value):
    return str(value or '').strip().lower()


def level_to_number(level):
    return {
        AdministrativeUnit.Level.COUNTRY: 0,
        AdministrativeUnit.Level.REGION: 1,
        AdministrativeUnit.Level.ZONE: 2,
        AdministrativeUnit.Level.WOREDA: 3,
    }[level]


def get_first(values, *keys):
    for key in keys:
        value = values.get(key)
        if value not in {None, ''}:
            return str(value).strip()
    return ''


def get_first_case_insensitive(values, *keys):
    normalized = {str(key).lower(): value for key, value in values.items()}
    return get_first(normalized, *keys)


def alternate_names(values, level):
    level_number = level_to_number(level)
    candidates = [
        get_first(values, f'adm{level_number}_name1'),
        get_first(values, f'adm{level_number}_name2'),
        get_first(values, f'adm{level_number}_name3'),
        get_first(values, f'adm{level_number}_alt_name'),
        get_first(values, f'adm{level_number}_ref_name'),
    ]
    return '; '.join(dict.fromkeys(value for value in candidates if value))


def parent_code_for(values, level):
    if level == AdministrativeUnit.Level.COUNTRY:
        return None
    if level == AdministrativeUnit.Level.REGION:
        return get_first(values, 'adm0_pcode', 'admin0_pcod')
    if level == AdministrativeUnit.Level.ZONE:
        return get_first(values, 'adm1_pcode', 'admin1_pcod')
    if level == AdministrativeUnit.Level.WOREDA:
        return get_first(values, 'adm2_pcode', 'admin2_pcod')
    return None


def parse_decimal(value):
    if value in {None, ''}:
        return None
    try:
        return Decimal(str(value).strip())
    except InvalidOperation:
        return None


def parse_date(value):
    if value in {None, ''}:
        return None

    raw_value = str(value).strip()
    if raw_value.isdigit():
        return date(1899, 12, 30) + timedelta(days=int(raw_value))

    for fmt in ('%Y-%m-%d', '%Y-%m-%d %H:%M:%S', '%d/%m/%Y'):
        try:
            return datetime.strptime(raw_value[:19], fmt).date()
        except ValueError:
            continue
    return None


def column_index(cell_ref):
    match = re.match(r'([A-Z]+)', cell_ref)
    if not match:
        return 0
    index = 0
    for char in match.group(1):
        index = index * 26 + (ord(char) - ord('A') + 1)
    return index - 1


def normalize_xlsx_path(target):
    target = target.lstrip('/')
    if target.startswith('xl/'):
        return target
    return f'xl/{target}'


def is_shapefile_source(path):
    suffix = path.suffix.lower()
    return suffix == '.shp' or zipfile.is_zipfile(path)


def geometry_bbox(geometry):
    coordinates = list(iter_coordinate_pairs(geometry.get('coordinates', [])))
    if not coordinates:
        return None

    longitudes = [coordinate[0] for coordinate in coordinates]
    latitudes = [coordinate[1] for coordinate in coordinates]
    return [min(longitudes), min(latitudes), max(longitudes), max(latitudes)]


def iter_coordinate_pairs(value):
    if (
        isinstance(value, list)
        and len(value) >= 2
        and isinstance(value[0], (int, float))
        and isinstance(value[1], (int, float))
    ):
        yield value
        return

    if isinstance(value, list):
        for item in value:
            yield from iter_coordinate_pairs(item)
