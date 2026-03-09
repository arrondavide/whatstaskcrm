"use client";

import { useState } from "react";
import { Shell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Plus,
  MoreHorizontal,
  Users,
  Mail,
  Shield,
  Trash2,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import { auth } from "@/lib/firebase/client";
import type { User, UserRole } from "@/types/user";

const roleColors: Record<UserRole, "default" | "secondary" | "outline" | "warning"> = {
  admin: "default",
  manager: "warning",
  employee: "secondary",
  viewer: "outline",
};

export default function EmployeesPage() {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("employee");
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");

  // TODO: Fetch employees from Firestore with real-time listener
  const employees: User[] = [];

  function validateEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  async function handleInvite() {
    setEmailError("");
    if (!inviteEmail) {
      setEmailError("Email is required");
      return;
    }
    if (!validateEmail(inviteEmail)) {
      setEmailError("Please enter a valid email");
      return;
    }

    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        toast.error("You must be signed in");
        return;
      }

      const idToken = await currentUser.getIdToken();
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: idToken,
          email: inviteEmail,
          role: inviteRole,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to send invitation");
        return;
      }

      toast.success(`Invitation sent to ${inviteEmail}`);
      setShowInviteModal(false);
      setInviteEmail("");
      setInviteRole("employee");
    } catch {
      toast.error("Failed to send invitation");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell
      title="Employees"
      description="Manage your team members"
      actions={
        <Button onClick={() => setShowInviteModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Invite Employee
        </Button>
      }
    >
      {employees.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="No team members yet"
          description="Invite your first employee to start collaborating. They'll receive an email with a link to join."
          action={{
            label: "Invite Employee",
            onClick: () => setShowInviteModal(true),
          }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {employees.map((emp) => (
            <Card key={emp.id}>
              <CardContent className="flex items-start justify-between p-4">
                <div className="flex items-center gap-3">
                  <Avatar name={emp.name} src={emp.avatar_url} size="md" />
                  <div>
                    <p className="text-[14px] font-medium">{emp.name}</p>
                    <p className="text-[12px] text-muted-foreground">{emp.email}</p>
                    <Badge variant={roleColors[emp.role]} className="mt-1.5">
                      {emp.role}
                    </Badge>
                  </div>
                </div>
                <Dropdown
                  trigger={
                    <button className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent/60 transition-colors">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  }
                >
                  <DropdownItem>
                    <Shield className="mr-2 h-4 w-4" />
                    Change Role
                  </DropdownItem>
                  <DropdownItem destructive>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove
                  </DropdownItem>
                </Dropdown>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Invite modal */}
      <Modal
        open={showInviteModal}
        onClose={() => {
          setShowInviteModal(false);
          setEmailError("");
        }}
        title="Invite Employee"
        description="They'll receive an email with a link to join your workspace"
        size="sm"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email address</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="colleague@company.com"
              value={inviteEmail}
              onChange={(e) => {
                setInviteEmail(e.target.value);
                setEmailError("");
              }}
              error={emailError}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-role">Role</Label>
            <Select
              id="invite-role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as UserRole)}
              options={[
                { value: "employee", label: "Employee — Can create and edit records" },
                { value: "manager", label: "Manager — Can manage records and invite" },
                { value: "admin", label: "Admin — Full access" },
                { value: "viewer", label: "Viewer — Read-only access" },
              ]}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowInviteModal(false);
                setEmailError("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Invite
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </Shell>
  );
}
