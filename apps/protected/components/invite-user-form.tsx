// apps/protected/components/invite-user-form.tsx 
"use client";

import { useState } from "react";
import { inviteUserToOrganization } from "@/app/actions";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
// Using HTML select for role selection

interface InviteUserFormProps {
  subdomain: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function InviteUserForm({
  subdomain,
  onSuccess,
  onCancel,
}: InviteUserFormProps) {
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

        // Call onSuccess callback after a delay to show success message
        setTimeout(() => {
          onSuccess?.();
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
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-xl">Invite Team Member</CardTitle>
        <CardDescription>
          Send an invitation to join <strong>{subdomain}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleInviteUser}>
          <div className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                value={role}
                onChange={(e) =>
                  setRole(e.target.value as "admin" | "member" | "view-only")
                }
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
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
