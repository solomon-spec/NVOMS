# NVOMS Frontend Flow and Implementation Specification

## 1. Purpose of This Document

This document defines a professional frontend flow for the **National Vaccination and Outbreak Monitoring System (NVOMS)** based on the current implemented frontend modules and the formal requirement document. It is written to be easy for an LLM or developer to implement without guessing the intended navigation, user journey, page responsibilities, role permissions, and missing UI polish.

The goal is not to redesign the whole frontend from scratch. The goal is to organize the existing frontend into a clearer, role-based, production-ready user experience that supports health workers, administrators, public health officials, and patients/caregivers.

---

## 2. Frontend Product Principles

The frontend should follow these principles across all modules:

1. **Role-first navigation**  
   Users should only see pages and actions relevant to their role.

2. **Clinical safety first**  
   Dose recording, expired batch warnings, surveillance alerts, and offline sync must be visually clear and hard to submit accidentally.

3. **Low-resource usability**  
   The interface should be simple, fast, readable, and usable in unstable network environments.

4. **Workflow-based screens**  
   Pages should guide users through real tasks such as registering a patient, recording a dose, reporting surveillance data, generating reports, and reviewing outbreak risk.

5. **Clear system status**  
   The user should always know whether they are online, offline, syncing, viewing stale data, or waiting for a queued backend job.

6. **Progressive complexity**  
   Common actions should be obvious. Advanced filters, bulk actions, integration settings, and administrative tools should be available but not visually overwhelming.

---

## 3. User Roles and Frontend Access Matrix

| Role | Main Responsibility | Main Pages | Hidden/Restricted Pages |
|---|---|---|---|
| `ADMIN` | Manage system users, roles, facilities, settings, reports, and integrations | Dashboard, Patients, Reports, Notifications, Admin Console, Surveillance, Interoperability Settings | Patient self-service unless viewing as support |
| `HEALTH_WORKER` | Register patients, record immunizations, report AEFI/VPD, manage offline work | Patients, Immunizations, Surveillance, Notifications, limited Dashboard | Admin Console, system-wide integration settings |
| `PUBLIC_HEALTH_OFFICER` | Monitor coverage, outbreak risk, defaulters, surveillance queue, reports | Dashboard, Surveillance, Risk Map, Reports, Notifications | User creation/editing unless explicitly allowed |
| `PATIENT` / Caregiver | View vaccination card, QR ID, timeline, overdue status | Self-Service Portal | Admin, Reports, Surveillance, full registry |

### Route Guard Rules

- Unauthenticated users must be redirected to `/login`.
- Authenticated users attempting to access unauthorized pages must be redirected to their role landing page.
- Invalid or expired tokens must clear session data and redirect to `/login`.
- Password reset routes must remain public but token-protected.

---

## 4. Global Application Shell

All protected pages should use the same application shell.

### 4.1 Layout Structure

```text
AppShell
├── Top Header
│   ├── System name / logo
│   ├── Current facility or region context
│   ├── Online/offline indicator
│   ├── Pending sync badge
│   ├── Notifications unread counter
│   └── User menu
├── Sidebar Navigation
│   ├── Role-filtered menu items
│   └── Active page highlight
└── Main Content Area
    ├── Page title
    ├── Page-level actions
    ├── Filters/search if needed
    └── Module content
```

### 4.2 Global Header Requirements

The header must show:

- Online or offline status
- Number of pending offline records
- Sync status: `Synced`, `Pending Sync`, `Syncing`, `Sync Error`
- Notification unread count
- Logged-in user name and role
- Facility or administrative unit context where applicable

### 4.3 Sidebar Navigation by Role

#### Admin Sidebar

```text
Dashboard
Patients
Immunizations
Surveillance
Reports
Notifications
Admin Console
System Settings
Interoperability
```

#### Health Worker Sidebar

```text
Today
Patients
Immunizations
Surveillance
Notifications
Offline Queue
```

#### Public Health Officer Sidebar

```text
Dashboard
Risk Map
Surveillance
Defaulter Clusters
Reports
Notifications
```

#### Patient/Caregiver Sidebar or Bottom Tabs

```text
My Vaccination Card
QR ID
Upcoming Doses
Alerts
```

---

## 5. Recommended Route Structure

The existing routes should be organized like this:

```text
/public
  /login
  /forgot-password
  /reset-password/:token

/protected
  /                         Dashboard
  /patients                 Patient Registry
  /patients/new             Register Patient
  /patients/:id             Patient Detail Workspace
  /patients/:id/edit        Edit Patient and Caregiver
  /patients/:id/schedule    Vaccination Schedule View

  /immunizations            Dose Recording Workspace
  /immunizations/new        Record Dose
  /immunizations/:id        Dose Record Detail

  /surveillance             Surveillance Triage Queue
  /surveillance/new         Report AEFI or VPD
  /surveillance/:id         Surveillance Report Detail

  /risk-map                 Outbreak Risk Map and Silent Districts
  /defaulters               Defaulter Tracking and Cluster View

  /reports                  Reporting Engine
  /reports/:jobId           Report Job Detail

  /notifications            Notification Center

  /admin                    Admin Console Overview
  /admin/users              User Management
  /admin/roles              Role Management
  /admin/facilities         Facility Management
  /admin/geography          Region / Zone / Woreda / Kebele Management
  /admin/vaccines           Vaccine and EPI Rule Management
  /admin/batches            Vaccine Batch Management

  /settings                 System Settings
  /settings/sms             SMS Gateway Settings
  /settings/interoperability DHIS2 and FHIR Settings
  /offline-queue            Pending Local Records and Sync Conflicts

/patient
  /self-service             Patient Portal Home
  /self-service/qr          QR Patient ID
  /self-service/timeline    Vaccination Timeline
  /self-service/alerts      Overdue and Defaulter Alerts
```

