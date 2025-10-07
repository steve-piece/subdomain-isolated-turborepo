"use client";

import { useTenantClaims } from "@/lib/contexts/tenant-claims-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { CreditCard } from "lucide-react";
import {
  getOrgTier,
  OrgTierInfo,
} from "@/app/actions/subscription/tier-access";

export function BillingSettingsWrapper() {
  // ✅ Get user data from context - no API calls!
  const claims = useTenantClaims();
  const router = useRouter();

  const [tierInfo, setTierInfo] = useState<OrgTierInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Role check - redirect if insufficient permissions
  useEffect(() => {
    if (!["owner", "admin"].includes(claims.user_role)) {
      router.push("/dashboard?error=unauthorized");
    }
  }, [claims.user_role, router]);

  // Fetch organization tier information
  useEffect(() => {
    async function fetchTierInfo() {
      // Only fetch if user has proper role
      if (!["owner", "admin", "superadmin"].includes(claims.user_role)) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await getOrgTier(claims.org_id);
        if (response.success && response.tier) {
          setTierInfo(response.tier);
        } else {
          console.error("Failed to get tier info:", response.message);
        }
      } catch (error) {
        console.error("Error fetching tier information:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTierInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show loading or access denied
  if (!["owner", "admin"].includes(claims.user_role)) {
    return <div className="p-6">Checking permissions...</div>;
  }

  if (isLoading || !tierInfo) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="h-6 bg-muted rounded animate-pulse w-64 mb-2" />
            <div className="h-4 bg-muted rounded animate-pulse w-96" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="h-24 bg-muted rounded-lg animate-pulse" />
              <div className="h-12 bg-muted rounded-lg animate-pulse" />
              <div className="h-12 bg-muted rounded-lg animate-pulse" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="h-6 bg-muted rounded animate-pulse w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-muted rounded-lg animate-pulse"
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
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
              <p className="text-sm font-medium text-muted-foreground">
                Current Plan
              </p>
              <p className="text-2xl font-bold capitalize">
                {tierInfo.tierName}
              </p>
            </div>

            {tierInfo.currentPeriodEnd && (
              <p className="text-sm text-muted-foreground">
                {tierInfo.isActive
                  ? `Renews on ${new Date(tierInfo.currentPeriodEnd).toLocaleDateString()}`
                  : `Expired on ${new Date(tierInfo.currentPeriodEnd).toLocaleDateString()}`}
              </p>
            )}

            <div className="pt-2">
              <Button>
                {tierInfo.tierName === "free" ? "Upgrade Plan" : "Manage Plan"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
