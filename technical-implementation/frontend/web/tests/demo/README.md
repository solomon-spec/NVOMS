# Playwright Demo Recordings

Playwright is used here for reviewable demo videos, not fast CI checks.

## Commands

- `npm run demo` records all demo walkthroughs.
- `npm run demo:auth` records the current auth and role-navigation walkthrough.
- `npm run demo:patients` records the patient registry walkthrough.
- `npm run demo:report` opens the Playwright HTML report.

The demo tests run headlessly, slow down interaction timing, and record video for every run. Generated files are written to `test-results/` and linked from `playwright-report/`.

Keep demo specs user-flow oriented. Prefer slower typing, short pauses after transitions, and role coverage that makes the resulting video useful to review.

For the patient registry demo, seed local backend data first:

```bash
cd ../../backend
source nvoms_env/bin/activate
python setup_demo_patients.py
```
