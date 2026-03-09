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
} from "lucide-react";
import toast from "react-hot-toast";
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

  // TODO: Fetch employees from Firestore
  const employees: User[] = [];

  async function handleInvite() {
    if (!inviteEmail) return;
    setLoading(true);
    try {
      // TODO: Send invite via API
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
          description="Invite your first employee to start collaborating"
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
                  <Avatar name={emp.name} size="md" />
                  <div>
                    <p className="font-medium">{emp.name}</p>
                    <p className="text-sm text-muted-foreground">{emp.email}</p>
                    <Badge variant={roleColors[emp.role]} className="mt-1">
                      {emp.role}
                    </Badge>
                  </div>
                </div>
                <Dropdown
                  trigger={
                    <button className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent">
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
        onClose={() => setShowInviteModal(false)}
        title="Invite Employee"
        description="Send an invitation to join your workspace"
        size="sm"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email address</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="employee@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-role">Role</Label>
            <Select
              id="invite-role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as UserRole)}
              options={[
                { value: "admin", label: "Admin" },
                { value: "manager", label: "Manager" },
                { value: "employee", label: "Employee" },
                { value: "viewer", label: "Viewer" },
              ]}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowInviteModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} loading={loading}>
              <Mail className="mr-2 h-4 w-4" />
              Send Invite
            </Button>
          </div>
        </div>
      </Modal>
    </Shell>
  );
}
