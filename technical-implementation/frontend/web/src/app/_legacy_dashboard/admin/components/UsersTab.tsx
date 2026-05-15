"use client";

import React, { useEffect, useState } from "react";
import { AdminUser, getUsers, updateUserStatus } from "@/services/admin";
import { useAuthSession } from "@/features/auth/useAuthSession";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Badge from "@/components/ui/badge/Badge";
import UserFormModal from "./UserFormModal";

export default function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  
  const session = useAuthSession();

  const fetchUsers = React.useCallback(async () => {
    if (!session?.tokens.accessToken) return;
    try {
      setLoading(true);
      const data = await getUsers(session.tokens.accessToken);
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, [session?.tokens.accessToken]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreate = () => {
    setSelectedUser(null);
    setIsModalOpen(true);
  };

  const handleEdit = (user: AdminUser) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (user: AdminUser) => {
    if (!session?.tokens.accessToken) return;
    const newStatus = user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await updateUserStatus(user.id, newStatus, session.tokens.accessToken);
      fetchUsers(); // Refresh
    } catch (err) {
      alert("Failed to update user status: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  if (loading) return <div className="p-4 text-sm text-gray-500">Loading users...</div>;
  if (error) return <div className="p-4 text-sm text-error-500">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Users</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage system users.</p>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600"
        >
          Add User
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-theme-xs dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <div className="min-w-[1000px]">
            <Table>
              <TableHeader className="border-b border-gray-100 bg-gray-50 dark:border-white/[0.05] dark:bg-gray-900/60">
                <TableRow>
                  <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400">Name</TableCell>
                  <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400">Contact</TableCell>
                  <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400">Role</TableCell>
                  <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400">Facility</TableCell>
                  <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400">Status</TableCell>
                  <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400">Actions</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {users.map((user) => (
                  <TableRow key={user.id} className="hover:bg-gray-50/70 dark:hover:bg-white/[0.02]">
                    <TableCell className="px-5 py-4 text-start">
                      <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                        {user.full_name}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-start text-theme-sm text-gray-600 dark:text-gray-400">
                      <div>{user.email || "—"}</div>
                      <div className="text-xs text-gray-500">{user.phone_number || "—"}</div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-start text-theme-sm text-gray-600 dark:text-gray-400">
                      <Badge size="sm" color="info">
                        {user.role?.role_name || "None"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-start text-theme-sm text-gray-600 dark:text-gray-400">
                      {user.assigned_facility?.facility_name || "—"}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-start">
                      <Badge
                        size="sm"
                        color={user.status === "ACTIVE" ? "success" : user.status === "INACTIVE" ? "warning" : "error"}
                      >
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-start">
                      <div className="flex gap-3 items-center">
                        <button
                          onClick={() => handleEdit(user)}
                          className="text-sm font-medium text-brand-500 hover:text-brand-600"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleStatus(user)}
                          className="text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                        >
                          {user.status === "ACTIVE" ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell className="px-5 py-4 text-center text-theme-sm text-gray-500" colSpan={6}>
                      No users found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <UserFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          user={selectedUser}
          onSuccess={fetchUsers}
        />
      )}
    </div>
  );
}
