"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, FileText, Users, Settings, Trash2, Plus, Pencil } from "lucide-react";

const actionIcons: Record<string, typeof Activity> = {
  "record.created": Plus,
  "record.updated": Pencil,
  "record.deleted": Trash2,
  "field.created": Settings,
  "invite.created": Users,
};

const actionLabels: Record<string, string> = {
  "record.created": "created a record",
  "record.updated": "updated a record",
  "record.deleted": "deleted a record",
  "field.created": "created a field",
  "field.updated": "updated a field",
  "invite.created": "sent an invite",
  "invite.accepted": "accepted an invite",
  "user.updated": "updated a user",
  "tenant.updated": "updated settings",
};

type ActivityItem = {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  entityType: string;
  entityId: string | null;
  entityName: string | null;
  createdAt: string;
};

export default function ActivityPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["activity", page],
    queryFn: async () => {
      const res = await fetch(`/api/audit?page=${page}&pageSize=30`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);
      return json.data as { items: ActivityItem[]; total: number; totalPages: number; page: number };
    },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-white">Activity Log</h1>

      <div className="space-y-1">
        {isLoading ? (
          <div className="py-8 text-center text-gray-500">Loading...</div>
        ) : !data?.items.length ? (
          <div className="py-8 text-center text-gray-500">No activity yet.</div>
        ) : (
          data.items.map((item) => {
            const Icon = actionIcons[item.action] ?? Activity;
            return (
              <div key={item.id} className="flex items-start gap-3 rounded-lg p-3 hover:bg-gray-900">
                <div className="mt-0.5 rounded-md bg-gray-800 p-2">
                  <Icon size={14} className="text-gray-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-300">
                    <span className="font-medium text-white">{item.userName}</span>{" "}
                    {actionLabels[item.action] ?? item.action}
                    {item.entityName && (
                      <span className="text-gray-400"> — {item.entityName}</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className="rounded-full bg-gray-800 px-2 py-0.5 text-[10px] text-gray-500">
                  {item.userRole}
                </span>
              </div>
            );
          })
        )}
      </div>

      {data && data.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-400">Page {data.page} of {data.totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800 disabled:opacity-50">Previous</button>
            <button onClick={() => setPage(page + 1)} disabled={page >= data.totalPages} className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800 disabled:opacity-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
