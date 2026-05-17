"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";

import { useAuthSession } from "@/features/auth/useAuthSession";
import {
  AdminUser,
  Facility,
  Role,
  createFacility,
  createRole,
  createUser,
  getAuditLogs,
  getFacilities,
  getGeography,
  getRoles,
  getUsers,
  updateUserStatus,
  type AuditLogEntry,
  type GeographyNode,
} from "@/services/admin";
import { ApiError } from "@/services/api";
import { formatRole } from "@/shared/format";
import {
  EmptyState,
  InlineError,
  MetricCard,
  Notice,
  SelectInput,
  SkeletonCard,
  StatusPill,
  TextInput,
  useToast,
} from "@/shared/workspace-ui";

type AdminTab = "users" | "facilities" | "roles" | "geography" | "audit";

const tabs: Array<{ id: AdminTab; label: string }> = [
  { id: "users", label: "Users" },
  { id: "facilities", label: "Facilities" },
  { id: "roles", label: "Roles" },
  { id: "geography", label: "Geography" },
  { id: "audit", label: "Audit" },
];

const emptyUserForm = {
  full_name: "",
  email: "",
  phone_number: "",
  password: "DemoPass123!",
  role_id: "",
  facility_id: "",
  status: "active",
  preferred_language: "en",
};

const emptyFacilityForm = {
  facility_code: "",
  facility_name: "",
};

const emptyRoleForm = {
  role_code: "",
  role_name: "",
  description: "",
};

