# Database design


## 1. User Management and Security

This group covers user accounts, permissions, authentication, system settings, and audit history.

<details>
<summary><code>roles</code>: user role list</summary>

| Column | Explanation |
| --- | --- |
| `role_id` | Unique id of the role. |
| `role_code` | Short system code for the role. |
| `role_name` | Display name of the role. |
| `description` | Short description of the role. |

</details>

<details>
<summary><code>permissions</code>: allowed system actions</summary>

| Column | Explanation |
| --- | --- |
| `permission_id` | Unique id of the permission. |
| `permission_code` | Short system code for the permission. |
| `permission_name` | Name of the permission. |
| `description` | Short description of the permission. |

</details>

<details>
<summary><code>role_permissions</code>: role to permission links</summary>

| Column | Explanation |
| --- | --- |
| `role_id` | Role receiving the permission. |
| `permission_id` | Permission granted to the role. |

</details>

<details>
<summary><code>users</code>: user accounts</summary>

| Column | Explanation |
| --- | --- |
| `user_id` | Unique id of the user. |
| `role_id` | Role assigned to the user. |
| `assigned_facility_id` | Facility assigned to the user. |
| `assigned_unit_id` | Administrative area assigned to the user. |
| `full_name` | Full name of the user. |
| `email` | Email address of the user. |
| `phone_number` | Phone number of the user. |
| `password_hash` | Encrypted password value. |
| `must_change_password` | Shows whether password change is required. |
| `status` | Current account status. |
| `failed_login_attempts` | Number of failed login attempts. |
| `locked_until` | Time until the account stays locked. |
| `preferred_language` | User's preferred language. |
| `last_login_at` | Most recent login time. |
| `created_by_user_id` | User who created this account. |
| `created_at` | Date and time the account was created. |
| `updated_at` | Date and time the account was last updated. |

</details>

<details>
<summary><code>user_sessions</code>: login sessions</summary>

| Column | Explanation |
| --- | --- |
| `session_id` | Unique id of the session. |
| `user_id` | User who owns the session. |
| `jwt_id` | Unique id of the issued token. |
| `client_ip` | IP address used for login. |
| `user_agent` | Browser or device information. |
| `issued_at` | Time the session was issued. |
| `expires_at` | Time the session expires. |
| `revoked_at` | Time the session was revoked. |

</details>

<details>
<summary><code>password_reset_tokens</code>: password reset requests</summary>

| Column | Explanation |
| --- | --- |
| `password_reset_token_id` | Unique id of the reset record. |
| `user_id` | User requesting the reset. |
| `token_hash` | Encrypted reset token value. |
| `delivery_channel` | Channel used to send the reset token. |
| `expires_at` | Time when the token expires. |
| `used_at` | Time when the token was used. |
| `requested_at` | Time when the reset was requested. |

</details>

<details>
<summary><code>audit_logs</code>: activity history</summary>

| Column | Explanation |
| --- | --- |
| `audit_log_id` | Unique id of the audit record. |
| `actor_user_id` | User who performed the action. |
| `subsystem` | Part of the system where the action happened. |
| `action_code` | Action performed by the user or system. |
| `entity_type` | Type of record that was affected. |
| `entity_id` | Id of the affected record. |
| `before_state` | Data before the change. |
| `after_state` | Data after the change. |
| `source_ip` | IP address where the action came from. |
| `created_at` | Time the audit record was created. |

</details>

<details>
<summary><code>system_settings</code>: configurable settings</summary>

| Column | Explanation |
| --- | --- |
| `setting_id` | Unique id of the setting. |
| `facility_id` | Facility linked to the setting, if any. |
| `setting_scope` | Scope such as system or facility. |
| `setting_key` | Name of the setting. |
| `setting_value` | Stored value of the setting. |
| `is_encrypted` | Shows whether the value is encrypted. |
| `updated_by_user_id` | User who last updated the setting. |
| `updated_at` | Time the setting was last updated. |

</details>

## 2. Patient and Caregiver Registration

This group covers location setup, facility linkage, caregiver details, patient registration, and duplicate checking.

<details>
<summary><code>administrative_units</code>: administrative hierarchy</summary>

