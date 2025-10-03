// components/org-settings/team/delete-user-dialog.tsx
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { useToast } from "@workspace/ui/components/toast";
import { deleteUser } from "@/app/actions/team/delete-user";
import { Loader2, Trash2 } from "lucide-react";

interface DeleteUserDialogProps {
  userId: string;
  userName: string;
  userEmail: string;
  orgId: string;
}

export function DeleteUserDialog({
  userId,
  userName,
  userEmail,
  orgId,
}: DeleteUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { addToast } = useToast();

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const result = await deleteUser(userId, orgId);

      if (result.success) {
        addToast(
          `${userName} has been removed from the organization`,
          "success"
        );
        setShowConfirm(false);
        setOpen(false);
      } else {
        addToast(result.error || "Failed to remove user", "error");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      addToast("An unexpected error occurred", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove User</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {userName} from the organization?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
              <p className="text-sm font-medium text-destructive mb-2">
                ⚠️ Warning
              </p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• User will lose access to this organization</li>
                <li>
                  • User can still log in but won&apos;t see this organization
                </li>
                <li>• User email: {userEmail}</li>
                <li>• This action cannot be undone</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => setShowConfirm(true)}>
              Remove User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Alert Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Final Confirmation</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {userName} ({userEmail}) from the
              organization. Are you absolutely sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                "Yes, Remove User"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
