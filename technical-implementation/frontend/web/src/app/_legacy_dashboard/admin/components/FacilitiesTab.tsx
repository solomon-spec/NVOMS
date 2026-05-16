"use client";

import React, { useEffect, useState } from "react";
import {
  Facility,
  CreateFacilityPayload,
  getFacilities,
  createFacility,
  updateFacility,
  deleteFacility,
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

const emptyForm: CreateFacilityPayload = {
  facility_code: "",
  facility_name: "",
};

export default function FacilitiesTab() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
  const [form, setForm] = useState<CreateFacilityPayload>(emptyForm);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const session = useAuthSession();
  const { addToast } = useToast();

  function loadFacilities() {
    if (!session?.tokens.accessToken) return;
    setLoading(true);
    getFacilities(session.tokens.accessToken)
      .then(setFacilities)
      .catch(() => addToast("Failed to fetch facilities", "error"))
      .finally(() => setLoading(false));
  }

  useEffect(loadFacilities, [session?.tokens.accessToken, addToast]);

  function openCreate() {
    setEditingFacility(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  }

  function openEdit(facility: Facility) {
    setEditingFacility(facility);
    setForm({ facility_code: facility.facility_code, facility_name: facility.facility_name });
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.tokens.accessToken) return;
    setIsSubmitting(true);
    try {
      if (editingFacility) {
        const updated = await updateFacility(editingFacility.id, form, session.tokens.accessToken);
        setFacilities((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
        addToast(`Facility "${updated.facility_name}" updated.`, "success");
      } else {
        const created = await createFacility(form, session.tokens.accessToken);
        setFacilities((prev) => [...prev, created]);
        addToast(`Facility "${created.facility_name}" created.`, "success");
      }
      setIsModalOpen(false);
    } catch {
      addToast("Failed to save facility. Ensure the facility code is unique.", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (confirmDeleteId === null || !session?.tokens.accessToken) return;
    setIsDeleting(true);
    try {
      await deleteFacility(confirmDeleteId, session.tokens.accessToken);
      setFacilities((prev) => prev.filter((f) => f.id !== confirmDeleteId));
      addToast("Facility deleted.", "success");
    } catch {
      addToast("Could not delete facility — it may still be assigned to users.", "error");
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
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Health Facilities</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Create and manage health facilities that users and patients are assigned to.
          </p>
        </div>
        <button
          className="inline-flex min-h-10 items-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white shadow-theme-xs transition hover:bg-brand-700"
          onClick={openCreate}
        >
          + Add Facility
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
                  {["Code", "Name", "Actions"].map((h) => (
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
                {facilities.map((facility) => (
                  <TableRow key={facility.id} className="hover:bg-gray-50/70 dark:hover:bg-white/[0.02]">
                    <TableCell className="px-5 py-4">
                      <Badge size="sm" color="success">{facility.facility_code}</Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {facility.facility_name}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex gap-3">
                        <button
                          className="text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
                          onClick={() => openEdit(facility)}
                        >
                          Edit
                        </button>
                        <button
                          className="text-sm font-semibold text-error-600 hover:text-error-700 dark:text-error-400"
                          onClick={() => setConfirmDeleteId(facility.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {facilities.length === 0 && (
                  <TableRow>
                    <TableCell className="px-5 py-8 text-center text-sm text-gray-500" colSpan={3}>
                      No facilities found. Add the first facility using the button above.
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
              {editingFacility ? "Edit Facility" : "Add Facility"}
            </h3>
            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Facility Code <span className="text-error-500">*</span>
                </span>
                <input
                  required
                  className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="e.g. FAC-001"
                  value={form.facility_code}
                  onChange={(e) => setForm((f) => ({ ...f, facility_code: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Facility Name <span className="text-error-500">*</span>
                </span>
                <input
                  required
                  className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="e.g. Addis Ababa Health Centre"
                  value={form.facility_name}
                  onChange={(e) => setForm((f) => ({ ...f, facility_name: e.target.value }))}
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
                  {isSubmitting ? "Saving…" : editingFacility ? "Save Changes" : "Create Facility"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      <ConfirmModal
        isOpen={confirmDeleteId !== null}
        title="Delete Facility"
        message="Are you sure you want to delete this facility? This action cannot be undone and may fail if users are assigned to it."
        confirmLabel="Delete"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