export function AdminConsoleWorkspace() {
  const session = useAuthSession();
  const token = session?.tokens.accessToken ?? "";
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<AdminTab>("users");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [geography, setGeography] = useState<GeographyNode[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [userForm, setUserForm] = useState(emptyUserForm);
  const [facilityForm, setFacilityForm] = useState(emptyFacilityForm);
  const [roleForm, setRoleForm] = useState(emptyRoleForm);

  useEffect(() => {
    if (!token) return;
    let active = true;

    async function load() {
      setIsLoading(true);
      try {
        const [userRows, roleRows, facilityRows, geoRows, auditResponse] =
          await Promise.all([
            getUsers(token),
            getRoles(token),
            getFacilities(token),
            getGeography(token, { active: true }),
            getAuditLogs(token),
          ]);
        if (!active) return;
        setUsers(userRows);
        setRoles(roleRows);
        setFacilities(facilityRows);
        setGeography(geoRows);
        setAuditLogs(auditResponse.results ?? []);
        setUserForm((current) => ({
          ...current,
          role_id: current.role_id || roleRows[0]?.id || "",
          facility_id: current.facility_id || facilityRows[0]?.id || "",
        }));
        setError("");
      } catch (caught) {
        if (active) setError(readError(caught));
      } finally {
        if (active) setIsLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [token]);

  const filteredUsers = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return users;
    return users.filter((user) =>
      [
        user.full_name,
        user.email ?? "",
        user.phone_number ?? "",
        user.role?.role_name ?? "",
        user.assigned_facility?.facility_name ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(value),
    );
  }, [search, users]);

  const metrics = [
    { label: "Users", value: String(users.length), detail: "Accounts in the system" },
    { label: "Active users", value: String(users.filter((u) => u.status === "active").length) },
    { label: "Facilities", value: String(facilities.length) },
    { label: "Geo units", value: String(geography.length), detail: "Imported active units" },
  ];

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    try {
      const created = await createUser(
        {
          ...userForm,
          email: userForm.email || null,
          phone_number: userForm.phone_number || null,
          facility_id: userForm.facility_id || null,
        },
        token,
      );
      setUsers((current) => [...current, created].sort((a, b) => a.full_name.localeCompare(b.full_name)));
      setUserForm({ ...emptyUserForm, role_id: roles[0]?.id ?? "", facility_id: facilities[0]?.id ?? "" });
      addToast("User created.", "success");
    } catch (caught) {
      addToast(readError(caught), "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateFacility(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    try {
      const created = await createFacility(facilityForm, token);
      setFacilities((current) => [...current, created].sort((a, b) => a.facility_code.localeCompare(b.facility_code)));
      setFacilityForm(emptyFacilityForm);
      addToast("Facility added.", "success");
    } catch (caught) {
      addToast(readError(caught), "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    try {
      const created = await createRole(roleForm, token);
      setRoles((current) => [...current, created].sort((a, b) => a.role_code.localeCompare(b.role_code)));
      setRoleForm(emptyRoleForm);
      addToast("Role added.", "success");
    } catch (caught) {
      addToast(readError(caught), "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatusChange(user: AdminUser, status: string) {
    try {
      const updated = await updateUserStatus(user.id, status, token);
      setUsers((current) => current.map((row) => (row.id === user.id ? updated : row)));
      addToast(`${user.full_name} is now ${formatRole(status)}.`, "success");
    } catch (caught) {
      addToast(readError(caught), "error");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded border border-[var(--nv-border-soft)] bg-[var(--nv-surface)] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-600 dark:text-brand-400">
          Admin Console
        </p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--nv-heading)]">
              Users, facilities, roles, and geography
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--nv-muted)]">
              Manage operational access and verify that the reference data needed by the app is ready.
            </p>
          </div>
          <StatusPill label="Admin only" />
        </div>
      </section>

      {error ? <InlineError message={error} /> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading
          ? [1, 2, 3, 4].map((item) => <SkeletonCard key={item} lines={2} />)
          : metrics.map((metric) => (
              <MetricCard key={metric.label} label={metric.label} value={metric.value} detail={metric.detail} />
            ))}
      </section>

      <section className="rounded border border-[var(--nv-border-soft)] bg-[var(--nv-surface)]">
        <div className="flex flex-wrap gap-2 border-b border-[var(--nv-border-soft)] p-3">
          {tabs.map((tab) => (
            <button
              className={`min-h-10 rounded px-4 text-sm font-semibold ${
                activeTab === tab.id
                  ? "bg-brand-600 text-white"
                  : "bg-[var(--nv-panel)] text-[var(--nv-muted)] hover:text-[var(--nv-heading)]"
              }`}
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === "users" && (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-4">
                <TextInput label="Search users" value={search} placeholder="Name, email, role, facility" onChange={setSearch} />
                <DataTable
                  empty="No users found."
                  headers={["User", "Role", "Facility", "Status"]}
                  rows={filteredUsers.map((user) => [
                    <div key="user">
                      <p className="font-semibold text-[var(--nv-heading)]">{user.full_name}</p>
                      <p className="text-xs text-[var(--nv-muted)]">{user.email || user.phone_number || "No contact"}</p>
                    </div>,
                    user.role?.role_name ?? "No role",
                    user.assigned_facility?.facility_name ?? "No facility",
                    <SelectInput
                      key="status"
                      label="Status"
                      value={user.status}
                      onChange={(value) => handleStatusChange(user, value)}
                      options={[
                        { label: "Active", value: "active" },
                        { label: "Inactive", value: "inactive" },
                        { label: "Suspended", value: "suspended" },
                        { label: "Locked", value: "locked" },
                      ]}
                    />,
                  ])}
                />
              </div>
              <form className="space-y-4 rounded border border-[var(--nv-border-soft)] bg-[var(--nv-panel)] p-4" onSubmit={handleCreateUser}>
                <h2 className="text-base font-semibold text-[var(--nv-heading)]">Add user</h2>
                <TextInput required label="Full name" value={userForm.full_name} onChange={(value) => setUserForm({ ...userForm, full_name: value })} />
                <TextInput label="Email" type="email" value={userForm.email} onChange={(value) => setUserForm({ ...userForm, email: value })} />
                <TextInput label="Phone" value={userForm.phone_number} onChange={(value) => setUserForm({ ...userForm, phone_number: value })} />
                <TextInput required label="Temporary password" value={userForm.password} onChange={(value) => setUserForm({ ...userForm, password: value })} />
                <SelectInput
                  label="Role"
                  value={userForm.role_id}
                  onChange={(value) => setUserForm({ ...userForm, role_id: value })}
                  options={roles.map((role) => ({ label: role.role_name, value: role.id }))}
                />
                <SelectInput
                  label="Facility"
                  value={userForm.facility_id}
                  onChange={(value) => setUserForm({ ...userForm, facility_id: value })}
                  options={[{ label: "No facility", value: "" }, ...facilities.map((facility) => ({ label: facility.facility_name, value: facility.id }))]}
                />
                <button className="min-h-11 w-full rounded bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Create user"}
                </button>
              </form>
            </div>
          )}

          {activeTab === "facilities" && (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <DataTable
                empty="No facilities found."
                headers={["Code", "Facility"]}
                rows={facilities.map((facility) => [facility.facility_code, facility.facility_name])}
              />
              <form className="space-y-4 rounded border border-[var(--nv-border-soft)] bg-[var(--nv-panel)] p-4" onSubmit={handleCreateFacility}>
                <h2 className="text-base font-semibold text-[var(--nv-heading)]">Add facility</h2>
                <TextInput required label="Facility code" value={facilityForm.facility_code} onChange={(value) => setFacilityForm({ ...facilityForm, facility_code: value })} />
                <TextInput required label="Facility name" value={facilityForm.facility_name} onChange={(value) => setFacilityForm({ ...facilityForm, facility_name: value })} />
                <button className="min-h-11 w-full rounded bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Add facility"}
                </button>
              </form>
            </div>
          )}

          {activeTab === "roles" && (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <DataTable
                empty="No roles found."
                headers={["Code", "Name", "Description"]}
                rows={roles.map((role) => [role.role_code, role.role_name, role.description || "Not recorded"])}
              />
              <form className="space-y-4 rounded border border-[var(--nv-border-soft)] bg-[var(--nv-panel)] p-4" onSubmit={handleCreateRole}>
                <h2 className="text-base font-semibold text-[var(--nv-heading)]">Add role</h2>
                <TextInput required label="Role code" value={roleForm.role_code} onChange={(value) => setRoleForm({ ...roleForm, role_code: value })} />
                <TextInput required label="Role name" value={roleForm.role_name} onChange={(value) => setRoleForm({ ...roleForm, role_name: value })} />
                <TextInput label="Description" value={roleForm.description} onChange={(value) => setRoleForm({ ...roleForm, description: value })} />
                <button className="min-h-11 w-full rounded bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Add role"}
                </button>
              </form>
            </div>
          )}

          {activeTab === "geography" && (
            <div className="space-y-4">
              <Notice tone="brand">
                Geography is imported from the HDX boundary dataset and used by patient residence, public health analytics, alerts, reports, and demo data loading.
              </Notice>
              <DataTable
                empty="No geography loaded."
                headers={["Code", "Name", "Level", "Parent"]}
                rows={geography.slice(0, 80).map((unit) => [
                  unit.code,
                  unit.name,
                  formatRole(unit.level),
                  unit.parent?.name ?? "Top level",
                ])}
              />
            </div>
          )}

          {activeTab === "audit" && (
            <DataTable
              empty="No audit logs yet."
              headers={["Action", "Actor", "Entity", "When"]}
              rows={auditLogs.map((log) => [
                formatRole(log.action),
                log.actor_email ?? "System",
                `${log.entity_type} ${log.entity_id}`,
                new Date(log.timestamp).toLocaleString(),
              ])}
            />
          )}
        </div>
      </section>
    </div>
  );
}

function DataTable({
  empty,
  headers,
  rows,
}: {
  empty: string;
  headers: string[];
  rows: Array<Array<ReactNode>>;
}) {
  if (!rows.length) {
    return <EmptyState>{empty}</EmptyState>;
  }

  return (
    <div className="overflow-hidden rounded border border-[var(--nv-border-soft)]">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[var(--nv-border-soft)] text-sm">
          <thead className="bg-[var(--nv-panel)]">
            <tr>
              {headers.map((header) => (
                <th className="px-4 py-3 text-left font-semibold text-[var(--nv-muted)]" key={header}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--nv-border-soft)]">
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="bg-[var(--nv-surface)] align-top">
                {row.map((cell, cellIndex) => (
                  <td className="px-4 py-3 text-[var(--nv-heading)]" key={cellIndex}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function readError(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }
  return "The request could not be completed.";
}