### Implementation Note

If the current app already uses `/`, `/patients`, `/immunizations`, `/surveillance`, `/reports`, `/notifications`, `/admin`, and `/self-service`, do not rename existing routes unless necessary. Instead, add nested routes gradually and keep backward-compatible redirects.

---

## 6. Authentication and Session Flow

### 6.1 Login Flow

```text
User opens app
↓
If no valid token → show Login page
↓
User enters email/phone + password
↓
Frontend submits credentials
↓
Backend returns user profile, role, permissions, token
↓
Store token securely
↓
Route user based on role
```

### 6.2 Role Landing Pages

| Role | After Login Redirect |
|---|---|
| `ADMIN` | `/` dashboard |
| `HEALTH_WORKER` | `/patients` or `/immunizations` depending on existing workflow |
| `PUBLIC_HEALTH_OFFICER` | `/` dashboard or `/risk-map` |
| `PATIENT` | `/self-service` |

### 6.3 Login Page UI

The login page should contain:

- NVOMS logo/name
- Short system subtitle: “National Vaccination and Outbreak Monitoring System”
- Email or phone input
- Password input
- Login button
- Forgot password link
- Error state for invalid credentials
- Locked account message if returned by backend

### 6.4 Password Recovery Flow

```text
Forgot password
↓
Enter email or phone
↓
Submit recovery request
↓
Show neutral success message
↓
User opens reset link
↓
Validate token
↓
Set new password
↓
Redirect to login
```

### UX Requirement

Do not reveal whether an email/phone exists during password recovery. Always show a neutral message like:

> If the account exists, a reset link has been sent.

---

## 7. Dashboard and Analytics Flow

### 7.1 Purpose

The dashboard is the command center for administrators and public health officials. It should summarize vaccination coverage, outbreak risk, defaulter trends, surveillance alerts, and report status.

### 7.2 Dashboard Layout

```text
Dashboard
├── Filter Bar
│   ├── Geographic level: National / Region / Zone / Woreda / Facility
│   ├── Date range
│   └── Vaccine type
├── KPI Cards
│   ├── Total registered patients
│   ├── Total doses administered
│   ├── Zero-dose children
│   ├── Defaulters
│   ├── Active outbreak alerts
│   └── Pending reports
├── Coverage Trend Chart
├── Defaulter Cluster Table
├── Outbreak Risk Summary
└── Recent Critical Alerts
```

### 7.3 KPI Card Behavior

Each KPI card should:

- Show a clear title
- Show the value
- Show change from previous period where available
- Use small helper text explaining the metric
- Be clickable if there is a relevant detailed page

Example:

```text
Zero-dose Children
1,248
+8.2% from last month
Click to view high-risk facilities
```

### 7.4 Dashboard Actions

| Action | Result |
|---|---|
| Change geography filter | All cards/charts update |
| Change date range | Trends and tables update |
| Click defaulter cluster | Navigate to `/defaulters?location=...` |
| Click outbreak risk card | Navigate to `/risk-map` |
| Click active alert | Open surveillance detail |

---

## 8. Patient Registry Flow

### 8.1 Purpose

The patient registry is the core digital vaccination registry. It should let health workers and authorized administrators search, register, review, and update patient records.

### 8.2 Patient Registry Page: `/patients`

```text
Patients Page
├── Page Header
│   ├── Title: Patient Registry
│   └── Primary Action: Register Patient
├── Search and Filters
│   ├── Search by UID, name, caregiver phone
│   ├── Filter by status: Up-to-date, Due, Overdue, Defaulter, Zero-dose
│   ├── Filter by location
│   └── Filter by facility
├── Patient Table
│   ├── UID
│   ├── Patient name
│   ├── Age / DOB
│   ├── Caregiver
│   ├── Facility
│   ├── Next due vaccine
│   ├── Status badge
│   └── Row actions
└── Empty State
    └── No patients found / Register new patient
```

### 8.3 Patient Registration Flow: `/patients/new`

Use a multi-step form to reduce errors.

```text
Step 1: Patient Details
├── Full name
├── Date of birth
├── Sex
├── Region / Zone / Woreda / Kebele
├── Facility
└── Medical exception checkbox

Step 2: Caregiver Details
├── Caregiver name
├── Phone number
├── Relationship
└── Preferred language

Step 3: Duplicate Check
├── Show possible matches
├── Continue as new patient
└── Open existing patient

Step 4: Review and Submit
├── Patient summary
├── Caregiver summary
├── Facility summary
└── Submit registration

Step 5: Success
├── Generated UID
├── QR code option
├── View patient profile
└── Record first dose
```

### 8.4 Duplicate Detection UX

When the backend returns possible duplicates, show a blocking review step:

```text
Possible duplicate records found

These records look similar to the patient you are registering. Please check before creating a new record.

[Existing UID] [Name] [DOB] [Caregiver phone] [Facility]

Actions:
- Open existing record
- Continue as new patient
```

### 8.5 Patient Detail Workspace: `/patients/:id`

```text
Patient Detail
├── Patient Header Card
│   ├── Name
│   ├── UID
│   ├── Age / DOB
│   ├── Sex
│   ├── Status badge
│   ├── QR button
│   └── Edit button
├── Caregiver Card
│   ├── Name
│   ├── Phone
│   ├── Relationship
│   └── SMS status
├── Vaccination Timeline
│   ├── Administered doses
│   ├── Due doses
│   ├── Overdue doses
│   └── Exempt doses
├── Medical Exceptions
├── Recent Surveillance Reports
└── Primary Actions
    ├── Record Dose
    ├── Report AEFI / VPD
    └── Send Reminder
```

