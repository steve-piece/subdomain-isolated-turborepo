// apps/protected/components/projects/invite-to-project-dialog.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { grantProjectPermission } from "@actions/projects";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Label } from "@workspace/ui/components/label";
import { useToast } from "@workspace/ui/components/toast";
import { UserPlus } from "lucide-react";

interface OrgMember {
  user_id: string;
  full_name: string | null;
  email: string;
  role: string;
}

interface InviteToProjectDialogProps {
  projectId: string;
  subdomain: string;
  orgMembers: OrgMember[];
  currentMembers: string[]; // Array of user_ids already in project
  trigger?: React.ReactNode;
}

export function InviteToProjectDialog({
  projectId,
  subdomain,
  orgMembers,
  currentMembers,
  trigger,
}: InviteToProjectDialogProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [permissionLevel, setPermissionLevel] = useState<
    "read" | "write" | "admin"
  >("write");
  const [isLoading, setIsLoading] = useState(false);

  // Filter out members already in the project
  const availableMembers = orgMembers.filter(
    (member) => !currentMembers.includes(member.user_id),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;

    setIsLoading(true);

    try {
      const result = await grantProjectPermission(
        projectId,
        selectedUserId,
        permissionLevel,
        subdomain,
      );

      if (result.success) {
        addToast({
          title: "Success",
          description: result.message,
          variant: "success",
        });
        setSelectedUserId("");
        setPermissionLevel("write");
        setOpen(false);
        router.refresh();
      } else {
        addToast({
          title: "Error",
          description: result.message,
          variant: "error",
        });
      }
    } catch {
      addToast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (availableMembers.length === 0) {
    return null; // Don't show button if no one to invite
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Member
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Add a team member to this project and set their access level.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="user">Team Member</Label>
              <select
                id="user"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                disabled={isLoading}
                required
                className="flex h-10 w-full rounded-md border border-input bg-white dark:bg-input/30 px-3 pr-8 py-2 text-sm shadow-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select a member...</option>
                {availableMembers.map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.full_name || member.email} ({member.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="permission">Access Level</Label>
              <select
                id="permission"
                value={permissionLevel}
                onChange={(e) =>
                  setPermissionLevel(
                    e.target.value as "read" | "write" | "admin",
                  )
                }
                disabled={isLoading}
                className="flex h-10 w-full rounded-md border border-input bg-white dark:bg-input/30 px-3 pr-8 py-2 text-sm shadow-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="read">Read - Can view project</option>
                <option value="write">Write - Can edit and collaborate</option>
                <option value="admin">Admin - Can manage members</option>
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? "Inviting..." : "Invite Member"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