| Column | Explanation |
| --- | --- |
| `unit_id` | Unique id of the administrative unit. |
| `parent_unit_id` | Parent unit above the current unit. |
| `level` | Level such as region, zone, woreda, or kebele. |
| `code` | Unique code used for the unit. |
| `name` | Name of the administrative unit. |
| `latitude` | Latitude of the unit location. |
| `longitude` | Longitude of the unit location. |
| `boundary_geojson` | Map boundary data for the unit. |
| `is_active` | Shows whether the unit is active. |
| `created_at` | Date and time the record was created. |

</details>

<details>
<summary><code>health_facilities</code>: health facility records</summary>

| Column | Explanation |
| --- | --- |
| `facility_id` | Unique id of the facility. |
| `unit_id` | Administrative unit where the facility belongs. |
| `facility_code` | Unique code of the facility. |
| `facility_name` | Name of the health facility. |
| `facility_type` | Type such as post, center, or hospital. |
| `dhis2_org_unit_code` | Matching unit code used in DHIS2. |
| `phone_number` | Contact number of the facility. |
| `latitude` | Latitude of the facility. |
| `longitude` | Longitude of the facility. |
| `is_active` | Shows whether the facility is active. |
| `created_at` | Date and time the record was created. |

</details>

<details>
<summary><code>caregivers</code>: caregiver records</summary>

| Column | Explanation |
| --- | --- |
| `caregiver_id` | Unique id of the caregiver. |
| `full_name` | Full name of the caregiver. |
| `phone_number` | Main phone number of the caregiver. |
| `alternate_phone_number` | Backup phone number of the caregiver. |
| `relationship_to_patient` | Relationship between caregiver and patient. |
| `preferred_language` | Language preferred by the caregiver. |
| `residence_unit_id` | Administrative area where the caregiver lives. |
| `address_line` | Written address details. |
| `status` | Current caregiver status. |
| `created_at` | Time the caregiver was registered. |

</details>

<details>
<summary><code>patients</code>: patient records</summary>

| Column | Explanation |
| --- | --- |
| `patient_id` | Unique id of the patient. |
| `uid` | Unique patient identifier used by the system. |
| `primary_caregiver_id` | Main caregiver linked to the patient. |
| `residence_unit_id` | Administrative area where the patient lives. |
| `registered_facility_id` | Facility where the patient was registered. |
| `registered_by_user_id` | User who registered the patient. |
| `first_name` | Patient first name. |
| `middle_name` | Patient middle name. |
| `last_name` | Patient last name. |
| `sex` | Patient sex. |
| `date_of_birth` | Patient date of birth. |
| `medical_exception_flag` | Shows whether a medical exception exists. |
| `duplicate_review_status` | Current duplicate-check status. |
| `status` | Current patient record status. |
| `qr_code_value` | QR code value linked to the patient. |
| `created_at` | Time the patient record was created. |
| `updated_at` | Time the patient record was last updated. |

</details>

<details>
<summary><code>patient_duplicate_cases</code>: duplicate record review</summary>

| Column | Explanation |
| --- | --- |
| `duplicate_case_id` | Unique id of the duplicate case. |
| `candidate_patient_id` | Patient record being checked. |
| `matched_patient_id` | Existing patient record it matches with. |
| `similarity_score` | Score showing how close the match is. |
| `review_status` | Current review result. |
| `reviewed_by_user_id` | User who reviewed the case. |
| `reviewed_at` | Time the case was reviewed. |
| `notes` | Additional review notes. |

</details>

## 3. Immunization and Surveillance Management

This group covers schedule setup, vaccination events, surveillance records, offline device support, and synchronization.

<details>
<summary><code>device_registrations</code>: registered field devices</summary>

| Column | Explanation |
| --- | --- |
| `device_id` | Unique id of the device. |
| `user_id` | User linked to the device. |
| `device_label` | Name used to identify the device. |
| `platform` | Device platform such as Android or web. |
| `app_version` | Version of the app on the device. |
| `last_seen_at` | Last time the device was active. |
| `status` | Current device status. |

</details>

<details>
<summary><code>vaccine_definitions</code>: vaccine master list</summary>

| Column | Explanation |
| --- | --- |
| `vaccine_id` | Unique id of the vaccine. |
| `vaccine_code` | Unique code of the vaccine. |
| `vaccine_name` | Name of the vaccine. |
| `target_disease` | Disease the vaccine targets. |
| `dose_sequence` | Order of the dose in a series. |
| `default_route` | Default administration route. |
| `default_site` | Default body site for administration. |
| `is_active` | Shows whether the vaccine is active. |

</details>

<details>
<summary><code>epi_schedule_versions</code>: schedule versions</summary>

