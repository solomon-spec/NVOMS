#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend/web"
FULL_DEMO_JSON="$ROOT_DIR/data/demo/demo-data-huge-no-geography.json"

cd "$BACKEND_DIR"

if [ ! -d "nvoms_env" ]; then
  python3 -m venv nvoms_env
fi

source nvoms_env/bin/activate
pip install -r requirements.txt

python manage.py migrate
python setup_test_accounts.py

python manage.py import_hdx_admin_boundaries \
  --source ../data/datasets/eth_admin_boundaries.xlsx \
  --geojson-source ../data/datasets/eth_admin_boundaries.shp.zip

if [ -f "$FULL_DEMO_JSON" ]; then
  python manage.py load_demo_data "$FULL_DEMO_JSON" --namespace quality-demo --reset --auto-geography
else
  echo "Full demo JSON not found at $FULL_DEMO_JSON"
  echo "Loading the small bundled sample instead."
  python manage.py load_demo_data demo_data.example.json --namespace quality-demo --reset --auto-geography
fi

cd "$FRONTEND_DIR"
npm install

cat <<'EOF'

Demo setup complete.

Run the backend:
  cd technical-implementation/backend
  source nvoms_env/bin/activate
  python manage.py runserver 127.0.0.1:8000

Run the frontend:
  cd technical-implementation/frontend/web
  npm run dev -- --hostname 127.0.0.1 --port 3000

Login:
  admin@nvoms.local / password123
  hw@nvoms.local / password123
  pho@nvoms.local / password123

EOF
