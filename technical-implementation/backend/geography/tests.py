from django.test import TestCase
from django.core.management import call_command
from rest_framework.test import APIClient
from decimal import Decimal
import struct
import tempfile
import zipfile

from authentication.serializers import issue_tokens_for_user
from geography.models import AdministrativeUnit
from users.models import Role, User


class GeographyMutationTests(TestCase):
    def setUp(self):
        self.admin_role = Role.objects.create(role_code='ADMIN', role_name='Admin')
        self.pho_role = Role.objects.create(
            role_code='PUBLIC_HEALTH_OFFICIAL',
            role_name='Public Health Official',
        )
        self.admin = User.objects.create_user(
            email='admin@example.com',
            password='password123',
            full_name='Admin User',
            role=self.admin_role,
            status=User.Status.ACTIVE,
        )
        self.pho = User.objects.create_user(
            email='pho@example.com',
            password='password123',
            full_name='PHO User',
            role=self.pho_role,
            status=User.Status.ACTIVE,
        )
        self.parent = AdministrativeUnit.objects.create(
            code='REG-1',
            name='Region 1',
            level=AdministrativeUnit.Level.REGION,
        )
        self.child = AdministrativeUnit.objects.create(
            code='WOR-1',
            name='Woreda 1',
            level=AdministrativeUnit.Level.WOREDA,
            parent=self.parent,
        )
        self.client = APIClient()

    def authenticate(self, user):
        refresh = issue_tokens_for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def test_mutations_are_restricted_to_admin(self):
        self.authenticate(self.pho)

        response = self.client.post(
            '/api/v1/geography/',
            {'code': 'REG-2', 'name': 'Region 2', 'level': AdministrativeUnit.Level.REGION},
            format='json',
        )

        self.assertEqual(response.status_code, 403)

    def test_delete_with_child_units_returns_conflict(self):
        self.authenticate(self.admin)

        response = self.client.delete(f'/api/v1/geography/{self.parent.id}/')

        self.assertEqual(response.status_code, 409)
        self.parent.refresh_from_db()
        self.assertTrue(self.parent.is_active)

    def test_admin_soft_deletes_unit_without_children(self):
        self.authenticate(self.admin)

        response = self.client.delete(f'/api/v1/geography/{self.child.id}/')

        self.assertEqual(response.status_code, 204)
        self.child.refresh_from_db()
        self.assertFalse(self.child.is_active)


class HDXAdministrativeBoundaryImportTests(TestCase):
    def test_import_command_creates_hierarchy_and_map_metadata(self):
        with tempfile.NamedTemporaryFile(suffix='.xlsx') as workbook:
            create_test_xlsx(workbook.name)

            call_command('import_hdx_admin_boundaries', '--source', workbook.name)

        country = AdministrativeUnit.objects.get(code='ET')
        region = AdministrativeUnit.objects.get(code='ET01')
        zone = AdministrativeUnit.objects.get(code='ET0101')
        woreda = AdministrativeUnit.objects.get(code='ET010101')

        self.assertEqual(country.level, AdministrativeUnit.Level.COUNTRY)
        self.assertEqual(region.parent, country)
        self.assertEqual(zone.parent, region)
        self.assertEqual(woreda.parent, zone)
        self.assertEqual(woreda.latitude, Decimal('9.123456'))
        self.assertEqual(woreda.longitude, Decimal('38.123456'))
        self.assertEqual(woreda.area_sqkm, Decimal('123.456'))
        self.assertEqual(woreda.valid_on.isoformat(), '2025-01-01')
        self.assertIn('Alt Woreda', woreda.name_alt)

    def test_import_command_loads_boundary_geometry_from_shapefile_zip(self):
        with (
            tempfile.NamedTemporaryFile(suffix='.xlsx') as workbook,
            tempfile.NamedTemporaryFile(suffix='.zip') as shapefile_zip,
        ):
            create_test_xlsx(workbook.name)
            create_test_shapefile_zip(shapefile_zip.name)

            call_command(
                'import_hdx_admin_boundaries',
                '--source',
                workbook.name,
                '--geojson-source',
                shapefile_zip.name,
            )

        woreda = AdministrativeUnit.objects.get(code='ET010101')

        self.assertEqual(woreda.boundary_geojson['type'], 'Polygon')
        self.assertEqual(woreda.bbox, [0.0, 0.0, 1.0, 1.0])