| Column | Explanation |
| --- | --- |
| `schedule_version_id` | Unique id of the schedule version. |
| `version_name` | Name of the schedule version. |
| `effective_from` | Start date of the version. |
| `effective_to` | End date of the version. |
| `status` | Current status of the version. |
| `notes` | Extra notes about the version. |
| `created_by_user_id` | User who created the version. |
| `created_at` | Time the version was created. |

</details>

<details>
<summary><code>epi_schedule_rules</code>: vaccine schedule rules</summary>

| Column | Explanation |
| --- | --- |
| `schedule_rule_id` | Unique id of the schedule rule. |
| `schedule_version_id` | Schedule version the rule belongs to. |
| `vaccine_id` | Vaccine linked to the rule. |
| `dose_label` | Name of the dose, such as Penta 1. |
| `recommended_age_days` | Recommended age in days for the dose. |
| `grace_period_days` | Allowed extra days before it becomes late. |
| `defaulter_threshold_days` | Days after due date before defaulter status. |
| `medical_exception_rule` | Exception rule stored as JSON. |
| `is_birth_dose` | Shows whether it is a birth dose. |
| `is_active` | Shows whether the rule is active. |

</details>

<details>
<summary><code>vaccine_batches</code>: vaccine batch records</summary>

| Column | Explanation |
| --- | --- |
| `vaccine_batch_id` | Unique id of the batch. |
| `vaccine_id` | Vaccine linked to the batch. |
| `batch_number` | Manufacturer batch number. |
| `manufacturer_name` | Name of the manufacturer. |
| `expiry_date` | Expiry date of the batch. |
| `source_system` | Source where the batch record came from. |
| `is_valid` | Shows whether the batch is valid for use. |
| `created_at` | Time the batch record was created. |

</details>

<details>
<summary><code>patient_vaccination_schedules</code>: patient due dates</summary>

| Column | Explanation |
| --- | --- |
| `patient_schedule_id` | Unique id of the patient schedule record. |
| `patient_id` | Patient linked to the schedule. |
| `schedule_rule_id` | Rule used to create the schedule. |
| `vaccine_id` | Vaccine due for the patient. |
| `due_date` | Planned date for the dose. |
| `status` | Current schedule status. |
| `status_reason` | Reason for the current status. |
| `generated_at` | Time the schedule was generated. |
| `status_changed_at` | Time the status was last changed. |

</details>

<details>
<summary><code>immunization_events</code>: administered vaccines</summary>

| Column | Explanation |
| --- | --- |
| `immunization_event_id` | Unique id of the immunization event. |
| `patient_id` | Patient who received the vaccine. |
| `patient_schedule_id` | Schedule record linked to the event. |
| `vaccine_id` | Vaccine that was given. |
| `vaccine_batch_id` | Batch used during administration. |
| `administered_by_user_id` | User who gave or recorded the vaccine. |
| `facility_id` | Facility where the vaccine was given. |
| `administered_at` | Date and time the vaccine was administered. |
| `administration_route` | Route used for administration. |
| `administration_site` | Body site used for administration. |
| `event_status` | Current status of the event record. |
| `source_channel` | Channel where the record came from. |
| `local_client_record_id` | Offline device record id, if any. |
| `notes` | Extra notes about the event. |
| `created_at` | Time the event record was created. |

</details>

<details>
<summary><code>schedule_status_events</code>: schedule status history</summary>

| Column | Explanation |
| --- | --- |
| `status_event_id` | Unique id of the status event. |
| `patient_schedule_id` | Schedule record being updated. |
| `from_status` | Previous schedule status. |
| `to_status` | New schedule status. |
| `changed_by_user_id` | User who made the change. |
| `changed_by_process` | System process that made the change. |
| `changed_at` | Time the status changed. |
| `reason` | Reason for the status change. |

</details>

<details>
<summary><code>patient_immunization_status</code>: patient vaccination summary</summary>

| Column | Explanation |
| --- | --- |
| `patient_id` | Patient linked to the summary. |
| `next_due_date` | Next vaccine due date. |
| `current_status` | Current overall immunization status. |
| `due_count` | Number of doses currently due. |
| `overdue_count` | Number of overdue doses. |
| `administered_count` | Number of doses already given. |
| `is_zero_dose` | Shows whether the patient received no dose yet. |
| `last_evaluated_at` | Time the summary was last updated. |

</details>

