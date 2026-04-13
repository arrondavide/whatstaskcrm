"use client";

import { ROLE_PERMISSIONS, type PermissionKey } from "@/lib/permissions";
import { Check, X } from "lucide-react";

const permissionLabels: Record<string, string> = {
  "records.view": "View Records",
  "records.create": "Create Records",
  "records.edit": "Edit Records",
  "records.delete": "Delete Records",
  "records.export": "Export Records",
  "records.bulk_delete": "Bulk Delete",
  "fields.view": "View Fields",
  "fields.manage": "Manage Fields",
  "users.view": "View Team",
  "users.invite": "Invite Members",
  "users.manage": "Manage Members",
  "users.remove": "Remove Members",
  "audit.view": "View Audit Log",
  "settings.view": "View Settings",
  "settings.manage": "Manage Settings",
  "pipeline.view": "View Pipeline",
  "pipeline.manage": "Manage Pipeline",
  "chat.view": "View Chat",
  "chat.send": "Send Messages",
  "templates.view": "View Templates",
  "templates.manage": "Manage Templates",
  "billing.view": "View Billing",
  "billing.manage": "Manage Billing",
};

const roles = ["admin", "manager", "employee", "viewer"];

export default function RolesSettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Roles & Permissions</h1>
      <p className="mt-1 text-sm text-gray-400">View the permission matrix for each role</p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-800 bg-gray-900">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Permission</th>
              {roles.map((role) => (
                <th key={role} className="px-4 py-3 text-center font-medium capitalize text-gray-400">
                  {role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {Object.entries(permissionLabels).map(([perm, label]) => (
              <tr key={perm} className="hover:bg-gray-900/50">
                <td className="px-4 py-2.5 text-gray-300">{label}</td>
                {roles.map((role) => {
                  const allowed = ROLE_PERMISSIONS[role]?.[perm as PermissionKey] ?? false;
                  return (
                    <td key={role} className="px-4 py-2.5 text-center">
                      {allowed ? (
                        <Check size={16} className="mx-auto text-green-400" />
                      ) : (
                        <X size={16} className="mx-auto text-gray-700" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
