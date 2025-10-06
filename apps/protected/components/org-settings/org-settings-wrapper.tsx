// components/org-settings/org-settings-wrapper.tsx
"use client";

import { useTenantClaims } from "@/lib/contexts/tenant-claims-context";
import { OrganizationIdentityForm } from "./general/organization-identity-form";
import { OrganizationLogoUpload } from "./general/organization-logo-upload";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { updateOrganizationIdentity } from "@/app/actions/organization";
import { createClient } from "@/lib/supabase/client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Organization {
  company_name: string;
  subdomain: string;
  description: string | null;
  logo_url: string | null;
  industry: string | null;
  website: string | null;
  address: string | null;
  company_size: string | null;
}

interface OrgSettingsWrapperProps {
  subdomain: string;
  appDomain: string;
}

export function OrgSettingsWrapper({
  subdomain,
  appDomain,
}: OrgSettingsWrapperProps) {
  // ✅ Get user data from context - no API calls!
  const claims = useTenantClaims();
  const router = useRouter();
  const supabase = createClient();

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Role check - redirect if insufficient permissions
  useEffect(() => {
    if (!["owner", "admin", "superadmin"].includes(claims.user_role)) {
      router.push("/dashboard?error=unauthorized");
    }
  }, [claims.user_role, router]);

  // Fetch organization data
  useEffect(() => {
    async function fetchOrganization() {
      try {
        const { data } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", claims.org_id)
          .single();

        if (!data) {
          router.push("/dashboard?error=organization_not_found");
          return;
        }

        setOrganization(data);
      } catch (error) {
        console.error("Failed to fetch organization:", error);
        router.push("/dashboard?error=organization_not_found");
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrganization();
  }, [claims.org_id, supabase, router]);

  // Show loading or access denied
  if (!["owner", "admin", "superadmin"].includes(claims.user_role)) {
    return <div className="p-6">Checking permissions...</div>;
  }

  if (isLoading || !organization) {
    return <div className="p-6">Loading organization settings...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Organization Settings</CardTitle>
          <CardDescription>
            Manage your organization&apos;s identity and preferences
          </CardDescription>
        </CardHeader>
      </Card>

      <OrganizationLogoUpload
        organizationName={organization.company_name}
        currentLogoUrl={organization.logo_url || null}
      />

      <OrganizationIdentityForm
        organizationName={organization.company_name || ""}
        subdomain={organization.subdomain || subdomain}
        description={organization.description || ""}
        industry={organization.industry || ""}
        website={organization.website || ""}
        address={organization.address || ""}
        companySize={organization.company_size || ""}
        appDomain={appDomain}
        onSubmit={updateOrganizationIdentity}
      />
    </div>
  );
}