<details>
<summary><code>surveillance_reports</code>: surveillance cases</summary>

| Column | Explanation |
| --- | --- |
| `surveillance_report_id` | Unique id of the surveillance report. |
| `patient_id` | Patient linked to the report. |
| `facility_id` | Facility where the report was recorded. |
| `reported_by_user_id` | User who submitted the report. |
| `surveillance_category` | Category of the surveillance report. |
| `condition_type` | Type of condition being reported. |
| `disease_suspected` | Disease suspected from the case. |
| `onset_date` | Date symptoms started. |
| `body_temperature_c` | Recorded body temperature in Celsius. |
| `severity` | Severity level of the case. |
| `follow_up_required` | Shows whether follow-up is needed. |
| `status` | Current report status. |
| `fhir_observation_id` | Matching FHIR observation id. |
| `notes` | Extra notes about the case. |
| `created_at` | Time the report was created. |

</details>

<details>
<summary><code>surveillance_symptoms</code>: symptom details</summary>

| Column | Explanation |
| --- | --- |
| `surveillance_symptom_id` | Unique id of the symptom record. |
| `surveillance_report_id` | Surveillance report linked to the symptom. |
| `symptom_code` | Short code of the symptom. |
| `symptom_label` | Name of the symptom. |
| `is_present` | Shows whether the symptom is present. |
| `observation_value` | Extra measured or written value. |

</details>

<details>
<summary><code>sync_batches</code>: offline sync batches</summary>

| Column | Explanation |
| --- | --- |
| `sync_batch_id` | Unique id of the sync batch. |
| `device_id` | Device that submitted the batch. |
| `user_id` | User who submitted the batch. |
| `submitted_at` | Time the batch was submitted. |
| `acknowledged_at` | Time the server acknowledged the batch. |
| `status` | Current batch status. |
| `record_count` | Number of records inside the batch. |
| `conflict_count` | Number of conflicting records in the batch. |

</details>

<details>
<summary><code>sync_batch_items</code>: records inside a sync batch</summary>

| Column | Explanation |
| --- | --- |
| `sync_batch_item_id` | Unique id of the sync batch item. |
| `sync_batch_id` | Batch linked to the item. |
| `entity_type` | Type of record in the item. |
| `operation_type` | Action such as create or update. |
| `client_record_id` | Record id used on the client device. |
| `server_record_id` | Matching record id on the server. |
| `item_status` | Current status of the synced item. |
| `conflict_reason` | Reason for a sync conflict. |
| `payload_checksum` | Check value used to verify the payload. |
| `payload` | Data content sent in the sync item. |

</details>

## 4. Notifications and Alerts

This group covers reminder templates, SMS delivery, retry tracking, and alert records.

<details>
<summary><code>message_templates</code>: reusable message templates</summary>

| Column | Explanation |
| --- | --- |
| `template_id` | Unique id of the message template. |
| `template_code` | Unique code of the template. |
| `channel` | Delivery channel such as SMS. |
| `message_type` | Type of message being sent. |
| `language_code` | Language used in the template. |
| `template_body` | Text content of the template. |
| `is_active` | Shows whether the template is active. |

</details>

<details>
<summary><code>sms_notifications</code>: notification records</summary>

| Column | Explanation |
| --- | --- |
| `sms_notification_id` | Unique id of the notification. |
| `template_id` | Template used to build the message. |
| `caregiver_id` | Caregiver receiving the message. |
| `patient_id` | Patient related to the message. |
| `patient_schedule_id` | Schedule linked to the message. |
| `outbreak_alert_id` | Alert linked to the message. |
| `notification_type` | Type of notification being sent. |
| `phone_number` | Phone number used for delivery. |
| `language_code` | Language of the sent message. |
| `message_body` | Final message text sent to the user. |
| `priority` | Priority level of the message. |
| `status` | Current delivery status. |
| `retry_count` | Number of retry attempts made. |
| `last_error` | Most recent error message. |
| `gateway_message_id` | Message id returned by the SMS gateway. |
| `scheduled_for` | Planned send time. |
| `sent_at` | Actual send time. |
| `delivered_at` | Time delivery was confirmed. |
| `created_at` | Time the notification record was created. |

</details>

<details>
<summary><code>notification_attempts</code>: delivery attempts</summary>

