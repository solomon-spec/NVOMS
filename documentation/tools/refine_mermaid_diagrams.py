#!/usr/bin/env python3
from __future__ import annotations

import re
from pathlib import Path


DOC_ROOT = Path(__file__).resolve().parents[1]
MERMAID_DIR = DOC_ROOT / "assets" / "diagrams" / "mermaid"


FLOW_INIT = """%%{init: {
  "theme": "base",
  "themeVariables": {
    "primaryColor": "#eef0ff",
    "primaryBorderColor": "#b8b9ff",
    "primaryTextColor": "#2f3152",
    "secondaryColor": "#fff4b8",
    "tertiaryColor": "#ffffff",
    "lineColor": "#6c708f",
    "fontFamily": "Arial, Helvetica, sans-serif"
  },
  "flowchart": {
    "curve": "linear",
    "nodeSpacing": 28,
    "rankSpacing": 40,
    "htmlLabels": true
  }
}}%%"""

STATE_INIT = """%%{init: {
  "theme": "base",
  "themeVariables": {
    "primaryColor": "#ffffff",
    "primaryBorderColor": "#4e516b",
    "primaryTextColor": "#2f3152",
    "lineColor": "#303248",
    "tertiaryColor": "#eef0ff",
    "fontFamily": "Arial, Helvetica, sans-serif"
  }
}}%%"""

SEQUENCE_INIT = """%%{init: {
  "theme": "base",
  "themeVariables": {
    "actorBkg": "#ffffff",
    "actorBorder": "#a98de6",
    "actorTextColor": "#2f3152",
    "signalColor": "#3f425d",
    "signalTextColor": "#2f3152",
    "labelBoxBkgColor": "#fff4b8",
    "labelBoxBorderColor": "#f1c84c",
    "labelTextColor": "#2f3152",
    "noteBkgColor": "#fffdf1",
    "noteBorderColor": "#d3d7f0",
    "sequenceNumberColor": "#2f3152",
    "fontFamily": "Arial, Helvetica, sans-serif"
  }
}}%%"""

GANTT_INIT = """%%{init: {
  "theme": "base",
  "themeVariables": {
    "fontFamily": "Arial, Helvetica, sans-serif"
  },
  "gantt": {
    "leftPadding": 80,
    "gridLineStartPadding": 36
  }
}}%%"""


