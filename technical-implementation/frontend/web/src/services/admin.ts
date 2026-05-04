import { apiRequest } from "./api";

export interface Role {
  id: number;
  role_code: string;
  role_name: string;
  description: string;
}

export interface Facility {
  id: number;
  facility_code: string;
  facility_name: string;
}

export interface AdminUser {
  id: number;
  full_name: string;
  email: string | null;
  phone_number: string | null;
  role: Role | null;
  assigned_facility: Facility | null;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | string;
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
  role_id: number;
  facility_id?: number | null;
  status?: string;
  preferred_language?: string;
}

export interface UpdateUserPayload {
  full_name?: string;
  email?: string | null;
  phone_number?: string | null;
  facility_id?: number | null;
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

export async function getUser(id: number, token: string): Promise<AdminUser> {
  return apiRequest<AdminUser>(`/users/${id}`, { token });
}

export async function createUser(data: CreateUserPayload, token: string): Promise<AdminUser> {
  return apiRequest<AdminUser>("/users", {
    method: "POST",
    token,
    body: JSON.stringify(data),
  });
}

export async function updateUser(id: number, data: UpdateUserPayload, token: string): Promise<AdminUser> {
  return apiRequest<AdminUser>(`/users/${id}`, {
    method: "PUT",
    token,
    body: JSON.stringify(data),
  });
}

export async function deleteUser(id: number, token: string): Promise<void> {
  return apiRequest<void>(`/users/${id}`, {
    method: "DELETE",
    token,
  });
}

export async function updateUserStatus(id: number, status: string, token: string): Promise<AdminUser> {
  return apiRequest<AdminUser>(`/users/${id}/status`, {
    method: "PUT",
    token,
    body: JSON.stringify({ status }),
  });
}

export async function updateUserRoles(id: number, role_id: number, token: string): Promise<AdminUser> {
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

export async function updateRole(id: number, data: CreateRolePayload, token: string): Promise<Role> {
  return apiRequest<Role>(`/roles/${id}`, {
    method: "PUT",
    token,
    body: JSON.stringify(data),
  });
}

export async function deleteRole(id: number, token: string): Promise<void> {
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

export async function updateFacility(id: number, data: CreateFacilityPayload, token: string): Promise<Facility> {
  return apiRequest<Facility>(`/facilities/${id}`, {
    method: "PUT",
    token,
    body: JSON.stringify(data),
  });
}

export async function deleteFacility(id: number, token: string): Promise<void> {
  return apiRequest<void>(`/facilities/${id}`, {
    method: "DELETE",
    token,
  });
}

// ── Geography endpoints ─────────────────────────────────────────────────────

export interface GeographyNode {
  id: number;
  name: string;
  level: string;
  parent_id: number | null;
}

export async function getGeography(token: string): Promise<GeographyNode[]> {
  return apiRequest<GeographyNode[]>("/geography", { token });
}