### 8.6 Patient Status Badges

Use consistent badges across the app:

| Status | Badge Meaning |
|---|---|
| `Up-to-date` | No current vaccine action needed |
| `Due Today` | Vaccine is due today |
| `Due Soon` | Vaccine is due within configured reminder window |
| `Overdue` | Vaccine date has passed |
| `Defaulter` | Overdue beyond threshold, for example more than 7 days |
| `Zero-dose` | No vaccines recorded |
| `Medical Exception` | One or more vaccines are exempt or delayed |

---

## 9. Immunization Flow

### 9.1 Purpose

The immunization module allows health workers to record vaccine doses safely and accurately, including batch ID, route, site, date, and schedule slot.

### 9.2 Immunization Workspace: `/immunizations`

```text
Immunizations Page
├── Today’s Work Queue
│   ├── Patients due today
│   ├── Overdue patients
│   └── Recently recorded doses
├── Search Patient
│   ├── UID search
│   ├── QR scan if supported
│   └── Caregiver phone search
└── Quick Actions
    ├── Record Dose
    ├── Open Patient
    └── View Offline Queue
```

### 9.3 Record Dose Flow: `/immunizations/new`

```text
Select patient
↓
Show patient summary and due vaccines
↓
Select vaccine schedule slot
↓
Enter dose metadata
↓
Validate vaccine batch
↓
Show safety review modal
↓
Submit
↓
Save online or queue offline
↓
Show success and next due date
```

### 9.4 Dose Form Fields

```text
Patient UID
Patient name
Vaccine / dose slot
Administration date
Batch ID
Route
Site
Facility
Health worker name
Notes
```

### 9.5 Batch Expiry Safety

If the selected batch is expired, invalid, or near expiry, the frontend must show a strong warning.

#### Expired Batch Warning

```text
Critical warning
This vaccine batch is expired and must not be used.

Batch: BCG-2024-091
Expiry date: 2024-12-01

Action required: Select another batch.
```

The submit button must be disabled for expired or invalid batches unless the backend explicitly allows a special exception flow.

### 9.6 Pre-flight Confirmation Modal

Before final submission, always show:

```text
Confirm vaccine administration

Patient: [Name] / [UID]
Vaccine: [Vaccine + dose]
Date: [Date]
Batch: [Batch ID]
Route/Site: [Route] / [Site]

This action will update the patient’s official vaccination record.

[Cancel] [Confirm and Record]
```

### 9.7 Offline Behavior

If the browser is offline:

- Allow dose recording if required data is available locally.
- Save the dose to IndexedDB/local queue.
- Mark it as `Pending Sync`.
- Show a persistent banner:

```text
Offline mode active. New records will be saved locally and synced when connection returns.
```

---

## 10. Offline Queue and Sync Flow

### 10.1 Purpose

Offline support is a critical requirement for low-resource settings. Users need a visible place to review pending records and sync problems.

### 10.2 Offline Queue Page: `/offline-queue`

```text
Offline Queue
├── Sync Summary Cards
│   ├── Pending records
│   ├── Failed records
│   ├── Last successful sync
│   └── Current connection status
├── Pending Records Table
│   ├── Type: Patient / Dose / Surveillance
│   ├── Created at
│   ├── Patient UID or temp ID
│   ├── Status
│   └── Action
├── Conflict Review Section
└── Sync Now Button
```

### 10.3 Sync States

| State | Meaning | UI Behavior |
|---|---|---|
| `Local Draft` | Record is not ready to sync | Allow edit/delete |
| `Pending Sync` | Ready for upload | Show pending badge |
| `Syncing` | Upload in progress | Disable duplicate submit |
| `Synced` | Server accepted record | Remove from pending list |
| `Conflict` | Server rejected due to mismatch | Require manual review |
| `Failed` | Network/server issue | Allow retry |

### 10.4 Conflict Review Flow

```text
Open conflict
↓
Show local record vs server record
↓
User chooses action
├── Keep server version
├── Resubmit local version
└── Edit and resubmit
↓
Record sync status updates
```

---

## 11. Patient Self-Service Portal Flow

### 11.1 Purpose

The self-service portal lets patients or caregivers view vaccination status, QR ID, upcoming doses, and overdue alerts without exposing administrative tools.

### 11.2 Self-Service Home: `/self-service`

```text
Self-Service Portal
├── Patient Summary
│   ├── Name
│   ├── UID
│   ├── Age
│   └── Status badge
├── QR Code ID Card
├── Vaccination Timeline
├── Upcoming Doses
└── Alerts
```

### 11.3 QR Code Page

```text
QR ID
├── Patient name
├── UID
├── Large QR code
├── Instructions: Show this at the health facility
└── Optional print/save action
```

### 11.4 Vaccination Timeline

Group timeline by vaccine type:

```text
BCG
├── BCG Birth Dose: Administered on [date]

Penta
├── Penta 1: Administered on [date]
├── Penta 2: Due on [date]
└── Penta 3: Pending

Measles
├── Measles 1: Overdue since [date]
└── Measles 2: Pending
```

### 11.5 Alert Behavior

If overdue:

```text
Overdue vaccination
[Patient Name] missed [Vaccine Name] on [Due Date]. Please visit the nearest health facility.
```

If defaulter:

```text
Defaulter status
This vaccination is delayed beyond the allowed follow-up period. Please contact your health worker immediately.
```

---

## 12. Disease Surveillance Flow

### 12.1 Purpose

The surveillance module captures AEFI and VPD reports and gives public health officers a triage queue for fast response.

### 12.2 Surveillance Page: `/surveillance`