| Column | Explanation |
| --- | --- |
| `notification_attempt_id` | Unique id of the attempt. |
| `sms_notification_id` | Notification linked to the attempt. |
| `attempt_number` | Sequence number of the attempt. |
| `attempted_at` | Time the attempt was made. |
| `gateway_status_code` | Status code returned by the gateway. |
| `gateway_response` | Full response from the gateway. |
| `attempt_status` | Result of the attempt. |

</details>

<details>
<summary><code>outbreak_alerts</code>: outbreak warning records</summary>

| Column | Explanation |
| --- | --- |
| `outbreak_alert_id` | Unique id of the alert. |
| `unit_id` | Administrative area linked to the alert. |
| `disease_code` | Disease linked to the alert. |
| `prediction_score_id` | Prediction score that supported the alert. |
| `surveillance_report_id` | Surveillance report linked to the alert. |
| `alert_source` | Source that triggered the alert. |
| `risk_probability` | Risk value at the time of alert. |
| `status` | Current alert status. |
| `triggered_at` | Time the alert was triggered. |
| `verified_by_user_id` | User who verified the alert. |
| `verified_at` | Time the alert was verified. |
| `notes` | Extra notes about the alert. |

</details>

## 5. Predictive Analytics and Decision Support

This group covers environmental data, prediction models, model runs, risk scores, and cluster analysis.

<details>
<summary><code>environmental_observations</code>: weather and environment data</summary>

| Column | Explanation |
| --- | --- |
| `environmental_observation_id` | Unique id of the observation. |
| `unit_id` | Administrative area linked to the observation. |
| `observed_at` | Time the observation applies to. |
| `source_name` | Source of the environmental data. |
| `rainfall_mm` | Rainfall amount in millimeters. |
| `max_temp_c` | Maximum temperature in Celsius. |
| `min_temp_c` | Minimum temperature in Celsius. |
| `humidity_pct` | Humidity percentage. |
| `raw_payload` | Raw source data in JSON format. |
| `ingested_at` | Time the data was loaded into the system. |

</details>

<details>
<summary><code>model_registry</code>: prediction model list</summary>

| Column | Explanation |
| --- | --- |
| `model_id` | Unique id of the model. |
| `model_name` | Name of the model. |
| `model_version` | Version of the model. |
| `disease_code` | Disease the model predicts. |
| `status` | Current model status. |
| `trained_at` | Time the model was trained. |
| `feature_schema` | Features used by the model. |
| `artifact_uri` | Storage location of the model file. |
| `notes` | Extra notes about the model. |

</details>

<details>
<summary><code>prediction_runs</code>: model execution records</summary>

| Column | Explanation |
| --- | --- |
| `prediction_run_id` | Unique id of the prediction run. |
| `model_id` | Model used for the run. |
| `triggered_by_user_id` | User who started the run. |
| `run_type` | Type of prediction run. |
| `source_window_start` | Start of the source data period. |
| `source_window_end` | End of the source data period. |
| `status` | Current run status. |
| `started_at` | Time the run started. |
| `completed_at` | Time the run finished. |
| `error_message` | Error text if the run failed. |

</details>

<details>
<summary><code>prediction_scores</code>: area risk scores</summary>

| Column | Explanation |
| --- | --- |
| `prediction_score_id` | Unique id of the prediction score. |
| `prediction_run_id` | Run that produced the score. |
| `unit_id` | Administrative area being scored. |
| `disease_code` | Disease linked to the score. |
| `risk_probability` | Predicted risk value. |
| `risk_level` | Risk category such as low or high. |
| `silent_district_flag` | Shows whether the area is a silent district. |
| `coverage_rate` | Vaccination coverage used in scoring. |
| `dropout_rate` | Dropout rate used in scoring. |
| `zero_dose_count` | Number of zero-dose children in the area. |
| `rainfall_mm` | Rainfall value used in scoring. |
| `temperature_c` | Temperature value used in scoring. |
| `contributing_factors` | Main factors affecting the score. |
| `created_at` | Time the score record was created. |

</details>

<details>
<summary><code>defaulter_clusters</code>: missed-dose clusters</summary>

| Column | Explanation |
| --- | --- |
| `defaulter_cluster_id` | Unique id of the cluster record. |
| `prediction_run_id` | Prediction run linked to the cluster. |
| `unit_id` | Administrative area of the cluster. |
| `cluster_type` | Type of cluster identified. |
| `algorithm_name` | Algorithm used to create the cluster. |
| `cluster_label` | Label given to the cluster. |
| `defaulter_rate` | Defaulter rate of the cluster. |
| `affected_patient_count` | Number of patients in the cluster. |
| `notes` | Extra notes about the cluster. |
| `created_at` | Time the cluster record was created. |

