# Data Area

This area separates persistent system data and working datasets.

- `database/schema/`
  core SQL schema and ERD-related artifacts
- `database/migrations/`
  versioned schema changes
- `database/seeds/`
  seed and demo data
- `datasets/vaccination/`
  immunization-related sample or cleaned data
- `datasets/surveillance/`
  surveillance and symptom datasets
- `datasets/meteorological/`
  weather and climate input data
- `datasets/reference/`
  static reference datasets such as administrative units and vaccine codes
- `datasets/eth_admin_boundaries.xlsx`
  required Ethiopia HDX administrative hierarchy used by the geography importer
- `datasets/eth_admin_boundaries.shp.zip`
  required Ethiopia HDX boundary geometries used by the geography importer
- `demo/demo-data-huge-no-geography.json`
  optional full demo dataset; if absent, the backend bundled sample can still be used

The GDB and GeoJSON HDX archives are intentionally not required for local setup;
the app importer uses the XLSX plus shapefile ZIP.