```text
Surveillance
├── Page Header
│   ├── Title: Disease Surveillance
│   └── Primary Action: New Report
├── Filter Bar
│   ├── Type: AEFI / VPD / All
│   ├── Priority: Critical / High / Medium / Low
│   ├── Status: New / Under Review / Confirmed / Closed
│   └── Location
├── Triage Queue
│   ├── Report type
│   ├── Patient
│   ├── Symptoms
│   ├── Location
│   ├── Priority
│   ├── Reported time
│   └── Status
└── Alert Detail Panel or Page
```

### 12.3 New Surveillance Report Flow: `/surveillance/new`

```text
Select patient
↓
Select report type: AEFI or VPD
↓
Enter clinical details
↓
Enter onset date and symptoms
↓
Attach vaccine context if AEFI
↓
System calculates priority
↓
Submit report
↓
Notify public health officers
```

### 12.4 Report Form Fields

```text
Patient
Report type
Condition or suspected disease
Date of onset
Symptoms
Temperature
Severity
Facility
Reporter notes
Related vaccine dose if applicable
```

### 12.5 Triage Visual Priority Rules

| Priority | Visual Treatment |
|---|---|
| Critical | Red border, red badge, top of queue |
| High | Orange border, orange badge |
| Medium | Yellow or neutral warning badge |
| Low | Standard card/table row |

### 12.6 Surveillance Detail Page

```text
Report Detail
├── Report summary
├── Patient information
├── Symptoms and onset
├── Related vaccine dose if available
├── Priority and status
├── Timeline of actions
└── Actions
    ├── Mark under review
    ├── Confirm alert
    ├── Close report
    └── Escalate
```

---

## 13. Outbreak Risk Map and Decision Support Flow

### 13.1 Purpose

The formal requirements include a dedicated risk map for outbreak prediction, high defaulter clusters, meteorological factors, and silent districts. The current frontend already has ML risk score integration in the dashboard, but the flow should expose this as a dedicated public health decision-support workspace.

### 13.2 Recommended Route

```text
/risk-map
```

### 13.3 Risk Map Layout

```text
Risk Map
├── Filter Bar
│   ├── Disease: Measles / Cholera / Polio / All
│   ├── Date range
│   ├── Region / Zone / Woreda
│   └── Risk threshold
├── Map or Map Placeholder
│   ├── High-risk areas
│   ├── Medium-risk areas
│   ├── Low-risk areas
│   └── Silent districts
├── Selected District Panel
│   ├── Risk score
│   ├── Coverage rate
│   ├── Zero-dose count
│   ├── Defaulter rate
│   ├── Rainfall / temperature factors
│   └── Recommended action
└── Table Fallback
    └── Used if map service fails
```

### 13.4 Silent District UX

Silent districts should not look safe. They should look unknown.

```text
Silent District
No recent surveillance data received. Risk cannot be reliably calculated.

Recommended action: Verify reporting status and contact local facility.
```

### 13.5 Risk Score Display

| Risk Score | Label | UI Meaning |
|---|---|---|
| `0.00 - 0.39` | Low | Monitor normally |
| `0.40 - 0.69` | Medium | Review contributing factors |
| `0.70 - 1.00` | High | Prioritize response |
| Missing data | Silent / Unknown | Investigate reporting gap |

### 13.6 Map Fallback

If the map library, tiles, or geospatial service fails, show a table:

```text
High Risk Districts
├── District
├── Region
├── Risk score
├── Main factors
├── Last report date
└── Action
```

---

## 14. Defaulter Tracking and Cluster Flow

### 14.1 Purpose

The dashboard currently has defaulter cluster analytics, but health workers and public health officers need an actionable workflow for follow-up.

### 14.2 Recommended Route

```text
/defaulters
```

### 14.3 Defaulter Page Layout

```text
Defaulter Tracking
├── Summary Cards
│   ├── Total defaulters
│   ├── New this week
│   ├── High-risk clusters
│   └── Physical tracing needed
├── Filter Bar
│   ├── Location
│   ├── Facility
│   ├── Vaccine
│   ├── Days overdue
│   └── Contact status
├── Defaulter Table
│   ├── Patient UID
│   ├── Patient name
│   ├── Caregiver phone
│   ├── Missed vaccine
│   ├── Days overdue
│   ├── Location
│   ├── Last SMS status
│   └── Action
└── Cluster View
```

### 14.4 Defaulter Actions

| Action | Result |
|---|---|
| Open patient | Opens `/patients/:id` |
| Send reminder | Sends or queues SMS follow-up |
| Mark for physical tracing | Adds patient to field follow-up list |
| Export list | Generates CSV/PDF for field teams |

---

## 15. Reporting Engine Flow

### 15.1 Purpose

The reporting engine generates heavy backend PDF/CSV reports and tracks queued jobs.

### 15.2 Reports Page: `/reports`

```text
Reports
├── Generate Report Panel
│   ├── Report type
│   ├── Date range
│   ├── Geography/facility filters
│   ├── Format: PDF / CSV
│   └── Generate button
├── Active Report Jobs
│   ├── Job name
│   ├── Status
│   ├── Created time
│   ├── Progress if available
│   └── Download action
└── Report History
```

### 15.3 Report Types

Recommended report options:

```text
Monthly Immunization Summary
Coverage Report
Defaulter List
Zero-dose Children Report
AEFI Summary
VPD Surveillance Summary
Outbreak Risk Report
Facility Performance Report
DHIS2 Export Summary
FHIR Exchange Audit Report
```

### 15.4 Report Job States

| State | UI Behavior |
|---|---|
| `Queued` | Show clock icon and waiting state |
| `Processing` | Auto-poll every 10 seconds |
| `Completed` | Show download buttons |
| `Failed` | Show error reason and retry button |
| `Expired` | Show disabled download with regenerate option |

