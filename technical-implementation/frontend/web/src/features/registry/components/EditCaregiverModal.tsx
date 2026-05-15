"use client";

import React, { useState } from "react";
import { patchCaregiver } from "@/services/patients";
import type { CaregiverBrief } from "@/features/registry/types";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { CloseLineIcon } from "@/icons";

type EditCaregiverModalProps = {
  caregiver: CaregiverBrief;
  token: string;
  onClose: () => void;
  onSuccess: () => void;
};

export function EditCaregiverModal({ caregiver, token, onClose, onSuccess }: EditCaregiverModalProps) {
  const [fullName, setFullName] = useState(caregiver.full_name);
  const [phone, setPhone] = useState(caregiver.phone_number);
  const [relationship, setRelationship] = useState(caregiver.relationship_to_patient);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !relationship.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    if (!/^\+?[0-9]{10,15}$/.test(phone.trim())) {
      setError("Please enter a valid phone number.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await patchCaregiver(token, caregiver.id, {
        full_name: fullName.trim(),
        phone_number: phone.trim(),
        relationship_to_patient: relationship.trim(),
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update caregiver");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-lg dark:border-gray-800 dark:bg-[#08111f]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Caregiver</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <CloseLineIcon className="h-5 w-5 fill-current" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Full Name</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Caregiver full name"
            />
          </div>
          <div>
            <Label>Phone Number</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+251..."
            />
          </div>
          <div>
            <Label>Relationship to Patient</Label>
            <Input
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              placeholder="Mother, Father, Guardian, etc."
            />
          </div>

          {error && (
            <div className="rounded-lg bg-error-50 p-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
            >
              Cancel
            </button>
            <Button disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
