// apps/protected/components/organization-identity-form.tsx
"use client";

import { useState, useTransition } from "react";
import { Label } from "@workspace/ui/components/label";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { useToast } from "@workspace/ui/components/toast";

interface OrganizationIdentityFormProps {
  organizationName: string;
  description: string | null;
  subdomain: string;
  appDomain: string;
  onSubmit: (formData: FormData) => Promise<{
    success: boolean;
    message: string;
  }>;
}

export function OrganizationIdentityForm({
  organizationName,
  description,
  subdomain,
  appDomain,
  onSubmit,
}: OrganizationIdentityFormProps) {
  const [isPending, startTransition] = useTransition();
  const [orgName, setOrgName] = useState(organizationName);
  const [desc, setDesc] = useState(description || "");
  const { addToast } = useToast();

  const handleSubmit = async (formData: FormData) => {
    startTransition(async () => {
      const result = await onSubmit(formData);

      if (result.success) {
        addToast({
          title: "Success",
          description: result.message,
          variant: "success",
        });
      } else {
        addToast({
          title: "Error",
          description: result.message,
          variant: "error",
        });
      }
    });
  };

  const handleCancel = () => {
    // Reset form to original values
    setOrgName(organizationName);
    setDesc(description || "");
  };

  const hasChanges =
    orgName !== organizationName || desc !== (description || "");

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="org-name">Organization Name</Label>
        <Input
          id="org-name"
          name="org-name"
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          placeholder="Enter organization name"
          required
          disabled={isPending}
          maxLength={255}
        />
        <p className="text-xs text-muted-foreground">
          This is how your organization appears to team members
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subdomain">Subdomain</Label>
        <div className="flex gap-2">
          <Input
            id="subdomain"
            name="subdomain"
            defaultValue={subdomain}
            disabled
            className="bg-muted font-mono"
          />
          <span className="flex items-center text-sm text-muted-foreground">
            .{appDomain}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Contact support to change your subdomain
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          name="description"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Describe your organization..."
          disabled={isPending}
          maxLength={1000}
        />
        <p className="text-xs text-muted-foreground">
          {desc.length}/1000 characters
        </p>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          type="button"
          onClick={handleCancel}
          disabled={isPending || !hasChanges}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending || !hasChanges}>
          {isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
