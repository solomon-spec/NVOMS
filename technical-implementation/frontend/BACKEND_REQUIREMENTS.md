# Frontend Backend Requirements

## Surveillance

- Public health officials can list surveillance reports through `GET /api/v1/surveillance/`, but report detail, report status updates, and follow-up action APIs are limited to admin/health worker roles. The frontend reflects that split and uses list payloads for public-health review.

## Analytics

- Current frontend analytics use `GET /api/v1/analytics/coverage/` and `GET /api/v1/analytics/coverage/by-region/`.
- Missing backend capabilities for future analytics expansion: dashboard trend series, risk map output, defaulter clusters, and AEFI aggregate analytics.

## Reports

- Current frontend reports use `POST /api/v1/reports/defaulters`, `POST /api/v1/reports/coverage`, `POST /api/v1/reports/aefi`, and `GET /api/v1/reports/{job_id}/download`.
- Missing backend capability: generated report list/history endpoint scoped to the requesting user.
- Download gap: `GET /api/v1/reports/{job_id}/download` currently returns report metadata and `file_uri`; it does not stream the generated file. A binary download response or signed file URL would let the frontend provide a direct download action.
