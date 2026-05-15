"use client";

import React, { useEffect, useState } from "react";
import {
  Role,
  CreateRolePayload,
  getRoles,
  createRole,
  updateRole,
  deleteRole,
} from "@/services/admin";
import { useAuthSession } from "@/features/auth/useAuthSession";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Badge from "@/components/ui/badge/Badge";
import { ConfirmModal, SkeletonCard, useToast } from "@/shared/workspace-ui";

const emptyForm: CreateRolePayload = {
  role_code: "",
  role_name: "",
  description: "",
};

export default function RolesTab() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [form, setForm] = useState<CreateRolePayload>(emptyForm);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const session = useAuthSession();
  const { addToast } = useToast();

  function loadRoles() {
    if (!session?.tokens.accessToken) return;
    setLoading(true);
    getRoles(session.tokens.accessToken)
      .then(setRoles)
      .catch(() => addToast("Failed to fetch roles", "error"))
      .finally(() => setLoading(false));
  }

  useEffect(loadRoles, [session?.tokens.accessToken, addToast]);

  function openCreate() {
    setEditingRole(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  }

  function openEdit(role: Role) {
    setEditingRole(role);
    setForm({ role_code: role.role_code, role_name: role.role_name, description: role.description });
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.tokens.accessToken) return;
    setIsSubmitting(true);
    try {
      if (editingRole) {
        const updated = await updateRole(editingRole.id, form, session.tokens.accessToken);
        setRoles((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        addToast(`Role "${updated.role_name}" updated.`, "success");
      } else {
        const created = await createRole(form, session.tokens.accessToken);
        setRoles((prev) => [...prev, created]);
        addToast(`Role "${created.role_name}" created.`, "success");
      }
      setIsModalOpen(false);
    } catch {
      addToast("Failed to save role. Check the values and try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (confirmDeleteId === null || !session?.tokens.accessToken) return;
    setIsDeleting(true);
    try {
      await deleteRole(confirmDeleteId, session.tokens.accessToken);
      setRoles((prev) => prev.filter((r) => r.id !== confirmDeleteId));
      addToast("Role deleted.", "success");
    } catch {
      addToast("Could not delete role — it may still be assigned to users.", "error");
    } finally {
      setIsDeleting(false);
      setConfirmDeleteId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Roles</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Create and manage system roles.</p>
        </div>
        <button
          className="inline-flex min-h-10 items-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white shadow-theme-xs transition hover:bg-brand-700"
          onClick={openCreate}
        >
          + Add Role
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <SkeletonCard lines={4} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-theme-xs dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 bg-gray-50 dark:border-white/[0.05] dark:bg-gray-900/60">
                <TableRow>
                  {["Code", "Name", "Description", "Actions"].map((h) => (
                    <TableCell
                      key={h}
                      isHeader
                      className="px-5 py-3 text-start text-theme-xs font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400"
                    >
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {roles.map((role) => (
                  <TableRow key={role.id} className="hover:bg-gray-50/70 dark:hover:bg-white/[0.02]">
                    <TableCell className="px-5 py-4">
                      <Badge size="sm" color="info">{role.role_code}</Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {role.role_name}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {role.description || <span className="italic text-gray-400">—</span>}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex gap-3">
                        <button
                          className="text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
                          onClick={() => openEdit(role)}
                        >
                          Edit
                        </button>
                        <button
                          className="text-sm font-semibold text-error-600 hover:text-error-700 dark:text-error-400"
                          onClick={() => setConfirmDeleteId(role.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {roles.length === 0 && (
                  <TableRow>
                    <TableCell className="px-5 py-8 text-center text-sm text-gray-500" colSpan={4}>
                      No roles found. Add the first role using the button above.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {editingRole ? "Edit Role" : "Add Role"}
            </h3>
            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Role Code <span className="text-error-500">*</span>
                </span>
                <input
                  required
                  className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="e.g. HEALTH_WORKER"
                  value={form.role_code}
                  onChange={(e) => setForm((f) => ({ ...f, role_code: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Role Name <span className="text-error-500">*</span>
                </span>
                <input
                  required
                  className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="e.g. Health Worker"
                  value={form.role_name}
                  onChange={(e) => setForm((f) => ({ ...f, role_name: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</span>
                <textarea
                  className="min-h-20 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="Optional description"
                  value={form.description ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="inline-flex min-h-10 items-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  disabled={isSubmitting}
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex min-h-10 items-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving…" : editingRole ? "Save Changes" : "Create Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      <ConfirmModal
        isOpen={confirmDeleteId !== null}
        title="Delete Role"
        message="Are you sure you want to delete this role? This will fail if users are currently assigned to it."
        confirmLabel="Delete"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
