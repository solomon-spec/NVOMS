"use client";

import React, { useState, useEffect } from "react";
import { AdminUser, CreateUserPayload, UpdateUserPayload, Role, Facility, createUser, updateUser, getRoles, getFacilities } from "@/services/admin";
import { Modal } from "@/components/ui/modal";
import { useAuthSession } from "@/features/auth/useAuthSession";

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: AdminUser | null;
  onSuccess: () => void;
}

export default function UserFormModal({ isOpen, onClose, user, onSuccess }: UserFormModalProps) {
  const [formData, setFormData] = useState<CreateUserPayload>({
    full_name: "",
    email: "",
    phone_number: "",
    password: "",
    role_id: 0,
    facility_id: 0,
    status: "ACTIVE",
    preferred_language: "en",
  });
  const [roles, setRoles] = useState<Role[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const session = useAuthSession();

  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        if (!session?.tokens.accessToken) return;
        try {
          const [rolesData, facilitiesData] = await Promise.all([
            getRoles(session.tokens.accessToken),
            getFacilities(session.tokens.accessToken),
          ]);
          setRoles(rolesData);
          setFacilities(facilitiesData);
          if (user) {
            setFormData({
              full_name: user.full_name,
              email: user.email || "",
              phone_number: user.phone_number || "",
              role_id: user.role?.id || (rolesData.length > 0 ? rolesData[0].id : 0),
              facility_id: user.assigned_facility?.id || 0,
              status: user.status,
              preferred_language: user.preferred_language,
            });
          } else {
            setFormData({
              full_name: "",
              email: "",
              phone_number: "",
              password: "",
              role_id: rolesData.length > 0 ? rolesData[0].id : 0,
              facility_id: 0,
              status: "ACTIVE",
              preferred_language: "en",
            });
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to load form data");
        }
      };
      fetchData();
    }
  }, [isOpen, user, session?.tokens.accessToken]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "role_id" || name === "facility_id" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!session?.tokens.accessToken) throw new Error("No access token");

      const payload = { ...formData };
      if (!payload.email) payload.email = null;
      if (!payload.phone_number) payload.phone_number = null;
      if (payload.facility_id === 0) payload.facility_id = null;

      if (user) {
        // Update user
        const updatePayload: UpdateUserPayload = {
          full_name: payload.full_name,
          email: payload.email,
          phone_number: payload.phone_number,
          facility_id: payload.facility_id,
          preferred_language: payload.preferred_language,
        };
        await updateUser(user.id, updatePayload, session.tokens.accessToken);
      } else {
        // Create user
        if (!payload.password) throw new Error("Password is required for new user");
        await createUser(payload, session.tokens.accessToken);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[600px] p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        {user ? "Edit User" : "Create New User"}
      </h2>
      {error && <div className="mb-4 text-sm text-error-500">{error}</div>}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
          <input
            type="text"
            name="full_name"
            value={formData.full_name}
            onChange={handleChange}
            required
            className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:text-white dark:focus:border-brand-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email || ""}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:text-white dark:focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
            <input
              type="text"
              name="phone_number"
              value={formData.phone_number || ""}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:text-white dark:focus:border-brand-500"
            />
          </div>
        </div>

        {!user && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={8}
              className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:text-white dark:focus:border-brand-500"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
            <select
              name="role_id"
              value={formData.role_id}
              onChange={handleChange}
              required={!user}
              disabled={!!user} // Role is updated via a separate endpoint/action
              className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:text-white dark:focus:border-brand-500"
            >
              <option value={0} disabled>Select Role</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>{role.role_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Facility (Optional)</label>
            <select
              name="facility_id"
              value={formData.facility_id ?? 0}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:text-white dark:focus:border-brand-500"
            >
              <option value={0}>None</option>
              {facilities.map(fac => (
                <option key={fac.id} value={fac.id}>{fac.facility_name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
