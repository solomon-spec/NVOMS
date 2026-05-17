import { apiRequest } from "./api";

export interface Role {
  id: string;
  role_code: string;
  role_name: string;
  description: string;
}

export interface Facility {
  id: string;
  facility_code: string;
  facility_name: string;
}

export interface AdminUser {
  id: string;
  full_name: string;
  email: string | null;
  phone_number: string | null;
  role: Role | null;
  assigned_facility: Facility | null;
  status: "active" | "inactive" | "locked" | "suspended" | "deleted" | string;
  must_change_password: boolean;
  preferred_language: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserPayload {
  full_name: string;
  email?: string | null;
  phone_number?: string | null;
  password?: string;
  role_id: string;
  facility_id?: string | null;
  status?: string;
  preferred_language?: string;
}

export interface UpdateUserPayload {
  full_name?: string;
  email?: string | null;
  phone_number?: string | null;
  facility_id?: string | null;
  preferred_language?: string;
}

export interface CreateRolePayload {
  role_code: string;
  role_name: string;
  description?: string;
}

export interface CreateFacilityPayload {
  facility_code: string;
  facility_name: string;
}

// ── User endpoints ──────────────────────────────────────────────────────────

export async function getUsers(token: string): Promise<AdminUser[]> {
  return apiRequest<AdminUser[]>("/users", { token });
}

export async function getUser(id: string, token: string): Promise<AdminUser> {
  return apiRequest<AdminUser>(`/users/${id}`, { token });
}

export async function createUser(data: CreateUserPayload, token: string): Promise<AdminUser> {
  return apiRequest<AdminUser>("/users", {
    method: "POST",
    token,
    body: JSON.stringify(data),
  });
}

export async function updateUser(id: string, data: UpdateUserPayload, token: string): Promise<AdminUser> {
  return apiRequest<AdminUser>(`/users/${id}`, {
    method: "PUT",
    token,
    body: JSON.stringify(data),
  });
}

export async function deleteUser(id: string, token: string): Promise<void> {
  return apiRequest<void>(`/users/${id}`, {
    method: "DELETE",
    token,
  });
}

export async function updateUserStatus(id: string, status: string, token: string): Promise<AdminUser> {
  return apiRequest<AdminUser>(`/users/${id}/status`, {
    method: "PUT",
    token,
    body: JSON.stringify({ status }),
  });
}

export async function updateUserRoles(id: string, role_id: string, token: string): Promise<AdminUser> {
  return apiRequest<AdminUser>(`/users/${id}/roles`, {
    method: "PUT",
    token,
    body: JSON.stringify({ role_id }),
  });
}

// ── Role endpoints ──────────────────────────────────────────────────────────

export async function getRoles(token: string): Promise<Role[]> {
  return apiRequest<Role[]>("/roles", { token });
}

export async function createRole(data: CreateRolePayload, token: string): Promise<Role> {
  return apiRequest<Role>("/roles", {
    method: "POST",
    token,
    body: JSON.stringify(data),
  });
}

export async function updateRole(id: string, data: CreateRolePayload, token: string): Promise<Role> {
  return apiRequest<Role>(`/roles/${id}`, {
    method: "PUT",
    token,
    body: JSON.stringify(data),
  });
}

export async function deleteRole(id: string, token: string): Promise<void> {
  return apiRequest<void>(`/roles/${id}`, {
    method: "DELETE",
    token,
  });
}

// ── Facility endpoints ──────────────────────────────────────────────────────

export async function getFacilities(token: string): Promise<Facility[]> {
  return apiRequest<Facility[]>("/facilities", { token });
}

export async function createFacility(data: CreateFacilityPayload, token: string): Promise<Facility> {
  return apiRequest<Facility>("/facilities", {
    method: "POST",
    token,
    body: JSON.stringify(data),
  });
}

export async function updateFacility(id: string, data: CreateFacilityPayload, token: string): Promise<Facility> {
  return apiRequest<Facility>(`/facilities/${id}`, {
    method: "PUT",
    token,
    body: JSON.stringify(data),
  });
}

export async function deleteFacility(id: string, token: string): Promise<void> {
  return apiRequest<void>(`/facilities/${id}`, {
    method: "DELETE",
    token,
  });
}

// ── Geography endpoints ─────────────────────────────────────────────────────

export interface GeographyNode {
  id: string;
  code: string;
  name: string;
  name_alt: string;
  level: string;
  parent: { id: string; code: string; name: string } | null;
  source: string;
  source_dataset: string;
  area_sqkm: string | null;
  latitude: string | null;
  longitude: string | null;
  bbox: [number, number, number, number] | null;
  boundary_geojson?: Record<string, unknown> | null;
  valid_on: string | null;
  valid_to: string | null;
  data_version: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GeographyFilters {
  search?: string;
  level?: string;
  parent?: string;
  active?: boolean;
  includeGeometry?: boolean;
}

export async function getGeography(token: string, filters: GeographyFilters = {}): Promise<GeographyNode[]> {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.level) params.set("level", filters.level);
  if (filters.parent) params.set("parent", filters.parent);
  if (filters.active !== undefined) params.set("active", String(filters.active));
  if (filters.includeGeometry) params.set("include_geometry", "true");

  const query = params.toString();
  return apiRequest<GeographyNode[]>(`/geography${query ? `?${query}` : ""}`, { token });
}

export interface AuditLogEntry {
  id: string;
  actor_user_id: string | null;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  detail: Record<string, unknown>;
  ip_address: string | null;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export async function getAuditLogs(token: string): Promise<PaginatedResponse<AuditLogEntry>> {
  return apiRequest<PaginatedResponse<AuditLogEntry>>("/audit-logs/", { token });
}
