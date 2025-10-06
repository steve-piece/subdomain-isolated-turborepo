// apps/protected/components/organization-identity-form.tsx
"use client";

import { useState, useTransition } from "react";
import { Label } from "@workspace/ui/components/label";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { useToast } from "@workspace/ui/components/toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

const COMPANY_SIZE_OPTIONS = [
  { value: "1-10", label: "1-10 employees" },
  { value: "11-50", label: "11-50 employees" },
  { value: "51-200", label: "51-200 employees" },
  { value: "201-500", label: "201-500 employees" },
  { value: "501-1000", label: "501-1000 employees" },
  { value: "1000+", label: "1000+ employees" },
];

interface OrganizationIdentityFormProps {
  organizationName: string;
  description: string | null;
  industry: string | null;
  website: string | null;
  address: string | null;
  companySize: string | null;
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
  industry,
  website,
  address,
  companySize,
  subdomain,
  appDomain,
  onSubmit,
}: OrganizationIdentityFormProps) {
  const [isPending, startTransition] = useTransition();
  const [orgName, setOrgName] = useState(organizationName);
  const [desc, setDesc] = useState(description || "");
  const [ind, setInd] = useState(industry || "");
  const [site, setSite] = useState(website || "");
  const [addr, setAddr] = useState(address || "");
  const [size, setSize] = useState(companySize || "");
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
    setInd(industry || "");
    setSite(website || "");
    setAddr(address || "");
    setSize(companySize || "");
  };

  const hasChanges =
    orgName !== organizationName ||
    desc !== (description || "") ||
    ind !== (industry || "") ||
    site !== (website || "") ||
    addr !== (address || "") ||
    size !== (companySize || "");

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="industry">Industry</Label>
          <Input
            id="industry"
            name="industry"
            value={ind}
            onChange={(e) => setInd(e.target.value)}
            placeholder="e.g., Technology, Healthcare"
            disabled={isPending}
            maxLength={100}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="company-size">Company Size</Label>
          <Select value={size} onValueChange={setSize} disabled={isPending}>
            <SelectTrigger id="company-size">
              <SelectValue placeholder="Select company size" />
            </SelectTrigger>
            <SelectContent>
              {COMPANY_SIZE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="company-size" value={size} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="website">Website</Label>
        <Input
          id="website"
          name="website"
          type="url"
          value={site}
          onChange={(e) => setSite(e.target.value)}
          placeholder="https://example.com"
          disabled={isPending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          name="address"
          value={addr}
          onChange={(e) => setAddr(e.target.value)}
          placeholder="123 Main St, City, Country"
          disabled={isPending}
          maxLength={500}
        />
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
