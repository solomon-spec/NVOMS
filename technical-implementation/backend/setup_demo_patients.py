"""
Compatibility wrapper for the old demo seeding entrypoint.

The previous version hard-coded low-quality generated rows. Use the JSON-driven
loader instead:

    ./nvoms_env/bin/python manage.py load_demo_data path/to/demo.json --reset --auto-geography
"""

import os
import sys

import django
from django.core.management import call_command


def run_seed(json_file=None, namespace="quality-demo", reset=False, auto_geography=False):
    if not json_file:
        raise SystemExit(
            "setup_demo_patients.py now requires a JSON file. "
            "Run: python setup_demo_patients.py path/to/demo.json --reset"
        )
    call_command(
        "load_demo_data",
        json_file,
        namespace=namespace,
        reset=reset,
        auto_geography=auto_geography,
    )


if __name__ == "__main__":
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "nvoms.settings")
    django.setup()

    args = [arg for arg in sys.argv[1:] if arg not in {"--reset", "--auto-geography"}]
    run_seed(
        json_file=args[0] if args else None,
        namespace=os.environ.get("NVOMS_DEMO_NAMESPACE", "quality-demo"),
        reset="--reset" in sys.argv[1:],
        auto_geography="--auto-geography" in sys.argv[1:],
    )
