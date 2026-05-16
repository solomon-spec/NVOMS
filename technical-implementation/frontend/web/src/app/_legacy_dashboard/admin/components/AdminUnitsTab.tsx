"use client";

import React, { useEffect, useState } from "react";
import { GeographyNode, getGeography } from "@/services/admin";
import { useAuthSession } from "@/features/auth/useAuthSession";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Badge from "@/components/ui/badge/Badge";

export default function AdminUnitsTab() {
  const [geography, setGeography] = useState<GeographyNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const session = useAuthSession();

  useEffect(() => {
    const fetchGeography = async () => {
      if (!session?.tokens.accessToken) return;
      try {
        setLoading(true);
        const data = await getGeography(session.tokens.accessToken);
        setGeography(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch administrative units");
      } finally {
        setLoading(false);
      }
    };
    fetchGeography();
  }, [session?.tokens.accessToken]);

  if (loading) return <div className="p-4 text-sm text-gray-500">Loading administrative units...</div>;
  if (error) return <div className="p-4 text-sm text-error-500">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Administrative Units</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">View geography hierarchy.</p>
        </div>
        <button
          className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled
          title="Geography creation is not implemented on the backend"
        >
          Add Unit (Unavailable)
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-theme-xs dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <div className="min-w-[800px]">
            <Table>
              <TableHeader className="border-b border-gray-100 bg-gray-50 dark:border-white/[0.05] dark:bg-gray-900/60">
                <TableRow>
                  <TableCell
                    isHeader
                    className="px-5 py-3 text-start text-theme-xs font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400"
                  >
                    Name
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 text-start text-theme-xs font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400"
                  >
                    Level
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 text-start text-theme-xs font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400"
                  >
                    Actions
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {geography.map((node) => (
                  <TableRow
                    key={node.id}
                    className="hover:bg-gray-50/70 dark:hover:bg-white/[0.02]"
                  >
                    <TableCell className="px-5 py-4 sm:px-6 text-start">
                      <span className="font-medium text-gray-800 dark:text-white/90">
                        {node.name}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-start text-theme-sm text-gray-600 dark:text-gray-400">
                      <Badge size="sm" color="info">
                        {node.level}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-start text-theme-sm text-gray-600 dark:text-gray-400">
                      <button
                        className="text-sm font-medium text-gray-400 disabled:cursor-not-allowed hover:text-gray-500"
                        disabled
                        title="Editing units is not available"
                      >
                        Edit
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
                {geography.length === 0 && (
                  <TableRow>
                    <TableCell className="px-5 py-4 text-center text-theme-sm text-gray-500" colSpan={3}>
                      No administrative units found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
