# Playwright Demo Recordings

Playwright is used here for reviewable demo videos, not fast CI checks.

## Commands

- `npm run demo` records all demo walkthroughs.
- `npm run demo:auth` records the current auth and role-navigation walkthrough.
- `npm run demo:patients` records the patient registry walkthrough.
- `npm run demo:patient-detail` records the patient detail workspace walkthrough.
- `npm run demo:registration` records the patient registration walkthrough.
- `npm run demo:immunizations` records the immunization walkthrough.
- `npm run demo:surveillance` records the surveillance walkthrough.
- `npm run demo:risk-map` records the public health risk map walkthrough.
- `npm run demo:defaulters` records the defaulter cluster walkthrough.
- `npm run demo:self-service` records the patient self-service walkthrough.
- `npm run demo:caregiver` records the caregiver gap/fallback walkthrough.
- `npm run demo:videos` prints generated `.webm` video paths.
- `npm run demo:report` opens the Playwright HTML report.

The demo tests run headlessly, slow down interaction timing, and record video for every run. Section commands write to stable folders under `test-results/<section>/`, and reports are linked from `playwright-report/`.

Keep demo specs user-flow oriented. Prefer slower typing, short pauses after transitions, and role coverage that makes the resulting video useful to review.

After a successful run, locate videos with:

```bash
npm run demo:videos
```

For patient registry and public health monitoring demos, seed local backend data first:

```bash
cd ../../backend
source nvoms_env/bin/activate
python setup_demo_patients.py
```
