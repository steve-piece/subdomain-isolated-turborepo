"use client";

import { useTenantClaims } from "@/lib/contexts/tenant-claims-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { CreditCard } from "lucide-react";

interface Organization {
  plan?: string;
  subscription_tier?: string;
}

export function BillingSettingsWrapper() {
  // ✅ Get user data from context - no API calls!
  const claims = useTenantClaims();
  const router = useRouter();
  const supabase = createClient();

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Role check - redirect if insufficient permissions
  useEffect(() => {
    if (!["owner", "admin"].includes(claims.user_role)) {
      router.push("/dashboard?error=unauthorized");
    }
  }, [claims.user_role, router]);

  // Fetch organization billing data
  useEffect(() => {
    async function fetchOrganization() {
      try {
        const { data } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", claims.org_id)
          .single();

        setOrganization(data);
      } catch (error) {
        console.error("Failed to fetch organization:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrganization();
  }, [claims.org_id, supabase]);

  // Show loading or access denied
  if (!["owner", "admin"].includes(claims.user_role)) {
    return <div className="p-6">Checking permissions...</div>;
  }

  if (isLoading || !organization) {
    return <div className="p-6">Loading billing information...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Billing & Subscription
          </CardTitle>
          <CardDescription>
            Manage your subscription plan and billing information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium">Current Plan</p>
              <p className="text-2xl font-bold capitalize">
                {organization?.subscription_tier ||
                  organization?.plan ||
                  "Free"}
              </p>
            </div>
            <Button>Upgrade Plan</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