def create_test_xlsx(path):
    sheets = {
        'eth_admin0': [
            ['iso2', 'iso3', 'adm0_name', 'adm0_pcode', 'valid_on', 'area_sqkm', 'version', 'center_lat', 'center_lon'],
            ['ET', 'ETH', 'Ethiopia', 'ET', '2025-01-01', '1104300', 'v04', '9', '40'],
        ],
        'eth_admin1': [
            ['adm1_name', 'adm1_name1', 'adm1_pcode', 'adm0_pcode', 'valid_on', 'area_sqkm', 'version', 'center_lat', 'center_lon'],
            ['Test Region', 'Alt Region', 'ET01', 'ET', '2025-01-01', '1000.5', 'v04', '9.1', '38.1'],
        ],
        'eth_admin2': [
            ['adm2_name', 'adm2_name1', 'adm2_pcode', 'adm1_pcode', 'valid_on', 'area_sqkm', 'version', 'center_lat', 'center_lon'],
            ['Test Zone', 'Alt Zone', 'ET0101', 'ET01', '2025-01-01', '456.7', 'v04', '9.12', '38.12'],
        ],
        'eth_admin3': [
            ['adm3_name', 'adm3_name1', 'adm3_pcode', 'adm2_pcode', 'valid_on', 'area_sqkm', 'version', 'center_lat', 'center_lon'],
            ['Test Woreda', 'Alt Woreda', 'ET010101', 'ET0101', '2025-01-01', '123.456', 'v04', '9.123456', '38.123456'],
        ],
    }

    with zipfile.ZipFile(path, 'w') as archive:
        archive.writestr('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>')
        archive.writestr('xl/workbook.xml', workbook_xml(sheets.keys()))
        archive.writestr('xl/_rels/workbook.xml.rels', workbook_rels_xml(len(sheets)))
        for index, rows in enumerate(sheets.values(), start=1):
            archive.writestr(f'xl/worksheets/sheet{index}.xml', sheet_xml(rows))


def create_test_shapefile_zip(path):
    with zipfile.ZipFile(path, 'w') as archive:
        archive.writestr('eth_admin3.shp', test_polygon_shp())
        archive.writestr('eth_admin3.dbf', test_polygon_dbf())


def test_polygon_shp():
    points = [(0.0, 0.0), (0.0, 1.0), (1.0, 1.0), (1.0, 0.0), (0.0, 0.0)]
    bbox = (0.0, 0.0, 1.0, 1.0)
    content = (
        struct.pack('<i', 5)
        + struct.pack('<4d', *bbox)
        + struct.pack('<2i', 1, len(points))
        + struct.pack('<i', 0)
        + b''.join(struct.pack('<2d', *point) for point in points)
    )
    file_length_words = (100 + 8 + len(content)) // 2
    header = (
        struct.pack('>i', 9994)
        + (b'\x00' * 20)
        + struct.pack('>i', file_length_words)
        + struct.pack('<2i', 1000, 5)
        + struct.pack('<4d', *bbox)
        + struct.pack('<4d', 0.0, 0.0, 0.0, 0.0)
    )
    record_header = struct.pack('>2i', 1, len(content) // 2)
    return header + record_header + content


def test_polygon_dbf():
    field_name = b'ADM3_PCODE\x00'
    field_length = 12
    header_length = 32 + 32 + 1
    record_length = 1 + field_length
    header = (
        b'\x03\x7d\x01\x01'
        + struct.pack('<IHH', 1, header_length, record_length)
        + (b'\x00' * 20)
    )
    field = (
        field_name.ljust(11, b'\x00')
        + b'C'
        + (b'\x00' * 4)
        + bytes([field_length, 0])
        + (b'\x00' * 14)
    )
    record = b' ' + b'ET010101'.ljust(field_length, b' ')
    return header + field + b'\x0d' + record + b'\x1a'


def workbook_xml(sheet_names):
    sheet_nodes = ''.join(
        f'<sheet name="{name}" sheetId="{index}" r:id="rId{index}"/>'
        for index, name in enumerate(sheet_names, start=1)
    )
    return (
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        f'<sheets>{sheet_nodes}</sheets></workbook>'
    )


def workbook_rels_xml(count):
    rels = ''.join(
        '<Relationship '
        f'Id="rId{index}" '
        'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" '
        f'Target="worksheets/sheet{index}.xml"/>'
        for index in range(1, count + 1)
    )
    return f'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">{rels}</Relationships>'


def sheet_xml(rows):
    row_nodes = []
    for row_index, row in enumerate(rows, start=1):
        cells = ''.join(
            f'<c r="{column_name(col_index)}{row_index}" t="inlineStr"><is><t>{value}</t></is></c>'
            for col_index, value in enumerate(row, start=1)
        )
        row_nodes.append(f'<row r="{row_index}">{cells}</row>')
    return (
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        f'<sheetData>{"".join(row_nodes)}</sheetData></worksheet>'
    )


def column_name(index):
    name = ''
    while index:
        index, remainder = divmod(index - 1, 26)
        name = chr(65 + remainder) + name
    return name