CURATED = {
    "figure-3-01-use-case-diagram.mmd": """%%{init: {
  "theme": "base",
  "themeVariables": {
    "primaryColor": "#6da9ff",
    "primaryBorderColor": "#5f8dde",
    "primaryTextColor": "#ffffff",
    "secondaryColor": "#ffffff",
    "tertiaryColor": "#f8fbff",
    "lineColor": "#8a8ea6",
    "fontFamily": "Arial, Helvetica, sans-serif"
  },
  "flowchart": {
    "curve": "linear",
    "nodeSpacing": 26,
    "rankSpacing": 34,
    "htmlLabels": true
  }
}}%%
flowchart LR
    classDef actor fill:#ffffff,stroke:#9da4bb,color:#2f3152,stroke-width:1px
    classDef usecase fill:#6da9ff,stroke:#5f8dde,color:#ffffff,stroke-width:1px
    classDef external fill:#ffffff,stroke:#9da4bb,color:#2f3152,stroke-width:1px
    classDef note fill:#ffffff,stroke:#8c8c8c,color:#2f3152,stroke-width:1px

    admin[Administrator]:::actor
    hw[Health Worker]:::actor
    caregiver[Caregiver]:::actor
    smsGateway[SMS Gateway]:::external
    dhis2[DHIS2]:::external
    official[Public Health Official]:::actor
    fhirNote["All exchanged health data shall conform to HL7 FHIR<br/>for Patient, Immunization, and Observation"]:::note

    subgraph system["System"]
        direction TB
        auth([Authenticate User]):::usecase
        manage([Manage User Accounts]):::usecase
        settings([Configure System Settings]):::usecase
        register([Register Patient]):::usecase
        viewRecord([View Patient<br/>Immunization Record]):::usecase
        recordDose([Record Vaccine<br/>Administration]):::usecase
        epiUpdate([Update Epidemiological<br/>Data]):::usecase
        genSchedule([Generate Vaccination<br/>Schedule]):::usecase
        monitor([Monitor Vaccination<br/>Status]):::usecase
        identify([Identify Defaulter]):::usecase
        reminder([Send Vaccination<br/>Reminder]):::usecase
        missed([Send Missed<br/>Appointment]):::usecase
        receiveReminder([Receive Vaccination<br/>Reminder SMS]):::usecase
        receiveMissed([Receive Missed<br/>Appointment]):::usecase
        analytics([View Analytics<br/>Dashboard]):::usecase
        riskMap([View Outbreak<br/>Risk Map]):::usecase
        reports([Generate/Export<br/>Reports]):::usecase
        predict([Predict Disease<br/>Outbreak]):::usecase
        detect([Detect High<br/>Defaulter]):::usecase
        share([Share Immunization<br/>Data]):::usecase
        exchange([Exchange Health Data<br/>(FHIR-compliant)]):::usecase
    end

    admin --- auth
    admin --- manage
    admin --- settings
    admin --- register
    admin --- viewRecord
    admin --- recordDose
    admin --- epiUpdate
    admin --- analytics
    admin --- riskMap
    admin --- reports

    hw --- auth
    hw --- register
    hw --- viewRecord
    hw --- recordDose
    hw --- epiUpdate
    hw --- monitor
    hw --- analytics

    official --- analytics
    official --- riskMap
    official --- reports

    caregiver --- receiveReminder
    caregiver --- receiveMissed
    smsGateway --- reminder
    smsGateway --- missed
    dhis2 --- share
    dhis2 --- exchange
    fhirNote --- exchange

    register -.->|<<include>>| genSchedule
    monitor -.->|<<include>>| identify
    genSchedule -.->|<<extend>>| reminder
    identify -.->|<<extend>>| missed
    monitor -.->|supports| detect
    predict -.->|feeds| analytics
    predict -.->|feeds| riskMap
""",
    "figure-3-08-state-user-account-lifecycle.mmd": """%%{init: {
  "theme": "base",
  "themeVariables": {
    "primaryColor": "#ffffff",
    "primaryBorderColor": "#41445f",
    "primaryTextColor": "#2f3152",
    "tertiaryColor": "#f4f6ff",
    "lineColor": "#2f3152",
    "fontFamily": "Arial, Helvetica, sans-serif"
  }
}}%%
stateDiagram-v2
    direction TB
    [*] --> Inactive: Admin creates account
    Inactive --> Active: First login / change password
    Active --> Inactive: Logout / timeout
    Active --> Locked: 3 failed login attempts
    Locked --> Inactive: Admin unlocks account
    Active --> Deleted: Account deleted

    state Active {
        [*] --> Idle
        Idle --> Working: User interaction
        Working --> Idle: Task complete
    }
""",
    "figure-3-09-state-patient-registration-flow.mmd": """%%{init: {
  "theme": "base",
  "themeVariables": {
    "primaryColor": "#ffffff",
    "primaryBorderColor": "#41445f",
    "primaryTextColor": "#2f3152",
    "tertiaryColor": "#f4f6ff",
    "lineColor": "#2f3152",
    "fontFamily": "Arial, Helvetica, sans-serif"
  }
}}%%
stateDiagram-v2
    direction TB
    [*] --> Draft: Health worker starts entry
    Draft --> Verifying: Submit data
    Verifying --> DuplicateFound: Match found
    Verifying --> Validated: No match (new patient)
    Validated --> Registered: Save to system
    DuplicateFound --> [*]: Reject and link
    Registered --> [*]
""",
    "figure-3-10-state-vaccination-appointment-lifecycle.mmd": """%%{init: {
  "theme": "base",
  "themeVariables": {
    "primaryColor": "#ffffff",
    "primaryBorderColor": "#41445f",
    "primaryTextColor": "#2f3152",
    "tertiaryColor": "#f4f6ff",
    "lineColor": "#2f3152",
    "fontFamily": "Arial, Helvetica, sans-serif"
  }
}}%%
stateDiagram-v2
    direction TB
    [*] --> Scheduled
    Scheduled --> Due: Date arrived
    Scheduled --> Administered: Early dose
    Due --> Administered: On-time dose
    Due --> Overdue: 24 hours passed
    Overdue --> Defaulter: 7 days passed
    Defaulter --> Administered: Catch-up dose

    state Administered {
        [*] --> StoredLocally
        StoredLocally --> Synced: Internet connected
    }

    Administered --> [*]: Archived
""",
    "figure-3-11-state-sms-notification-flow.mmd": """%%{init: {
  "theme": "base",
  "themeVariables": {
    "primaryColor": "#ffffff",
    "primaryBorderColor": "#41445f",
    "primaryTextColor": "#2f3152",
    "tertiaryColor": "#f4f6ff",
    "lineColor": "#2f3152",
    "fontFamily": "Arial, Helvetica, sans-serif"
  }
}}%%
stateDiagram-v2
    direction TB
    [*] --> Generated: Daily batch job
    Generated --> SentToGateway
    SentToGateway --> Delivered: Success (200 OK)
    SentToGateway --> Retrying: Failure (5xx)
    Retrying --> SentToGateway: Retry (max 3x)
    Retrying --> Failed: Max retries exceeded
    Delivered --> [*]
    Failed --> [*]
""",
    "figure-3-12-state-outbreak-alert-logic.mmd": """%%{init: {
  "theme": "base",
  "themeVariables": {
    "primaryColor": "#ffffff",
    "primaryBorderColor": "#41445f",
    "primaryTextColor": "#2f3152",
    "tertiaryColor": "#f4f6ff",
    "lineColor": "#2f3152",
    "fontFamily": "Arial, Helvetica, sans-serif"
  }
}}%%
stateDiagram-v2
    direction TB
    [*] --> Monitoring
    Monitoring --> Processing: New data received
    state Processing {
        [*] --> RunningModels
        RunningModels --> CalculatingRisk
    }
    Processing --> Normal: Score < threshold
    Processing --> PotentialAlert: Score > threshold
    PotentialAlert --> ConfirmedOutbreak: Verified by official
    PotentialAlert --> FalseAlarm: Dismissed
    Normal --> Monitoring: Return to watch
    ConfirmedOutbreak --> [*]
    FalseAlarm --> [*]
""",
    "figure-3-13-state-data-export-and-interoperability-flow.mmd": """%%{init: {
  "theme": "base",
  "themeVariables": {
    "primaryColor": "#ffffff",
    "primaryBorderColor": "#41445f",
    "primaryTextColor": "#2f3152",
    "tertiaryColor": "#f4f6ff",
    "lineColor": "#2f3152",
    "fontFamily": "Arial, Helvetica, sans-serif"
  }
}}%%
stateDiagram-v2
    direction TB
    [*] --> AssemblingData: Scheduled trigger
    AssemblingData --> MappingFHIR: Convert format
    MappingFHIR --> Validating: Check structure
    Validating --> Sending: Validation result / valid
    Validating --> Error: Invalid schema
    Sending --> Complete: DHIS2 accepts data
    Sending --> Error: Connection failed
    Complete --> [*]
    Error --> [*]
""",
    "figure-3-20-collaboration-diagram.mmd": """%%{init: {
  "theme": "base",
  "themeVariables": {
    "primaryColor": "#79aefc",
    "primaryBorderColor": "#4987dd",
    "primaryTextColor": "#163867",
    "secondaryColor": "#ff79d8",
    "tertiaryColor": "#ffffff",
    "lineColor": "#686d89",
    "fontFamily": "Arial, Helvetica, sans-serif"
  },
  "flowchart": {
    "curve": "linear",
    "nodeSpacing": 34,
    "rankSpacing": 48,
    "htmlLabels": true
  }
}}%%
flowchart LR
    classDef actor fill:#ff8be2,stroke:#c84fb0,color:#4d1d47,stroke-width:1px
    classDef module fill:#7fb2ff,stroke:#4a87de,color:#163867,stroke-width:1px
    classDef service fill:#ff8be2,stroke:#c84fb0,color:#4d1d47,stroke-width:1px
    classDef external fill:#ffffff,stroke:#4a87de,color:#2f3152,stroke-width:1px

    admin{{Administrator}}:::actor
    official[Public Health Official]:::external
    outbreak[Outbreak Prediction & Alert Module]:::service
    epi[Epidemiology & Analytics Module]:::service
    defaulter[Defaulter Monitoring Module]:::service
    notification[Notification Service]:::service
    vaccination[Vaccination Module]:::service

    report[Report Generation Module]:::module
    userMgmt[User Management Module]:::module
    config[System Configuration Module]:::module
    reg[Patient Registration Module]:::module
    worker[Health Worker]:::external
    dhis2[DHIS2]:::external
    fhir[FHIR System]:::external
    sms[SMS Gateway]:::service
    caregiver[Caregiver]:::external

    admin -->|1: create/update/deleteUser(userData)| userMgmt
    admin -->|2: updateSystemSettings(settings)| config
    admin -->|3: generateReport(parameters)| report
    report -->|4: exportReport(format)| admin
    report -->|14: displayReport| official
    report -->|16: generateReport(parameters)| epi

    epi -->|15: getDefaulterData(region)| defaulter
    epi -->|25: updateRiskMap(regionRiskLevel)| outbreak
    outbreak -->|22: sendEpiData(diseaseIndicators)| epi
    outbreak -->|21: sendDefaulterData(childData, region)| defaulter

    defaulter -->|8: scheduleReminderSMS(patientID, caregiverContact)| notification
    defaulter -->|11: sendMissedAppointmentAlert(patientID)| notification
    notification -->|0 / 12 / 20: sendSMS(...)| sms
    sms -->|10: receiveSMS(reminderMessage)| caregiver
    sms -->|13: receiveMissedAppointmentAlert()| caregiver

    vaccination -->|7: addToMonitoring(patientID, schedule)| defaulter
    reg -->|5: registerPatient(patientData)| worker
    vaccination -->|6: generateVaccinationSchedule(patientID)| dhis2
    vaccination -->|18: syncData(patientHealthData)| reg
    vaccination -->|19: exchangeData(patientHealthData)| fhir
    worker -->|23: generateOutbreakAlert(regionRiskLevel)| outbreak
""",
    "figure-4-01-layered-service-oriented-architecture.mmd": """%%{init: {
  "theme": "base",
  "themeVariables": {
    "primaryColor": "#ffffff",
    "primaryBorderColor": "#55576a",
    "primaryTextColor": "#2f3152",
    "secondaryColor": "#f8fbff",
    "tertiaryColor": "#f8fbff",
    "lineColor": "#35384f",
    "fontFamily": "Arial, Helvetica, sans-serif"
  },
  "flowchart": {
    "curve": "linear",
    "nodeSpacing": 36,
    "rankSpacing": 52,
    "htmlLabels": true
  }
}}%%
flowchart TD
    classDef actor fill:#ffffff,stroke:#2f3152,color:#2f3152,stroke-width:1px
    classDef layer fill:#f8fbff,stroke:#44475d,color:#2f3152,stroke-width:1px
    classDef service fill:#ffffff,stroke:#55576a,color:#2f3152,stroke-width:1px
    classDef store fill:#ffffff,stroke:#ef7ff6,color:#8a2379,stroke-width:2px
    classDef bucket fill:#ffffff,stroke:#8ca827,color:#5b6d18,stroke-width:2px

    hp[Health professional]:::actor
    cg[Care givers]:::actor

    subgraph presentation["Presentation layer"]
        direction LR
        web[Web application]:::service
        smsUi[SMS]:::service
    end

    subgraph application["Application layer"]
        direction LR
        userSvc[User Service]:::service
        analyticsSvc[Analytics Service]:::service
        vaccinationSvc[Vaccination Service]:::service
        notificationSvc[Notification Service]:::service
        predictionSvc[Prediction Service]:::service
    end

    subgraph data["Data layer"]
        direction LR
        postgres[(PostgreSQL)]:::store
        fileStore[(File Storage)]:::bucket
    end

    subgraph integration["Integration Layer"]
        direction LR
        dhis2[DHIS2]:::service
        gateway[SMS Gateway]:::service
    end

    hp --> web
    cg --> smsUi
    web --> application
    smsUi --> application
    application --> data
    data --> integration
""",
}