### 15.5 Local Storage Persistence

The frontend should persist queued report IDs in local storage so refreshes do not lose report visibility.

Implementation behavior:

```text
On report queued:
- Save job ID to local storage
- Add job to active jobs list
- Start polling every 10 seconds

On page load:
- Read saved job IDs
- Fetch latest status from backend
- Remove invalid or expired jobs if backend confirms they no longer exist
```

---

## 16. Notifications Center Flow

### 16.1 Purpose

The notifications center provides a central inbox for system alerts, outbreak warnings, low stock warnings, report completion, failed syncs, and administrative updates.

### 16.2 Notifications Page: `/notifications`

```text
Notifications
├── Filter Tabs
│   ├── All
│   ├── Unread
│   ├── Critical
│   ├── Reports
│   ├── Surveillance
│   └── Inventory
├── Notification Feed
│   ├── Icon/type
│   ├── Title
│   ├── Message
│   ├── Timestamp
│   ├── Read/unread state
│   └── Related action
└── Bulk Actions
    ├── Mark all as read
    └── Clear read notifications if allowed
```

### 16.3 Notification Types

| Type | Example | Click Behavior |
|---|---|---|
| Outbreak | Critical outbreak risk in Region X | Open `/risk-map` or surveillance detail |
| Stock | Low stock warning | Open vaccine batch/admin inventory page |
| Report | Coverage report completed | Open report job detail |
| Sync | Offline sync conflict | Open `/offline-queue` |
| Patient | Patient became defaulter | Open patient or defaulter list |

---

## 17. Admin Console Flow

### 17.1 Purpose

The admin console controls users, roles, facilities, geography, vaccine definitions, batches, and system settings.

### 17.2 Admin Overview: `/admin`

```text
Admin Console
├── Admin cards
│   ├── Users
│   ├── Roles
│   ├── Facilities
│   ├── Geography
│   ├── Vaccines and EPI Rules
│   ├── Vaccine Batches
│   ├── SMS Settings
│   └── Interoperability
└── Recent Admin Activity
```

### 17.3 User Management: `/admin/users`

```text
User Management
├── Search and filters
│   ├── Name/email/phone
│   ├── Role
│   ├── Facility
│   └── Status
├── User table
│   ├── Name
│   ├── Email/phone
│   ├── Role
│   ├── Facility
│   ├── Status
│   └── Actions
└── Create/Edit User Modal
```

### 17.4 User Form Fields

```text
Full name
Email
Phone
Role
Assigned facility
Assigned geography scope
Status: Active / Inactive
Temporary password option
```

### 17.5 Role Management: `/admin/roles`

```text
Role Management
├── Role list
├── Permission matrix
└── Role detail drawer
```

### 17.6 Facility and Geography Management

Facility and geography should be separated but connected.

```text
/admin/facilities
├── Facility name
├── Facility type
├── Region / Zone / Woreda / Kebele
├── Status
└── Assigned users

/admin/geography
├── Region
├── Zone
├── Woreda
├── Kebele
└── Parent-child hierarchy view
```

### 17.7 Vaccine and EPI Rule Management

The current frontend already includes administrative tools to define vaccines, batches, and EPI rules. These should be moved or linked clearly under Admin.

```text
/admin/vaccines
├── Vaccine list
├── Dose schedule rules
├── Age/due date logic
├── Contraindication rules
└── Active/inactive status

/admin/batches
├── Batch ID
├── Vaccine
├── Quantity if available
├── Expiry date
├── Facility
└── Status: Valid / Near Expiry / Expired
```

### 17.8 Pending UI Polish for Admin

The admin console should add:

- Advanced search
- Filtering by role, facility, geography, and status
- Bulk deactivate users
- Bulk assign facility
- Confirmation modal before destructive actions
- Audit activity view
- Empty states and loading skeletons

---

## 18. System Settings, SMS, DHIS2, and FHIR Flow

### 18.1 Purpose

The requirement document includes SMS gateway configuration, DHIS2 synchronization, and FHIR exchange. These should not be hidden inside unrelated screens.

### 18.2 System Settings Overview: `/settings`

```text
System Settings
├── SMS Gateway
├── EPI Rules
├── DHIS2 Integration
├── FHIR Integration
├── Security and Session Settings
└── Audit Logs
```

### 18.3 SMS Gateway Settings: `/settings/sms`

```text
SMS Settings
├── Provider name
├── API key input
├── Sender ID
├── Default language
├── Reminder message template
├── Missed appointment template
├── Test SMS button
└── Delivery logs
```

### 18.4 DHIS2 Settings

```text
DHIS2 Integration
├── Endpoint URL
├── Authentication method
├── Org unit mapping
├── Data element mapping
├── Last sync status
├── Manual sync button
└── Error logs
```

### 18.5 FHIR Settings

```text
FHIR Integration
├── Base endpoint
├── Auth configuration
├── Resource mapping status
│   ├── Patient
│   ├── Immunization
│   └── Observation
├── Last exchange status
├── Test validation button
└── Audit log
```

### 18.6 Interoperability Job States

| State | Meaning |
|---|---|
| `Ready` | Configuration valid |
| `Mapping` | Internal fields being converted |
| `Validating` | DHIS2/FHIR schema validation running |
| `Syncing` | Data is being transmitted |
| `Completed` | External system accepted data |
| `Partial Failure` | Some records failed validation |
| `Failed` | Sync failed completely |

---

## 19. End-to-End Primary User Flows

## 19.1 Health Worker Daily Flow

