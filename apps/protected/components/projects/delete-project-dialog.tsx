"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteProject } from "@/app/actions/projects";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Trash2, AlertTriangle } from "lucide-react";
import { useToast } from "@workspace/ui/components/toast";

interface DeleteProjectDialogProps {
  projectId: string;
  projectName: string;
  subdomain: string;
}

export function DeleteProjectDialog({
  projectId,
  projectName,
  subdomain,
}: DeleteProjectDialogProps) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { addToast } = useToast();

  const isConfirmed = confirmText === projectName;

  const handleDelete = async () => {
    if (!isConfirmed) return;

    startTransition(async () => {
      const result = await deleteProject(projectId, subdomain);

      if (result.success) {
        addToast({
          title: "Success",
          description: result.message,
          variant: "success",
        });
        setOpen(false);
        router.push(`/s/${subdomain}/projects`);
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
        <Button variant="destructive" size="sm">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Project
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the
            project and remove all associated data.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <p className="font-semibold mb-1">Warning:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>All project members will lose access</li>
              <li>Project data will be permanently deleted</li>
              <li>This action cannot be reversed</li>
            </ul>
          </div>

          <div>
            <label
              htmlFor="confirm"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Type <span className="font-bold">{projectName}</span> to confirm:
            </label>
            <input
              id="confirm"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={isPending}
              placeholder={projectName}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-2"
            />
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
              variant="destructive"
              onClick={handleDelete}
              disabled={!isConfirmed || isPending}
            >
              {isPending ? "Deleting..." : "Delete Project"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
