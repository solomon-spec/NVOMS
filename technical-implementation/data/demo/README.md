# Demo Data

Place the full generated demo JSON here:

```text
technical-implementation/data/demo/demo-data-huge-no-geography.json
```

The loader can use generated geography-like codes in that JSON and map them to
the imported HDX administrative units:

```bash
cd technical-implementation/backend
python manage.py load_demo_data ../data/demo/demo-data-huge-no-geography.json --namespace quality-demo --reset --auto-geography
```

If the full file is not available, use the small bundled sample instead:

```bash
cd technical-implementation/backend
python manage.py load_demo_data demo_data.example.json --namespace quality-demo --reset --auto-geography
```