```text
Login
↓
Land on Patients or Today queue
↓
Check online/offline status
↓
Search patient by UID, QR, name, or caregiver phone
↓
If not found → register patient
↓
Open patient detail
↓
Review due/overdue vaccines
↓
Record dose
↓
Confirm dose in modal
↓
Save online or queue offline
↓
View next due date
↓
Optionally report AEFI/VPD
```

### Required Pages

- `/login`
- `/patients`
- `/patients/new`
- `/patients/:id`
- `/immunizations/new`
- `/surveillance/new`
- `/offline-queue`

---

## 19.2 Patient Registration Flow

```text
Health Worker opens Patient Registry
↓
Clicks Register Patient
↓
Completes patient details
↓
Completes caregiver details
↓
System checks duplicates
↓
If duplicate exists → open existing record or continue
↓
System generates UID
↓
System creates vaccination schedule
↓
Show success screen
↓
Health Worker records first dose or prints/shows QR ID
```

---

## 19.3 Vaccine Administration Flow

```text
Open patient profile
↓
Click Record Dose
↓
Select due vaccine
↓
Enter batch, route, site, date
↓
System validates batch
↓
If expired → block submission
↓
If valid → show confirmation modal
↓
Submit
↓
If online → save to server
↓
If offline → save to local queue
↓
Update patient schedule
```

---

## 19.4 Public Health Officer Risk Monitoring Flow

```text
Login
↓
Open Dashboard
↓
Review KPI cards and outbreak alerts
↓
Open Risk Map
↓
Filter by disease, date, and geography
↓
Click high-risk district
↓
Review contributing factors
↓
Open surveillance reports for that district
↓
Generate outbreak risk report if needed
```

### Required Pages

- `/`
- `/risk-map`
- `/surveillance`
- `/reports`
- `/notifications`

---

## 19.5 Administrator Management Flow

```text
Login
↓
Open Admin Console
↓
Create or update users
↓
Assign role and facility
↓
Manage vaccine and batch data
↓
Configure SMS / DHIS2 / FHIR settings
↓
Generate reports
↓
Review audit or sync errors
```

### Required Pages

- `/admin`
- `/admin/users`
- `/admin/roles`
- `/admin/facilities`
- `/admin/geography`
- `/admin/vaccines`
- `/admin/batches`
- `/settings`
- `/settings/sms`
- `/settings/interoperability`

---

## 19.6 Caregiver Self-Service Flow

```text
Open self-service portal
↓
View patient summary
↓
Show QR ID at facility
↓
Review vaccination timeline
↓
Check upcoming dose
↓
If overdue or defaulter → view alert and recommended action
```

### Required Pages

- `/self-service`
- `/self-service/qr`
- `/self-service/timeline`
- `/self-service/alerts`

---

## 20. Page-Level Loading, Error, and Empty States

Every main page must handle four states:

```text
Loading
Loaded with data
Loaded with no data
Error
```

### 20.1 Loading State

Use skeleton cards/tables, not blank screens.

### 20.2 Empty State Examples

#### Patients

```text
No patients found
Try adjusting your filters or register a new patient.
```

#### Reports

```text
No reports generated yet
Choose a report type and date range to create your first report.
```

#### Surveillance

```text
No surveillance reports found
There are no reports matching the selected filters.
```

### 20.3 Error State Examples

```text
Could not load data
Please check your connection and try again.

[Retry]
```

For offline mode:

```text
You are offline
Showing locally available data. Some records may be outdated.
```

---

## 21. Form Validation Rules

### 21.1 General Validation

- Required fields must be clearly marked.
- Errors should appear near the field.
- Submit buttons should show loading state.
- Duplicate submissions must be prevented.
- Destructive or clinical actions require confirmation.

### 21.2 Patient Registration Validation

```text
Name: required
DOB: required, cannot be future date
Sex: required
Location: required
Caregiver name: required
Caregiver phone: required, valid phone format
Relationship: required
Facility: required
```

### 21.3 Dose Recording Validation

```text
Patient: required
Vaccine schedule slot: required
Administration date: required, cannot be future date unless explicitly allowed
Batch ID: required
Route: required
Site: required
Expired batch: block submission
```

### 21.4 Surveillance Validation

```text
Patient: required
Report type: required
Condition/symptom: required
Onset date: required
Severity: required
Facility: required
```

---

## 22. Component Inventory for LLM Implementation

The frontend should be built or refactored around reusable components.

### 22.1 Global Components

```text
AppShell
Sidebar
TopHeader
RoleGuard
ProtectedRoute
StatusBadge
MetricCard
PageHeader
FilterBar
SearchInput
ConfirmModal
DataTable
EmptyState
ErrorState
LoadingSkeleton
NotificationBell
OfflineBanner
SyncStatusBadge
```

### 22.2 Patient Components

```text
PatientTable
PatientSearchFilters
PatientRegistrationStepper
DuplicatePatientReview
PatientHeaderCard
CaregiverCard
VaccinationTimeline
MedicalExceptionPanel
PatientQRCodeCard
```

### 22.3 Immunization Components

```text
DoseRecordingForm
DueVaccineSelector
BatchSelector
BatchExpiryWarning
DoseConfirmationModal
DoseSuccessSummary
```

### 22.4 Surveillance Components

```text
SurveillanceReportForm
SurveillanceQueue
PriorityAlertCard
SurveillanceDetailPanel
SymptomsChecklist
```

### 22.5 Analytics Components

```text
CoverageTrendChart
DefaulterClusterTable
RiskScoreCard
RiskMapView
SilentDistrictCard
DistrictRiskDetailPanel
```

### 22.6 Admin Components

```text
UserManagementTable
CreateUserModal
RolePermissionMatrix
FacilityForm
GeographyTree
VaccineRuleEditor
BatchManagementTable
IntegrationStatusCard
```

---

## 23. Frontend Data Models

