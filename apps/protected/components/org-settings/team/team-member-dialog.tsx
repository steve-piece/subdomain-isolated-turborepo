// apps/protected/components/org-settings/team/team-member-dialog.tsx
// Unified dialog for inviting new members and managing existing members
"use client";

import { useState, useEffect } from "react";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { useToast } from "@workspace/ui/components/toast";
import { UserPlus, UserCog, Loader2, Users } from "lucide-react";
import { useTenantClaims } from "@/lib/contexts/tenant-claims-context";
import { inviteUserToOrganization } from "@actions/invitations";
import { updateUserRole } from "@/app/actions/team/update-user-role";
import { getTeamSettings } from "@/app/actions/organization/team-settings";
import { RolePermissionsPreview } from "./role-permissions-preview";

type UserRole = "owner" | "superadmin" | "admin" | "member" | "view-only";
type InviteRole = "admin" | "member" | "view-only";

interface TeamMemberDialogProps {
  subdomain: string;
  // For invite mode
  mode?: "invite";
  trigger?: React.ReactNode;
  // For manage mode
  userId?: string;
  userName?: string;
  currentRole?: UserRole;
}

export function TeamMemberDialog({
  subdomain,
  mode: initialMode = "invite",
  trigger,
  userId,
  userName,
  currentRole,
}: TeamMemberDialogProps) {
  const claims = useTenantClaims();
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"invite" | "manage">(initialMode);

  // Invite state
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<InviteRole>("member");
  const [defaultRole, setDefaultRole] = useState<InviteRole>("member");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // Manage state
  const [selectedRole, setSelectedRole] = useState<UserRole>(
    currentRole || "member",
  );
  const [updateLoading, setUpdateLoading] = useState(false);

  // Determine if we should show tabs or single view
  const showTabs = !userId && !currentRole; // Only show tabs in general dialog

  // Fetch default role for invite
  useEffect(() => {
    async function fetchDefaultRole() {
      if (!claims.org_id) return;
      const result = await getTeamSettings(claims.org_id);
      if (result.success && result.settings) {
        setDefaultRole(result.settings.auto_assign_default_role);
        setInviteRole(result.settings.auto_assign_default_role);
      }
    }
    fetchDefaultRole();
  }, [claims.org_id]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setInviteRole(defaultRole);
      setEmail("");
      setInviteError(null);
      setInviteSuccess(null);
      if (currentRole) {
        setSelectedRole(currentRole);
        setActiveTab("manage");
      } else {
        setActiveTab("invite");
      }
    }
  }, [open, defaultRole, currentRole]);

  // Available roles based on current user's permissions
  const getAvailableRoles = (): UserRole[] => {
    const userRole = claims.user_role as UserRole;
    if (userRole === "owner") {
      return ["owner", "superadmin", "admin", "member", "view-only"];
    } else if (userRole === "superadmin") {
      return ["admin", "member", "view-only"];
    } else if (userRole === "admin") {
      return ["member", "view-only"];
    }
    return [];
  };

  const availableRoles = getAvailableRoles();

  // Handle invite submission
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    setInviteError(null);
    setInviteSuccess(null);

    try {
      const result = await inviteUserToOrganization(
        email,
        inviteRole,
        subdomain,
      );
      if (result.success) {
        setInviteSuccess(result.message);
        setEmail("");
        setInviteRole(defaultRole);
        setTimeout(() => {
          setInviteSuccess(null);
          setOpen(false);
        }, 2000);
      } else {
        setInviteError(result.message);
      }
    } catch (error: unknown) {
      setInviteError(
        error instanceof Error ? error.message : "An unexpected error occurred",
      );
    } finally {
      setInviteLoading(false);
    }
  };

  // Handle role update
  const handleUpdateRole = async () => {
    if (!userId || !currentRole) return;

    if (selectedRole === currentRole) {
      addToast("No changes made", "info");
      setOpen(false);
      return;
    }

    setUpdateLoading(true);
    try {
      const result = await updateUserRole(userId, selectedRole, claims.org_id);
      if (result.success) {
        addToast(`Role updated to ${selectedRole}`, "success");
        setOpen(false);
      } else {
        addToast(result.error || "Failed to update role", "error");
      }
    } catch (error) {
      console.error("Error updating role:", error);
      addToast("An unexpected error occurred", "error");
    } finally {
      setUpdateLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Manage Team
          </Button>
        )}
      </DialogTrigger>

      {/* Fixed size dialog content */}
      <DialogContent className="sm:max-w-[600px] min-h-[500px] flex flex-col">
        {showTabs ? (
          // Tabbed interface for general dialog
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "invite" | "manage")}
            className="flex-1 flex flex-col"
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Management
              </DialogTitle>
              <DialogDescription>
                Invite new members or manage existing team members
              </DialogDescription>
            </DialogHeader>

            <TabsList className="grid w-full grid-cols-2 mt-4">
              <TabsTrigger value="invite" className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Invite Member
              </TabsTrigger>
              <TabsTrigger value="manage" className="flex items-center gap-2">
                <UserCog className="h-4 w-4" />
                Manage Roles
              </TabsTrigger>
            </TabsList>

            {/* Invite Tab */}
            <TabsContent value="invite" className="flex-1 mt-4">
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="colleague@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={inviteLoading}
                    autoComplete="off"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="invite-role">Access Level</Label>
                  <Select
                    value={inviteRole}
                    onValueChange={(value) =>
                      setInviteRole(value as InviteRole)
                    }
                    disabled={inviteLoading}
                  >
                    <SelectTrigger id="invite-role">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="view-only">
                        View Only - Can view content only
                      </SelectItem>
                      <SelectItem value="member">
                        Member - Can edit and collaborate
                      </SelectItem>
                      <SelectItem value="admin">
                        Admin - Can manage users and settings
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {inviteError && (
                  <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                    <p className="text-sm text-destructive flex items-center">
                      <span className="mr-2">⚠️</span>
                      {inviteError}
                    </p>
                  </div>
                )}

                {inviteSuccess && (
                  <div className="p-3 rounded-md bg-success-muted border border-success-muted">
                    <p className="text-sm text-success-foreground flex items-center">
                      <span className="mr-2">✅</span>
                      {inviteSuccess}
                    </p>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={inviteLoading}
                  >
                    {inviteLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Send Invitation
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                    disabled={inviteLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </TabsContent>

            {/* Manage Tab */}
            <TabsContent value="manage" className="flex-1 mt-4">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Select a team member from the list below to update their role.
                </p>
                <div className="p-8 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-center">
                  <UserCog className="h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Click the <UserCog className="h-4 w-4 inline mx-1" /> icon
                    next to a team member&apos;s name to update their role
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          // Single mode for manage dialog (when userId is provided)
          <>
            <DialogHeader>
              <DialogTitle>Update Role</DialogTitle>
              <DialogDescription>
                Change the role for {userName}. They will need to log in again
                for changes to take effect.
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Current Role</label>
                    <p className="text-sm text-muted-foreground capitalize px-3 py-2 bg-muted rounded-md">
                      {currentRole}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">New Role</label>
                    <Select
                      value={selectedRole}
                      onValueChange={(value) =>
                        setSelectedRole(value as UserRole)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoles.map((role) => (
                          <SelectItem key={role} value={role}>
                            <span className="capitalize">{role}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Permissions Preview */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Permissions for {selectedRole} role
                  </label>
                  <RolePermissionsPreview role={selectedRole} />
                </div>
              </div>
            </ScrollArea>

            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateRole}
                disabled={updateLoading || selectedRole === currentRole}
                className="flex-1"
              >
                {updateLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <UserCog className="h-4 w-4 mr-2" />
                    Update Role
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