</details>

## 6. Reporting and Interoperability

This group covers report generation, external system connections, DHIS2 exchange, and HL7 FHIR logging.

<details>
<summary><code>report_definitions</code>: report types</summary>

| Column | Explanation |
| --- | --- |
| `report_definition_id` | Unique id of the report type. |
| `report_code` | Unique code of the report. |
| `report_name` | Name of the report. |
| `report_scope` | Scope such as facility or district. |
| `definition_spec` | Report structure stored as JSON. |
| `default_parameters` | Default input values for the report. |
| `description` | Short description of the report. |

</details>

<details>
<summary><code>generated_reports</code>: generated output records</summary>

| Column | Explanation |
| --- | --- |
| `generated_report_id` | Unique id of the generated report. |
| `report_definition_id` | Report type used to generate it. |
| `requested_by_user_id` | User who requested the report. |
| `facility_id` | Facility linked to the report, if any. |
| `unit_id` | Administrative area linked to the report. |
| `output_format` | Format such as PDF or CSV. |
| `generation_status` | Current generation status. |
| `parameter_payload` | Input parameters used for generation. |
| `file_uri` | Storage location of the report file. |
| `requested_at` | Time the report was requested. |
| `completed_at` | Time the report was completed. |

</details>

<details>
<summary><code>integration_endpoints</code>: external connection setup</summary>

| Column | Explanation |
| --- | --- |
| `endpoint_id` | Unique id of the endpoint. |
| `endpoint_type` | Type of external system. |
| `endpoint_name` | Name of the endpoint. |
| `base_url` | Base address of the external service. |
| `auth_type` | Authentication method used. |
| `configuration` | Connection settings stored as JSON. |
| `is_active` | Shows whether the endpoint is active. |

</details>

<details>
<summary><code>integration_jobs</code>: integration process records</summary>

| Column | Explanation |
| --- | --- |
| `integration_job_id` | Unique id of the integration job. |
| `endpoint_id` | Endpoint used by the job. |
| `job_type` | Type of integration work performed. |
| `status` | Current job status. |
| `started_at` | Time the job started. |
| `completed_at` | Time the job completed. |
| `request_payload` | Request data sent to the external system. |
| `response_summary` | Summary of the received response. |
| `error_details` | Error details if the job failed. |

</details>

<details>
<summary><code>dhis2_sync_batches</code>: DHIS2 sync batches</summary>

| Column | Explanation |
| --- | --- |
| `dhis2_sync_batch_id` | Unique id of the DHIS2 batch. |
| `integration_job_id` | Integration job that created the batch. |
| `sync_scope` | Scope of data included in the batch. |
| `records_attempted` | Number of records sent. |
| `records_imported` | Number of records accepted. |
| `records_failed` | Number of records that failed. |
| `import_summary` | Import result summary in JSON. |
| `started_at` | Time the batch started. |
| `completed_at` | Time the batch completed. |

</details>

<details>
<summary><code>dhis2_sync_items</code>: DHIS2 item results</summary>

| Column | Explanation |
| --- | --- |
| `dhis2_sync_item_id` | Unique id of the sync item. |
| `dhis2_sync_batch_id` | Batch linked to the item. |
| `entity_type` | Type of record being synced. |
| `entity_id` | Internal record id being synced. |
| `org_unit_code` | DHIS2 organization unit code. |
| `sync_status` | Result of syncing the item. |
| `error_message` | Error message for failed items. |

</details>

<details>
<summary><code>fhir_exchange_logs</code>: FHIR exchange history</summary>

| Column | Explanation |
| --- | --- |
| `fhir_exchange_log_id` | Unique id of the FHIR exchange record. |
| `integration_job_id` | Integration job linked to the exchange. |
| `direction` | Direction such as inbound or outbound. |
| `resource_type` | FHIR resource type used. |
| `internal_entity_type` | Internal record type being mapped. |
| `internal_entity_id` | Internal record id being mapped. |
| `external_resource_id` | Id used by the external FHIR system. |
| `exchange_status` | Result of the FHIR exchange. |
| `payload` | FHIR payload stored as JSON. |
| `error_message` | Error message for failed exchange. |
| `exchanged_at` | Time the exchange happened. |

</details>