def strip_init(text: str) -> str:
    text = text.lstrip()
    if text.startswith("%%{init:"):
        end = text.find("%%", 2)
        if end != -1:
            text = text[end + 2 :].lstrip()
    return text


def write_text(path: Path, content: str) -> None:
    path.write_text(content.rstrip() + "\n", encoding="utf-8")


def refine_sequence(body: str) -> str:
    body = strip_init(body)
    if not body.startswith("sequenceDiagram"):
        return body
    lines = body.splitlines()
    if len(lines) > 1 and lines[1].strip() != "autonumber":
        lines.insert(1, "    autonumber")
    return SEQUENCE_INIT + "\n" + "\n".join(lines)


def refine_flow(body: str) -> str:
    body = strip_init(body)
    return FLOW_INIT + "\n" + body


def refine_state(body: str) -> str:
    body = strip_init(body)
    return STATE_INIT + "\n" + body


def refine_gantt(body: str) -> str:
    body = strip_init(body)
    return GANTT_INIT + "\n" + body


def main() -> None:
    for path in sorted(MERMAID_DIR.glob("*.mmd")):
        if path.name in CURATED:
            write_text(path, CURATED[path.name])
            continue

        body = path.read_text(encoding="utf-8")
        stripped = strip_init(body)

        if stripped.startswith("sequenceDiagram"):
            write_text(path, refine_sequence(stripped))
        elif stripped.startswith("stateDiagram-v2"):
            write_text(path, refine_state(stripped))
        elif stripped.startswith("gantt"):
            write_text(path, refine_gantt(stripped))
        elif stripped.startswith("flowchart"):
            write_text(path, refine_flow(stripped))


if __name__ == "__main__":
    main()