These are frontend-facing models. Exact backend field names may differ, but the UI should normalize data into these shapes.

### 23.1 User

```ts
type User = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: 'ADMIN' | 'HEALTH_WORKER' | 'PUBLIC_HEALTH_OFFICER' | 'PATIENT';
  facilityId?: string;
  geographyScope?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'LOCKED';
};
```

### 23.2 Patient

```ts
type Patient = {
  id: string;
  uid: string;
  fullName: string;
  dob: string;
  sex: 'MALE' | 'FEMALE' | 'OTHER';
  location: {
    region?: string;
    zone?: string;
    woreda?: string;
    kebele?: string;
  };
  facilityId?: string;
  caregiver?: Caregiver;
  status: 'UP_TO_DATE' | 'DUE_SOON' | 'DUE_TODAY' | 'OVERDUE' | 'DEFAULTER' | 'ZERO_DOSE';
  medicalException?: boolean;
};
```

### 23.3 Caregiver

```ts
type Caregiver = {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  preferredLanguage?: string;
};
```

### 23.4 Vaccination Schedule Item

```ts
type VaccinationScheduleItem = {
  id: string;
  vaccineName: string;
  doseName: string;
  dueDate: string;
  administeredDate?: string;
  status: 'PENDING' | 'DUE_SOON' | 'DUE_TODAY' | 'OVERDUE' | 'DEFAULTER' | 'ADMINISTERED' | 'EXEMPT';
  batchId?: string;
};
```

### 23.5 Dose Record

```ts
type DoseRecord = {
  id: string;
  patientId: string;
  scheduleItemId: string;
  vaccineName: string;
  doseName: string;
  administeredDate: string;
  batchId: string;
  route: string;
  site: string;
  facilityId: string;
  recordedBy: string;
  syncStatus: 'SYNCED' | 'PENDING_SYNC' | 'FAILED' | 'CONFLICT';
};
```

### 23.6 Surveillance Report

```ts
type SurveillanceReport = {
  id: string;
  patientId: string;
  type: 'AEFI' | 'VPD';
  condition: string;
  onsetDate: string;
  symptoms: string[];
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'NEW' | 'UNDER_REVIEW' | 'CONFIRMED' | 'CLOSED';
  facilityId: string;
  createdAt: string;
};
```

### 23.7 Report Job

```ts
type ReportJob = {
  id: string;
  type: string;
  format: 'PDF' | 'CSV';
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'EXPIRED';
  createdAt: string;
  downloadUrl?: string;
  errorMessage?: string;
};
```

---

## 24. Implementation Priority Plan

### Phase 1: Navigation and Role Flow Cleanup

Implement first:

- Role-based sidebar
- Protected route logic
- Role landing pages
- Global header with offline and notification status
- Consistent page headers

### Phase 2: Clinical Workflow Completion

Implement or polish:

- Patient registration stepper
- Duplicate review screen
- Patient detail workspace
- Dose recording confirmation modal
- Expired batch blocking behavior
- Offline queue page

### Phase 3: Public Health Decision Support

Implement or polish:

- Dedicated risk map route
- Silent district UI
- Defaulter tracking page
- Surveillance detail workflow
- District risk detail panel

### Phase 4: Admin and Interoperability Polish

Implement or polish:

- Admin search and filters
- Bulk actions
- Facility/geography management
- SMS gateway settings
- DHIS2 settings
- FHIR settings
- Audit logs

### Phase 5: Reporting and Notification Refinement

Implement or polish:

- Report job detail page
- Retry failed report generation
- Persistent local report job tracking
- Notification filters
- Mark all as read

---

## 25. Section-by-Section Implementation Workflow

The frontend must be implemented one section at a time. Do not attempt to complete multiple product areas in one large change. Each section should be small enough for a user to test in the browser and approve before the next section begins.

### 25.1 Required Loop for Every Section

For each section, follow this loop:

```text
Read this spec section
↓
Review existing frontend code for reusable TailAdmin/layout/components
↓
Check backend support for required API/data/permissions
↓
If backend support is missing, write a backend issue and use a clean temporary placeholder/mock/disabled state
↓
Implement only the current frontend section
↓
Add or update a Playwright demo recording for that section
↓
Run typecheck, lint, and the relevant demo recording
↓
Stop and report changed files, backend issues, demo video path, and browser testing steps
↓
Wait for user review before moving to the next section
```

### 25.2 Section Completion Gate

A section is not considered complete until all of these are true:

- The old UI remains hidden or preserved in a reversible legacy location.
- The new UI uses the TailAdmin visual system or components that match it closely.
- Role access is enforced in navigation and route guards.
- Loading, empty, error, offline, and disabled states are handled where relevant.
- Any missing backend capability is documented as a backend issue instead of hidden behind messy frontend workarounds.
- A Playwright demo video exists for the section and is easy to review.
- The assistant has stopped and explained exactly what changed before starting the next section.

### 25.3 Playwright Demo Recording Policy

Playwright is used for reviewable demo videos, not fast CI tests. Demo tests should be intentionally paced and should show real user behavior.

Requirements:

- Demo specs live in `frontend/web/tests/demo`.
- Demo files use the `*.demo.ts` suffix.
- Generated output must stay ignored by git:
  - `frontend/web/test-results/`
  - `frontend/web/playwright-report/`
  - `frontend/web/playwright/`
- Demo tests should run headlessly and record video every time.
- Demo tests should type text slowly, move the pointer before important clicks, and pause after important state changes.
- Demo tests should cover happy paths and meaningful failure states, such as required-field validation, wrong password, unauthorized navigation, backend errors, empty results, or disabled clinical actions.
- Demo videos should cover all roles affected by the section, not only `ADMIN`.
- Demo tests should be stable enough to rerun, but they do not need to be optimized for CI speed.

