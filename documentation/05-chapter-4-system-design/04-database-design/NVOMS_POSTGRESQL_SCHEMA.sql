CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS nvoms;
SET search_path TO nvoms;

CREATE TABLE administrative_units (
    unit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_unit_id UUID REFERENCES administrative_units(unit_id),
    level TEXT NOT NULL CHECK (level IN ('country', 'region', 'zone', 'woreda', 'kebele')),
    code VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    latitude NUMERIC(9, 6),
    longitude NUMERIC(9, 6),
    boundary_geojson JSONB,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE health_facilities (
    facility_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES administrative_units(unit_id),
    facility_code VARCHAR(32) NOT NULL UNIQUE,
    facility_name VARCHAR(160) NOT NULL,
    facility_type TEXT NOT NULL CHECK (facility_type IN ('health_post', 'health_center', 'hospital', 'district_office', 'regional_bureau', 'national_hub')),
    dhis2_org_unit_code VARCHAR(64),
    phone_number VARCHAR(24),
    latitude NUMERIC(9, 6),
    longitude NUMERIC(9, 6),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE roles (
    role_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_code VARCHAR(40) NOT NULL UNIQUE,
    role_name VARCHAR(80) NOT NULL,
    description TEXT
);

CREATE TABLE permissions (
    permission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permission_code VARCHAR(60) NOT NULL UNIQUE,
    permission_name VARCHAR(120) NOT NULL,
    description TEXT
);

CREATE TABLE role_permissions (
    role_id UUID NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(permission_id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(role_id),
    assigned_facility_id UUID REFERENCES health_facilities(facility_id),
    assigned_unit_id UUID REFERENCES administrative_units(unit_id),
    full_name VARCHAR(160) NOT NULL,
    email VARCHAR(160),
    phone_number VARCHAR(24),
    password_hash TEXT NOT NULL,
    must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
    status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive', 'active', 'locked', 'suspended', 'deleted')),
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    preferred_language VARCHAR(12) DEFAULT 'en',
    last_login_at TIMESTAMPTZ,
    created_by_user_id UUID REFERENCES users(user_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    jwt_id VARCHAR(128) NOT NULL UNIQUE,
    client_ip INET,
    user_agent TEXT,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ
);

CREATE TABLE password_reset_tokens (
    password_reset_token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    delivery_channel TEXT NOT NULL CHECK (delivery_channel IN ('email', 'sms')),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
    audit_log_id BIGSERIAL PRIMARY KEY,
    actor_user_id UUID REFERENCES users(user_id),
    subsystem TEXT NOT NULL,
    action_code VARCHAR(80) NOT NULL,
    entity_type VARCHAR(80) NOT NULL,
    entity_id UUID,
    before_state JSONB,
    after_state JSONB,
    source_ip INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE system_settings (
    setting_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_scope TEXT NOT NULL DEFAULT 'global' CHECK (setting_scope IN ('global', 'facility', 'integration')),
    facility_id UUID REFERENCES health_facilities(facility_id),
    setting_key VARCHAR(120) NOT NULL,
    setting_value JSONB NOT NULL,
    is_encrypted BOOLEAN NOT NULL DEFAULT FALSE,
    updated_by_user_id UUID REFERENCES users(user_id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (setting_scope, facility_id, setting_key)
);

CREATE TABLE caregivers (
    caregiver_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(160) NOT NULL,
    phone_number VARCHAR(24) NOT NULL,
    alternate_phone_number VARCHAR(24),
    relationship_to_patient VARCHAR(60) NOT NULL,
    preferred_language VARCHAR(12) DEFAULT 'am',
    residence_unit_id UUID REFERENCES administrative_units(unit_id),
    address_line TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE patients (
    patient_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uid VARCHAR(40) NOT NULL UNIQUE,
    primary_caregiver_id UUID NOT NULL REFERENCES caregivers(caregiver_id),
    residence_unit_id UUID REFERENCES administrative_units(unit_id),
    registered_facility_id UUID REFERENCES health_facilities(facility_id),
    registered_by_user_id UUID REFERENCES users(user_id),
    first_name VARCHAR(80) NOT NULL,
    middle_name VARCHAR(80),
    last_name VARCHAR(80),
    sex TEXT NOT NULL CHECK (sex IN ('male', 'female', 'other', 'unknown')),
    date_of_birth DATE NOT NULL,
    medical_exception_flag BOOLEAN NOT NULL DEFAULT FALSE,
    duplicate_review_status TEXT NOT NULL DEFAULT 'clear' CHECK (duplicate_review_status IN ('clear', 'suspected', 'confirmed_duplicate', 'merged')),
    status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('draft', 'verifying', 'registered', 'merged', 'inactive', 'deceased')),
    qr_code_value VARCHAR(120),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE patient_duplicate_cases (
    duplicate_case_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_patient_id UUID NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    matched_patient_id UUID NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    similarity_score NUMERIC(5, 4) CHECK (similarity_score BETWEEN 0 AND 1),
    review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'dismissed', 'confirmed_duplicate', 'merged')),
    reviewed_by_user_id UUID REFERENCES users(user_id),
    reviewed_at TIMESTAMPTZ,
    notes TEXT
);

CREATE TABLE vaccine_definitions (
    vaccine_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vaccine_code VARCHAR(40) NOT NULL UNIQUE,
    vaccine_name VARCHAR(120) NOT NULL,
    target_disease VARCHAR(80) NOT NULL,
    dose_sequence INTEGER,
    default_route VARCHAR(40),
    default_site VARCHAR(40),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE epi_schedule_versions (
    schedule_version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_name VARCHAR(80) NOT NULL UNIQUE,
    effective_from DATE NOT NULL,
    effective_to DATE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'retired')),
    notes TEXT,
    created_by_user_id UUID REFERENCES users(user_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE epi_schedule_rules (
    schedule_rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_version_id UUID NOT NULL REFERENCES epi_schedule_versions(schedule_version_id) ON DELETE CASCADE,
    vaccine_id UUID NOT NULL REFERENCES vaccine_definitions(vaccine_id),
    dose_label VARCHAR(60) NOT NULL,
    recommended_age_days INTEGER NOT NULL CHECK (recommended_age_days >= 0),
    grace_period_days INTEGER NOT NULL DEFAULT 0 CHECK (grace_period_days >= 0),
    defaulter_threshold_days INTEGER NOT NULL DEFAULT 7 CHECK (defaulter_threshold_days >= 0),
    medical_exception_rule JSONB,
    is_birth_dose BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (schedule_version_id, vaccine_id, dose_label)
);

CREATE TABLE vaccine_batches (
    vaccine_batch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vaccine_id UUID NOT NULL REFERENCES vaccine_definitions(vaccine_id),
    batch_number VARCHAR(80) NOT NULL UNIQUE,
    manufacturer_name VARCHAR(120),
    expiry_date DATE,
    source_system VARCHAR(80),
    is_valid BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE patient_vaccination_schedules (
    patient_schedule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    schedule_rule_id UUID NOT NULL REFERENCES epi_schedule_rules(schedule_rule_id),
    vaccine_id UUID NOT NULL REFERENCES vaccine_definitions(vaccine_id),
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'pending', 'due_soon', 'due_today', 'overdue', 'defaulter', 'administered', 'exempt', 'cancelled')),
    status_reason TEXT,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (patient_id, schedule_rule_id)
);

CREATE TABLE immunization_events (
    immunization_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    patient_schedule_id UUID REFERENCES patient_vaccination_schedules(patient_schedule_id),
    vaccine_id UUID NOT NULL REFERENCES vaccine_definitions(vaccine_id),
    vaccine_batch_id UUID REFERENCES vaccine_batches(vaccine_batch_id),
    administered_by_user_id UUID REFERENCES users(user_id),
    facility_id UUID REFERENCES health_facilities(facility_id),
    administered_at TIMESTAMPTZ NOT NULL,
    administration_route VARCHAR(40),
    administration_site VARCHAR(40),
    event_status TEXT NOT NULL DEFAULT 'administered' CHECK (event_status IN ('administered', 'wasted', 'refused', 'contraindicated')),
    source_channel TEXT NOT NULL DEFAULT 'online' CHECK (source_channel IN ('online', 'offline', 'synced')),
    local_client_record_id VARCHAR(120),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE schedule_status_events (
    status_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_schedule_id UUID NOT NULL REFERENCES patient_vaccination_schedules(patient_schedule_id) ON DELETE CASCADE,
    from_status TEXT,
    to_status TEXT NOT NULL CHECK (to_status IN ('scheduled', 'pending', 'due_soon', 'due_today', 'overdue', 'defaulter', 'administered', 'exempt', 'cancelled')),
    changed_by_user_id UUID REFERENCES users(user_id),
    changed_by_process VARCHAR(80),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reason TEXT
);

CREATE TABLE patient_immunization_status (
    patient_id UUID PRIMARY KEY REFERENCES patients(patient_id) ON DELETE CASCADE,
    next_due_date DATE,
    current_status TEXT NOT NULL DEFAULT 'unknown' CHECK (current_status IN ('up_to_date', 'due_soon', 'overdue', 'defaulter', 'zero_dose', 'unknown')),
    due_count INTEGER NOT NULL DEFAULT 0,
    overdue_count INTEGER NOT NULL DEFAULT 0,
    administered_count INTEGER NOT NULL DEFAULT 0,
    is_zero_dose BOOLEAN NOT NULL DEFAULT TRUE,
    last_evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE surveillance_reports (
    surveillance_report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    facility_id UUID REFERENCES health_facilities(facility_id),
    reported_by_user_id UUID REFERENCES users(user_id),
    surveillance_category TEXT NOT NULL CHECK (surveillance_category IN ('aefi', 'symptom', 'lab_follow_up')),
    condition_type VARCHAR(80) NOT NULL,
    disease_suspected VARCHAR(80),
    onset_date DATE NOT NULL,
    body_temperature_c NUMERIC(4, 1),
    severity TEXT CHECK (severity IN ('low', 'moderate', 'high', 'critical')),
    follow_up_required BOOLEAN NOT NULL DEFAULT TRUE,
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'queued', 'under_follow_up', 'closed')),
    fhir_observation_id VARCHAR(120),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE surveillance_symptoms (
    surveillance_symptom_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    surveillance_report_id UUID NOT NULL REFERENCES surveillance_reports(surveillance_report_id) ON DELETE CASCADE,
    symptom_code VARCHAR(40) NOT NULL,
    symptom_label VARCHAR(120) NOT NULL,
    is_present BOOLEAN NOT NULL DEFAULT TRUE,
    observation_value VARCHAR(120)
);

CREATE TABLE environmental_observations (
    environmental_observation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES administrative_units(unit_id),
    observed_at TIMESTAMPTZ NOT NULL,
    source_name VARCHAR(80) NOT NULL,
    rainfall_mm NUMERIC(8, 2),
    max_temp_c NUMERIC(5, 2),
    min_temp_c NUMERIC(5, 2),
    humidity_pct NUMERIC(5, 2),
    raw_payload JSONB,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (unit_id, observed_at, source_name)
);

CREATE TABLE model_registry (
    model_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name VARCHAR(80) NOT NULL,
    model_version VARCHAR(40) NOT NULL,
    disease_code VARCHAR(40) NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('training', 'active', 'retired')),
    trained_at TIMESTAMPTZ,
    feature_schema JSONB,
    artifact_uri TEXT,
    notes TEXT,
    UNIQUE (model_name, model_version, disease_code)
);

CREATE TABLE prediction_runs (
    prediction_run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID NOT NULL REFERENCES model_registry(model_id),
    triggered_by_user_id UUID REFERENCES users(user_id),
    run_type TEXT NOT NULL CHECK (run_type IN ('scheduled', 'on_demand')),
    source_window_start TIMESTAMPTZ,
    source_window_end TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    error_message TEXT
);

CREATE TABLE prediction_scores (
    prediction_score_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prediction_run_id UUID NOT NULL REFERENCES prediction_runs(prediction_run_id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES administrative_units(unit_id),
    disease_code VARCHAR(40) NOT NULL,
    risk_probability NUMERIC(5, 4) NOT NULL CHECK (risk_probability BETWEEN 0 AND 1),
    risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'unknown')),
    silent_district_flag BOOLEAN NOT NULL DEFAULT FALSE,
    coverage_rate NUMERIC(6, 2),
    dropout_rate NUMERIC(6, 2),
    zero_dose_count INTEGER,
    rainfall_mm NUMERIC(8, 2),
    temperature_c NUMERIC(5, 2),
    contributing_factors JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (prediction_run_id, unit_id, disease_code)
);

CREATE TABLE defaulter_clusters (
    defaulter_cluster_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prediction_run_id UUID REFERENCES prediction_runs(prediction_run_id),
    unit_id UUID NOT NULL REFERENCES administrative_units(unit_id),
    cluster_type TEXT NOT NULL CHECK (cluster_type IN ('defaulter_hotspot', 'zero_dose_hotspot')),
    algorithm_name VARCHAR(40) NOT NULL,
    cluster_label VARCHAR(80),
    defaulter_rate NUMERIC(6, 2),
    affected_patient_count INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE outbreak_alerts (
    outbreak_alert_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES administrative_units(unit_id),
    disease_code VARCHAR(40) NOT NULL,
    prediction_score_id UUID REFERENCES prediction_scores(prediction_score_id),
    surveillance_report_id UUID REFERENCES surveillance_reports(surveillance_report_id),
    alert_source TEXT NOT NULL CHECK (alert_source IN ('prediction', 'surveillance', 'manual')),
    risk_probability NUMERIC(5, 4) CHECK (risk_probability BETWEEN 0 AND 1),
    status TEXT NOT NULL DEFAULT 'potential' CHECK (status IN ('potential', 'under_review', 'confirmed', 'dismissed', 'false_alarm')),
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_by_user_id UUID REFERENCES users(user_id),
    verified_at TIMESTAMPTZ,
    notes TEXT
);

CREATE TABLE message_templates (
    template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_code VARCHAR(60) NOT NULL UNIQUE,
    channel TEXT NOT NULL DEFAULT 'sms' CHECK (channel IN ('sms')),
    message_type TEXT NOT NULL CHECK (message_type IN ('reminder', 'missed_appointment', 'outbreak_warning', 'welcome', 'manual')),
    language_code VARCHAR(12) NOT NULL,
    template_body TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE sms_notifications (
    sms_notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES message_templates(template_id),
    caregiver_id UUID NOT NULL REFERENCES caregivers(caregiver_id),
    patient_id UUID REFERENCES patients(patient_id),
    patient_schedule_id UUID REFERENCES patient_vaccination_schedules(patient_schedule_id),
    outbreak_alert_id UUID REFERENCES outbreak_alerts(outbreak_alert_id),
    notification_type TEXT NOT NULL CHECK (notification_type IN ('reminder', 'missed_appointment', 'outbreak_warning', 'welcome', 'manual')),
    phone_number VARCHAR(24) NOT NULL,
    language_code VARCHAR(12) NOT NULL,
    message_body TEXT NOT NULL,
    priority SMALLINT NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'pending_retry', 'failed', 'cancelled')),
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    gateway_message_id VARCHAR(120),
    scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notification_attempts (
    notification_attempt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sms_notification_id UUID NOT NULL REFERENCES sms_notifications(sms_notification_id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    gateway_status_code VARCHAR(40),
    gateway_response TEXT,
    attempt_status TEXT NOT NULL CHECK (attempt_status IN ('sent', 'delivered', 'failed', 'retrying'))
);

CREATE TABLE report_definitions (
    report_definition_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_code VARCHAR(60) NOT NULL UNIQUE,
    report_name VARCHAR(160) NOT NULL,
    report_scope TEXT NOT NULL CHECK (report_scope IN ('facility', 'woreda', 'region', 'national')),
    definition_spec JSONB,
    default_parameters JSONB,
    description TEXT
);

CREATE TABLE generated_reports (
    generated_report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_definition_id UUID NOT NULL REFERENCES report_definitions(report_definition_id),
    requested_by_user_id UUID REFERENCES users(user_id),
    facility_id UUID REFERENCES health_facilities(facility_id),
    unit_id UUID REFERENCES administrative_units(unit_id),
    output_format TEXT NOT NULL CHECK (output_format IN ('pdf', 'csv')),
    generation_status TEXT NOT NULL DEFAULT 'processing' CHECK (generation_status IN ('processing', 'completed', 'failed')),
    parameter_payload JSONB,
    file_uri TEXT,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE integration_endpoints (
    endpoint_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint_type TEXT NOT NULL CHECK (endpoint_type IN ('sms_gateway', 'weather_api', 'dhis2', 'fhir')),
    endpoint_name VARCHAR(120) NOT NULL,
    base_url TEXT NOT NULL,
    auth_type TEXT NOT NULL CHECK (auth_type IN ('api_key', 'basic_auth', 'oauth2', 'none')),
    configuration JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (endpoint_type, endpoint_name)
);

CREATE TABLE integration_jobs (
    integration_job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint_id UUID NOT NULL REFERENCES integration_endpoints(endpoint_id),
    job_type TEXT NOT NULL CHECK (job_type IN ('weather_ingest', 'sms_dispatch', 'dhis2_push', 'fhir_export')),
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    request_payload JSONB,
    response_summary JSONB,
    error_details TEXT
);

CREATE TABLE dhis2_sync_batches (
    dhis2_sync_batch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_job_id UUID NOT NULL REFERENCES integration_jobs(integration_job_id) ON DELETE CASCADE,
    sync_scope TEXT NOT NULL CHECK (sync_scope IN ('aggregate', 'case_based', 'mixed')),
    records_attempted INTEGER NOT NULL DEFAULT 0,
    records_imported INTEGER NOT NULL DEFAULT 0,
    records_failed INTEGER NOT NULL DEFAULT 0,
    import_summary JSONB,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE dhis2_sync_items (
    dhis2_sync_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dhis2_sync_batch_id UUID NOT NULL REFERENCES dhis2_sync_batches(dhis2_sync_batch_id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('patient', 'immunization', 'observation', 'aggregate_report')),
    entity_id UUID,
    org_unit_code VARCHAR(64),
    sync_status TEXT NOT NULL CHECK (sync_status IN ('sent', 'accepted', 'rejected')),
    error_message TEXT
);

CREATE TABLE fhir_exchange_logs (
    fhir_exchange_log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_job_id UUID REFERENCES integration_jobs(integration_job_id),
    direction TEXT NOT NULL CHECK (direction IN ('export', 'import')),
    resource_type TEXT NOT NULL CHECK (resource_type IN ('Patient', 'Immunization', 'Observation', 'Bundle')),
    internal_entity_type TEXT NOT NULL CHECK (internal_entity_type IN ('patient', 'immunization', 'surveillance_report')),
    internal_entity_id UUID,
    external_resource_id VARCHAR(120),
    exchange_status TEXT NOT NULL CHECK (exchange_status IN ('success', 'mapping_error', 'transmission_error')),
    payload JSONB,
    error_message TEXT,
    exchanged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE device_registrations (
    device_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    device_label VARCHAR(120) NOT NULL,
    platform VARCHAR(40) NOT NULL,
    app_version VARCHAR(40),
    last_seen_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled'))
);

CREATE TABLE sync_batches (
    sync_batch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES device_registrations(device_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'processed', 'conflict', 'rejected')),
    record_count INTEGER NOT NULL DEFAULT 0,
    conflict_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE sync_batch_items (
    sync_batch_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_batch_id UUID NOT NULL REFERENCES sync_batches(sync_batch_id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('patient', 'immunization', 'surveillance_report', 'caregiver')),
    operation_type TEXT NOT NULL CHECK (operation_type IN ('insert', 'update')),
    client_record_id VARCHAR(120) NOT NULL,
    server_record_id UUID,
    item_status TEXT NOT NULL DEFAULT 'pending' CHECK (item_status IN ('pending', 'applied', 'conflict', 'rejected')),
    conflict_reason TEXT,
    payload_checksum VARCHAR(128),
    payload JSONB
);

CREATE INDEX idx_administrative_units_parent ON administrative_units(parent_unit_id);
CREATE INDEX idx_health_facilities_unit ON health_facilities(unit_id);
CREATE UNIQUE INDEX idx_users_email_unique ON users (LOWER(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX idx_users_phone_unique ON users (phone_number) WHERE phone_number IS NOT NULL;
CREATE INDEX idx_users_facility_status ON users(assigned_facility_id, status);
CREATE INDEX idx_password_reset_tokens_user ON password_reset_tokens(user_id, expires_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_logs_subsystem ON audit_logs(subsystem, created_at DESC);
CREATE INDEX idx_caregivers_phone ON caregivers(phone_number);
CREATE INDEX idx_patients_caregiver ON patients(primary_caregiver_id);
CREATE INDEX idx_patients_residence ON patients(residence_unit_id);
CREATE INDEX idx_patients_facility ON patients(registered_facility_id);
CREATE INDEX idx_patient_duplicate_candidate ON patient_duplicate_cases(candidate_patient_id, review_status);
CREATE INDEX idx_schedule_patient_due ON patient_vaccination_schedules(patient_id, due_date);
CREATE INDEX idx_schedule_status_due ON patient_vaccination_schedules(status, due_date);
CREATE INDEX idx_immunization_patient_date ON immunization_events(patient_id, administered_at DESC);
CREATE INDEX idx_immunization_schedule ON immunization_events(patient_schedule_id);
CREATE INDEX idx_schedule_status_events_schedule ON schedule_status_events(patient_schedule_id, changed_at DESC);
CREATE INDEX idx_surveillance_patient_date ON surveillance_reports(patient_id, created_at DESC);
CREATE INDEX idx_surveillance_condition_date ON surveillance_reports(condition_type, created_at DESC);
CREATE INDEX idx_environmental_unit_time ON environmental_observations(unit_id, observed_at DESC);
CREATE INDEX idx_prediction_scores_unit_disease ON prediction_scores(unit_id, disease_code, created_at DESC);
CREATE INDEX idx_prediction_scores_silent ON prediction_scores(silent_district_flag, created_at DESC);
CREATE INDEX idx_outbreak_alerts_unit_status ON outbreak_alerts(unit_id, status, triggered_at DESC);
CREATE INDEX idx_sms_notifications_dispatch ON sms_notifications(status, scheduled_for);
CREATE INDEX idx_sms_notifications_patient ON sms_notifications(patient_id, created_at DESC);
CREATE INDEX idx_notification_attempts_notification ON notification_attempts(sms_notification_id, attempt_number);
CREATE INDEX idx_generated_reports_status ON generated_reports(generation_status, requested_at DESC);
CREATE INDEX idx_integration_jobs_endpoint_status ON integration_jobs(endpoint_id, status, started_at DESC);
CREATE INDEX idx_fhir_exchange_entity ON fhir_exchange_logs(internal_entity_type, internal_entity_id, exchanged_at DESC);
CREATE INDEX idx_sync_batches_device_time ON sync_batches(device_id, submitted_at DESC);
CREATE INDEX idx_sync_batch_items_status ON sync_batch_items(item_status, entity_type);
