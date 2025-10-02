// apps/protected/components/invite-user-dialog.tsx
// Dialog component for inviting users with role configuration
"use client";

import { useState } from "react";
import { inviteUserToOrganization } from "@actions/invitations";
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
import { UserPlus } from "lucide-react";

interface InviteUserDialogProps {
  subdomain: string;
  trigger?: React.ReactNode;
}

export function InviteUserDialog({
  subdomain,
  trigger,
}: InviteUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member" | "view-only">("member");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await inviteUserToOrganization(email, role, subdomain);

      if (result.success) {
        setSuccess(result.message);
        setEmail("");
        setRole("member");

        // Close dialog after a delay to show success message
        setTimeout(() => {
          setSuccess(null);
          setOpen(false);
        }, 2000);
      } else {
        setError(result.message);
      }
    } catch (error: unknown) {
      setError(
        error instanceof Error ? error.message : "An unexpected error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="w-full justify-start" size="lg" variant="outline">
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Team Member
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an invitation to join <strong>{subdomain}</strong>. Configure
            their access level below.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleInviteUser}>
          <div className="flex flex-col gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                autoComplete="off"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="role">Access Level</Label>
              <select
                id="role"
                value={role}
                onChange={(e) =>
                  setRole(e.target.value as "admin" | "member" | "view-only")
                }
                disabled={isLoading}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="view-only">
                  View Only - Can view content only
                </option>
                <option value="member">
                  Member - Can edit and collaborate
                </option>
                <option value="admin">
                  Admin - Can manage users and settings
                </option>
              </select>
            </div>

            {error && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200">
                <p className="text-sm text-red-700 flex items-center">
                  <span className="mr-2">⚠️</span>
                  {error}
                </p>
              </div>
            )}

            {success && (
              <div className="p-3 rounded-md bg-green-50 border border-green-200">
                <p className="text-sm text-green-700 flex items-center">
                  <span className="mr-2">✅</span>
                  {success}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? "Sending..." : "Send Invitation"}
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
