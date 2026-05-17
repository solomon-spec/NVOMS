import struct
import zipfile
from pathlib import Path


class ShapefileError(ValueError):
    pass


def read_shapefile_features(source):
    source_path = Path(source)
    if source_path.suffix.lower() == '.zip' or zipfile.is_zipfile(source_path):
        return _read_zip_features(source_path)

    shp_bytes, dbf_bytes = _read_source_files(source_path)
    return _features_from_bytes(shp_bytes, dbf_bytes)


def _read_zip_features(source_path):
    features = []
    with zipfile.ZipFile(source_path) as archive:
        shp_names = [
            name
            for name in archive.namelist()
            if Path(name).suffix.lower() == '.shp'
            and Path(name).with_suffix('').name.lower() in {'eth_admin0', 'eth_admin1', 'eth_admin2', 'eth_admin3'}
        ]
        if not shp_names:
            raise ShapefileError('No HDX administrative polygon .shp files were found in the ZIP archive.')

        for shp_name in sorted(shp_names):
            stem = Path(shp_name).with_suffix('').name.lower()
            dbf_name = next(
                (
                    name
                    for name in archive.namelist()
                    if Path(name).suffix.lower() == '.dbf'
                    and Path(name).with_suffix('').name.lower() == stem
                ),
                None,
            )
            if not dbf_name:
                raise ShapefileError(f'No .dbf file was found for {shp_name}.')
            features.extend(_features_from_bytes(archive.read(shp_name), archive.read(dbf_name)))
    return features


def _features_from_bytes(shp_bytes, dbf_bytes):
    shapes = _read_shapes(shp_bytes)
    records = _read_dbf_records(dbf_bytes)

    features = []
    for index, geometry in enumerate(shapes):
        if geometry is None:
            continue
        properties = records[index] if index < len(records) else {}
        features.append(
            {
                'type': 'Feature',
                'properties': properties,
                'geometry': geometry,
            }
        )
    return features


def _read_source_files(source_path):
    if source_path.suffix.lower() != '.shp':
        raise ShapefileError('Shapefile source must be a .shp file or ZIP archive.')

    dbf_path = source_path.with_suffix('.dbf')
    if not dbf_path.exists():
        raise ShapefileError(f'Missing DBF attributes file: {dbf_path}')
    return source_path.read_bytes(), dbf_path.read_bytes()


def _read_shapes(payload):
    if len(payload) < 100:
        raise ShapefileError('Invalid shapefile: header is missing.')

    shapes = []
    offset = 100
    while offset + 8 <= len(payload):
        _, content_words = struct.unpack('>2i', payload[offset:offset + 8])
        offset += 8
        content_length = content_words * 2
        content = payload[offset:offset + content_length]
        offset += content_length
        if len(content) < 4:
            continue

        shape_type = struct.unpack('<i', content[:4])[0]
        if shape_type == 0:
            shapes.append(None)
        elif shape_type in {5, 15, 25}:
            shapes.append(_polygon_geometry(content))
        else:
            raise ShapefileError(f'Unsupported shapefile geometry type: {shape_type}')
    return shapes


def _polygon_geometry(content):
    if len(content) < 44:
        raise ShapefileError('Invalid polygon record.')

    num_parts, num_points = struct.unpack('<2i', content[36:44])
    parts_offset = 44
    points_offset = parts_offset + (num_parts * 4)
    if len(content) < points_offset + (num_points * 16):
        raise ShapefileError('Invalid polygon point data.')

    parts = list(struct.unpack(f'<{num_parts}i', content[parts_offset:points_offset]))
    points = [
        list(struct.unpack('<2d', content[points_offset + index * 16:points_offset + (index + 1) * 16]))
        for index in range(num_points)
    ]

    rings = []
    for index, start in enumerate(parts):
        end = parts[index + 1] if index + 1 < len(parts) else num_points
        ring = points[start:end]
        if ring and ring[0] != ring[-1]:
            ring = [*ring, ring[0]]
        if len(ring) >= 4:
            rings.append(ring)

    polygons = _group_rings(rings)
    if len(polygons) == 1:
        return {'type': 'Polygon', 'coordinates': polygons[0]}
    return {'type': 'MultiPolygon', 'coordinates': polygons}


def _group_rings(rings):
    if not rings:
        return []

    outers = [{'ring': ring, 'holes': [], 'bbox': _ring_bbox(ring)} for ring in rings if _signed_area(ring) <= 0]
    holes = [ring for ring in rings if _signed_area(ring) > 0]
    if not outers:
        return [[ring] for ring in rings]

    for hole in holes:
        point = hole[0]
        owner = next((outer for outer in outers if _bbox_contains(outer['bbox'], point)), None)
        if owner:
            owner['holes'].append(hole)
        else:
            outers.append({'ring': hole, 'holes': [], 'bbox': _ring_bbox(hole)})

    return [[outer['ring'], *outer['holes']] for outer in outers]


def _signed_area(ring):
    area = 0
    for index in range(len(ring) - 1):
        x1, y1 = ring[index]
        x2, y2 = ring[index + 1]
        area += (x1 * y2) - (x2 * y1)
    return area / 2


def _ring_bbox(ring):
    xs = [point[0] for point in ring]
    ys = [point[1] for point in ring]
    return min(xs), min(ys), max(xs), max(ys)


def _bbox_contains(bbox, point):
    min_x, min_y, max_x, max_y = bbox
    return min_x <= point[0] <= max_x and min_y <= point[1] <= max_y


def _read_dbf_records(payload):
    if len(payload) < 32:
        raise ShapefileError('Invalid DBF file: header is missing.')

    record_count = struct.unpack('<I', payload[4:8])[0]
    header_length = struct.unpack('<H', payload[8:10])[0]
    record_length = struct.unpack('<H', payload[10:12])[0]

    fields = []
    offset = 32
    while offset + 32 <= header_length and payload[offset] != 0x0D:
        descriptor = payload[offset:offset + 32]
        name = descriptor[:11].split(b'\x00', 1)[0].decode('latin1').strip()
        field_type = chr(descriptor[11])
        length = descriptor[16]
        decimals = descriptor[17]
        fields.append((name, field_type, length, decimals))
        offset += 32

    records = []
    offset = header_length
    for _ in range(record_count):
        record = payload[offset:offset + record_length]
        offset += record_length
        if not record or record[0:1] == b'*':
            continue

        values = {}
        cursor = 1
        for name, field_type, length, decimals in fields:
            raw = record[cursor:cursor + length].decode('latin1').strip()
            cursor += length
            values[name] = _parse_dbf_value(raw, field_type, decimals)
        records.append(values)
    return records


def _parse_dbf_value(value, field_type, decimals):
    if value == '':
        return ''
    if field_type in {'N', 'F'}:
        try:
            return float(value) if decimals else int(value)
        except ValueError:
            return value
    if field_type == 'L':
        return value.upper() in {'Y', 'T'}
    return value
