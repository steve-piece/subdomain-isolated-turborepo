// components/org-settings/team/update-role-dialog.tsx
"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { useToast } from "@workspace/ui/components/toast";
import { updateUserRole } from "@/app/actions/team/update-user-role";
import { Loader2, UserCog } from "lucide-react";
import { useTenantClaims } from "@/lib/contexts/tenant-claims-context";
import { RolePermissionsPreview } from "./role-permissions-preview";

type UserRole = "owner" | "superadmin" | "admin" | "member" | "view-only";

interface UpdateRoleDialogProps {
  userId: string;
  userName: string;
  currentRole: UserRole;
  orgId: string;
}

export function UpdateRoleDialog({
  userId,
  userName,
  currentRole,
  orgId,
}: UpdateRoleDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentRole);
  const [isUpdating, setIsUpdating] = useState(false);
  const { addToast } = useToast();
  const claims = useTenantClaims();

  // Determine available roles based on current user's role
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

  const handleUpdateRole = async () => {
    if (selectedRole === currentRole) {
      addToast("No changes made", "info");
      setOpen(false);
      return;
    }

    setIsUpdating(true);

    try {
      const result = await updateUserRole(userId, selectedRole, orgId);

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
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <UserCog className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Update Role</DialogTitle>
          <DialogDescription>
            Change the role for {userName}. They will need to log in again for
            changes to take effect.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-200px)] pr-4">
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
                  onValueChange={(value) => setSelectedRole(value as UserRole)}
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

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleUpdateRole}
            disabled={isUpdating || selectedRole === currentRole}
          >
            {isUpdating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Role"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
