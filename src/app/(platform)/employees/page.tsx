"use client";

import { useState } from "react";
import { Plus, Mail, Shield, MoreHorizontal, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppUser } from "@/hooks/queries/use-auth";
import toast from "react-hot-toast";
import { Copy } from "lucide-react";

const roleColors: Record<string, string> = {
  admin: "bg-violet-900/30 text-violet-400",
  manager: "bg-blue-900/30 text-blue-400",
  employee: "bg-green-900/30 text-green-400",
  viewer: "bg-gray-800 text-gray-400",
};

export default function EmployeesPage() {
  const { data: appData } = useAppUser();
  const qc = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("employee");

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      return data.data as { id: string; name: string; email: string; role: string; status: string; lastActive: string; avatarUrl: string | null }[];
    },
  });

  const { data: pendingInvites } = useQuery({
    queryKey: ["invites"],
    queryFn: async () => {
      const res = await fetch("/api/invites");
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      return data.data as { id: string; email: string; role: string; status: string; createdAt: string }[];
    },
  });

  const sendInvite = useMutation({
    mutationFn: async (body: { email: string; role: string }) => {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      return data.data;
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["invites"] });
      setShowInvite(false);
      setInviteEmail("");
      // Copy invite link to clipboard
      const inviteLink = `${window.location.origin}/invite/${result.id}`;
      navigator.clipboard.writeText(inviteLink).then(() => {
        toast.success("Invite created! Link copied — share it via WhatsApp or email.");
      }).catch(() => {
        toast.success("Invite created!");
        prompt("Copy this invite link and share it:", inviteLink);
      });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Team</h1>
          <p className="text-sm text-gray-400">{users?.length ?? 0} members</p>
        </div>
        {appData?.user?.permissions?.["users.invite"] && (
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
          >
            <Plus size={16} />
            Invite Member
          </button>
        )}
      </div>

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 p-6">
            <h2 className="text-lg font-bold text-white">Invite Team Member</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300">Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
                >
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="employee">Employee</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowInvite(false)} className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800">Cancel</button>
              <button
                onClick={() => sendInvite.mutate({ email: inviteEmail, role: inviteRole })}
                disabled={!inviteEmail || sendInvite.isPending}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {sendInvite.isPending ? "Sending..." : "Send Invite"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Members list */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="py-8 text-center text-gray-500">Loading...</div>
        ) : (
          users?.map((u) => (
            <div key={u.id} className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 text-sm font-medium text-white">
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-white">{u.name}</p>
                  <p className="text-xs text-gray-400">{u.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {appData?.user?.permissions?.["users.manage"] && u.id !== appData?.user?.id ? (
                  <select
                    value={u.role}
                    onChange={async (e) => {
                      try {
                        const res = await fetch(`/api/users/${u.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ role: e.target.value }),
                        });
                        const data = await res.json();
                        if (!data.success) throw new Error(data.error?.message);
                        qc.invalidateQueries({ queryKey: ["users"] });
                        toast.success(`Role changed to ${e.target.value}`);
                      } catch (err: unknown) {
                        toast.error(err instanceof Error ? err.message : "Failed");
                      }
                    }}
                    className={`rounded-full border-0 px-2.5 py-0.5 text-xs font-medium ${roleColors[u.role] ?? roleColors.viewer} cursor-pointer bg-transparent`}
                  >
                    <option value="admin">admin</option>
                    <option value="manager">manager</option>
                    <option value="employee">employee</option>
                    <option value="viewer">viewer</option>
                  </select>
                ) : (
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${roleColors[u.role] ?? roleColors.viewer}`}>
                    {u.role}
                  </span>
                )}
                <span className={`text-xs ${u.status === "active" ? "text-green-400" : "text-gray-500"}`}>
                  {u.status}
                </span>
                {appData?.user?.permissions?.["users.remove"] && u.id !== appData?.user?.id && (
                  <button
                    onClick={async () => {
                      if (!confirm(`Remove ${u.name} from the workspace?`)) return;
                      try {
                        const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
                        const data = await res.json();
                        if (!data.success) throw new Error(data.error?.message);
                        qc.invalidateQueries({ queryKey: ["users"] });
                        toast.success("User removed");
                      } catch (err: unknown) {
                        toast.error(err instanceof Error ? err.message : "Failed");
                      }
                    }}
                    className="rounded-md p-1 text-gray-500 hover:bg-red-900/30 hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pending invites */}
      {pendingInvites && pendingInvites.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-white">Pending Invites</h2>
          <div className="space-y-2">
            {pendingInvites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900 p-4">
                <div className="flex items-center gap-3">
                  <Mail size={18} className="text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-white">{invite.email}</p>
                    <p className="text-xs text-gray-500">Invited {new Date(invite.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${roleColors[invite.role]}`}>
                    {invite.role}
                  </span>
                  <button
                    onClick={() => {
                      const link = `${window.location.origin}/invite/${invite.id}`;
                      navigator.clipboard.writeText(link).then(() => {
                        toast.success("Invite link copied!");
                      }).catch(() => {
                        prompt("Copy this invite link:", link);
                      });
                    }}
                    className="flex items-center gap-1 rounded-md border border-gray-700 px-2 py-1 text-xs text-gray-400 hover:bg-gray-800 hover:text-white"
                  >
                    <Copy size={12} />
                    Copy Link
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm(`Revoke invite for ${invite.email}?`)) return;
                      try {
                        const res = await fetch("/api/invites", {
                          method: "DELETE",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ id: invite.id }),
                        });
                        const d = await res.json();
                        if (!d.success) throw new Error(d.error?.message);
                        qc.invalidateQueries({ queryKey: ["invites"] });
                        toast.success("Invite revoked");
                      } catch (err: unknown) {
                        toast.error(err instanceof Error ? err.message : "Failed");
                      }
                    }}
                    className="rounded-md p-1 text-gray-500 hover:bg-red-900/30 hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
