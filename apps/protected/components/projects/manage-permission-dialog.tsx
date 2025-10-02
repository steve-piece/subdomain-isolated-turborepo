"use client";

import { useState, useTransition } from "react";
import { updateProjectPermission } from "@/app/actions/projects";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Shield } from "lucide-react";
import { useToast } from "@workspace/ui/components/toast";

interface ManagePermissionDialogProps {
  projectId: string;
  subdomain: string;
  userId: string;
  userName: string;
  currentPermission: "read" | "write" | "admin";
}

type ProjectPermissionLevel = "read" | "write" | "admin";

export function ManagePermissionDialog({
  projectId,
  subdomain,
  userId,
  userName,
  currentPermission,
}: ManagePermissionDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedPermission, setSelectedPermission] =
    useState<ProjectPermissionLevel>(currentPermission);
  const [isPending, startTransition] = useTransition();
  const { addToast } = useToast();

  const handleUpdate = async () => {
    if (selectedPermission === currentPermission) {
      setOpen(false);
      return;
    }

    startTransition(async () => {
      const result = await updateProjectPermission(
        projectId,
        userId,
        selectedPermission,
        subdomain
      );

      if (result.success) {
        addToast({
          title: "Success",
          description: result.message,
          variant: "success",
        });
        setOpen(false);
      } else {
        addToast({
          title: "Error",
          description: result.message,
          variant: "error",
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Shield className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Permission</DialogTitle>
          <DialogDescription>
            Update the permission level for {userName}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <label className="text-sm font-medium">Permission Level</label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer p-3 rounded-md hover:bg-accent">
                <input
                  type="radio"
                  name="permission"
                  value="read"
                  checked={selectedPermission === "read"}
                  onChange={(e) =>
                    setSelectedPermission(
                      e.target.value as ProjectPermissionLevel
                    )
                  }
                  disabled={isPending}
                  className="h-4 w-4"
                />
                <div>
                  <p className="font-medium">Read</p>
                  <p className="text-sm text-muted-foreground">
                    Can view project content
                  </p>
                </div>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer p-3 rounded-md hover:bg-accent">
                <input
                  type="radio"
                  name="permission"
                  value="write"
                  checked={selectedPermission === "write"}
                  onChange={(e) =>
                    setSelectedPermission(
                      e.target.value as ProjectPermissionLevel
                    )
                  }
                  disabled={isPending}
                  className="h-4 w-4"
                />
                <div>
                  <p className="font-medium">Write</p>
                  <p className="text-sm text-muted-foreground">
                    Can edit project content
                  </p>
                </div>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer p-3 rounded-md hover:bg-accent">
                <input
                  type="radio"
                  name="permission"
                  value="admin"
                  checked={selectedPermission === "admin"}
                  onChange={(e) =>
                    setSelectedPermission(
                      e.target.value as ProjectPermissionLevel
                    )
                  }
                  disabled={isPending}
                  className="h-4 w-4"
                />
                <div>
                  <p className="font-medium">Admin</p>
                  <p className="text-sm text-muted-foreground">
                    Full project management access
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={selectedPermission === currentPermission || isPending}
            >
              {isPending ? "Updating..." : "Update Permission"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
