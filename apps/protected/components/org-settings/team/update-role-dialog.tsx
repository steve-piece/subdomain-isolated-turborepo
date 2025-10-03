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
import { useToast } from "@workspace/ui/components/toast";
import { updateUserRole } from "@/app/actions/team/update-user-role";
import { Loader2, UserCog } from "lucide-react";
import { useTenantClaims } from "@/lib/contexts/tenant-claims-context";

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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Role</DialogTitle>
          <DialogDescription>
            Change the role for {userName}. They will need to log in again for
            changes to take effect.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Current Role</label>
            <p className="text-sm text-muted-foreground capitalize">
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

          {/* Role descriptions */}
          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="font-medium mb-1">Role Permissions:</p>
            <ul className="space-y-1 text-muted-foreground">
              {selectedRole === "owner" && (
                <li>• Full access to all organization features</li>
              )}
              {selectedRole === "superadmin" && (
                <li>• Can manage admin and below users</li>
              )}
              {selectedRole === "admin" && (
                <li>• Can manage member and view-only users</li>
              )}
              {selectedRole === "member" && <li>• Standard access</li>}
              {selectedRole === "view-only" && <li>• Read-only access</li>}
            </ul>
          </div>
        </div>

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