Current commands:

```bash
cd technical-implementation/frontend/web
npm run demo
npm run demo:auth
npm run demo:report
```

### 25.4 Playwright Demo Prompt

Use this prompt when asking an LLM or coding agent to add or update Playwright coverage for a frontend section:

```text
Create or update a Playwright demo recording for the current NVOMS frontend section. This is not a fast CI test. It is a headless, reviewable demo video that should move slowly enough for a human to understand.

Use the existing Playwright demo setup in frontend/web/tests/demo. Keep generated videos, reports, and auth state out of git. Record video for every run.

The demo must cover the current section end to end, including role-specific navigation and at least one meaningful failure, empty, disabled, or error state where applicable. If the section is role-sensitive, include every affected role using the seeded test accounts. Type form fields with pressSequentially, move the pointer before important clicks, and pause after page transitions, validation messages, modals, success states, and logout.

After implementation, run typecheck, lint, and the relevant demo command. Report the exact video path, expected behavior in the video, files changed, and any backend issue that blocks full real-data behavior.
```

---

## 26. Gaps Between Current Frontend and Requirement Document

Based on the provided current frontend list, these areas appear implemented or partially implemented but should be made clearer in the professional flow.

| Requirement Area | Current Frontend Status | Recommended Action |
|---|---|---|
| Role-based auth | Implemented | Keep, polish route redirects and forbidden states |
| Patient registry | Implemented | Add structured registration stepper and duplicate review UX |
| Caregiver linking | Implemented | Make caregiver card and SMS status visible in patient detail |
| Vaccine schedule setup | Implemented under patient/admin tools | Move or expose clearly under Admin → Vaccines/EPI Rules |
| Dose recording | Implemented | Keep strict confirmation and expired batch blocking |
| Offline support | Partially visible through header indicator | Add dedicated `/offline-queue` page |
| Self-service | Implemented | Keep simple, caregiver-friendly, QR and timeline focused |
| Surveillance | Implemented | Add detail page, status lifecycle, escalation actions |
| Predictive analytics | Implemented on dashboard | Add dedicated `/risk-map` page for UC-09 and UC-18 |
| Silent districts | Required | Add explicit UI state on risk map |
| Defaulter clusters | Implemented as dashboard table | Add actionable `/defaulters` page |
| Reports | Implemented | Add job detail view and retry/error handling |
| Notifications | Implemented | Add filtering and action-based navigation |
| Admin console | Implemented but pending polish | Add advanced search, filters, bulk actions, audit view |
| DHIS2/FHIR | Required | Add settings and sync status pages if backend exists |
| SMS gateway settings | Required | Add `/settings/sms` for admin configuration |

---

## 27. Final Recommended Frontend Flow Summary

The best professional flow for NVOMS is:

```text
Authentication
↓
Role-specific App Shell
↓
Role-specific landing page
↓
Task-based modules
├── Health Worker: register patient → record dose → queue/sync offline → report issue
├── Public Health Officer: dashboard → risk map → surveillance queue → reports
├── Admin: users → facilities → vaccines/batches → settings → interoperability
└── Patient/Caregiver: QR ID → vaccination timeline → alerts
```

The frontend should feel like a national health operations system, not a collection of unrelated pages. The existing modules are strong, but the professional flow should make the system easier to navigate by separating four major workspaces:

1. **Clinical Operations**  
   Patients, immunizations, offline queue, and surveillance reporting.

2. **Public Health Monitoring**  
   Dashboard, risk map, defaulter clusters, outbreak alerts, and reports.

3. **Administration**  
   Users, roles, facilities, geography, vaccines, batches, SMS, DHIS2, and FHIR.

4. **Patient Self-Service**  
   QR ID, vaccination timeline, upcoming doses, and overdue/defaulter alerts.

---

## 28. LLM Implementation Prompt

Use this prompt when asking an LLM or coding agent to implement the frontend flow:

```text
You are improving the existing NVOMS frontend. Do not rebuild the app from scratch. Refactor and extend the current pages into a professional role-based workflow for a National Vaccination and Outbreak Monitoring System.

Use the existing modules: authentication, dashboard, patients, immunizations, self-service, surveillance, reports, notifications, and admin. Add missing flow polish where needed: role-based sidebar, global header with online/offline and pending sync status, patient registration stepper, duplicate patient review, patient detail workspace, dose confirmation modal, expired batch blocking, offline queue page, risk map page with silent districts, defaulter tracking page, report job detail states, notification filters, admin advanced search/filtering/bulk actions, SMS settings, and DHIS2/FHIR interoperability settings.

Implement the frontend around these workspaces: Clinical Operations for health workers, Public Health Monitoring for public health officers, Administration for admins, and Self-Service for patients/caregivers. Keep routes protected by role, show unauthorized users a clean forbidden or redirect state, and make all pages handle loading, empty, error, offline, and success states. Prioritize simple navigation, clinical safety, low-resource usability, and clear system status.

Work one section at a time. After each section, stop and report exactly what changed, which files were touched, how to test it in the browser, and what result should be visible. If backend support is missing or incomplete, create a clear backend issue with the problem, expected backend behavior, affected frontend section, suggested API/data changes, and testing notes. Continue the frontend with a clean temporary placeholder, disabled state, or mock only where appropriate.

For every completed frontend section, add or update a Playwright demo recording in frontend/web/tests/demo. Playwright is used for demo videos, not fast CI checks. The demo must run headlessly, record video, move slowly enough for review, include relevant role coverage, and include meaningful failure/empty/error states when applicable. Run typecheck, lint, and the relevant demo command before reporting the video path.
```
