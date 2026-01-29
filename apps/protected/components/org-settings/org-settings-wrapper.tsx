// components/org-settings/org-settings-wrapper.tsx
"use client";

import { useTenantClaims } from "@/lib/contexts/tenant-claims-context";
import { OrganizationIdentityForm } from "./general/organization-identity-form";
import { OrganizationLogoUpload } from "./general/organization-logo-upload";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { updateOrganizationIdentity } from "@/app/actions/organization";
import { createClient } from "@workspace/supabase/client";
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
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="h-6 bg-muted rounded animate-pulse w-56 mb-2" />
            <div className="h-4 bg-muted rounded animate-pulse w-80" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Logo Upload Skeleton */}
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse w-32" />
                <div className="flex items-center gap-4">
                  <div className="h-24 w-24 bg-muted rounded-lg animate-pulse" />
                  <div className="h-10 w-32 bg-muted rounded-lg animate-pulse" />
                </div>
              </div>

              {/* Form Fields Skeleton */}
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse w-24" />
                  <div className="h-10 bg-muted rounded-lg animate-pulse w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Organization Logo */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Logo</CardTitle>
          <CardDescription>
            Upload and manage your organization&apos;s logo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrganizationLogoUpload
            organizationName={organization.company_name}
            currentLogoUrl={organization.logo_url || null}
          />
        </CardContent>
      </Card>

      {/* Organization Identity */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Information</CardTitle>
          <CardDescription>
            Update your organization&apos;s details and preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}
