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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty";
import { CreditCard, Receipt, AlertCircle } from "lucide-react";
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
  const isDevelopment = process.env.NODE_ENV === "development";

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

      {/* Payment Method */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            <CardTitle>Payment Method</CardTitle>
          </div>
          <CardDescription>Manage your payment information</CardDescription>
        </CardHeader>
        <CardContent>
          <Empty className="border-0 py-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CreditCard />
              </EmptyMedia>
              <EmptyTitle>No Payment Method</EmptyTitle>
              <EmptyDescription>
                {isDevelopment ? (
                  <>
                    <AlertCircle className="inline h-3.5 w-3.5 mr-1 text-amber-500" />
                    Development mode - Payment methods are disabled for testing.
                    Connect a payment method in production to upgrade your plan.
                  </>
                ) : (
                  "Add a payment method to upgrade your plan and unlock premium features."
                )}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            <CardTitle>Billing History</CardTitle>
          </div>
          <CardDescription>View and download past invoices</CardDescription>
        </CardHeader>
        <CardContent>
          <Empty className="border-0 py-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Receipt />
              </EmptyMedia>
              <EmptyTitle>No Invoices Yet</EmptyTitle>
              <EmptyDescription>
                {isDevelopment ? (
                  <>
                    <AlertCircle className="inline h-3.5 w-3.5 mr-1 text-amber-500" />
                    Development mode - Your billing history will appear here in
                    production once you subscribe to a paid plan.
                  </>
                ) : (
                  "Your billing history will appear here once you upgrade to a paid plan."
                )}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    </div>
  );
}
