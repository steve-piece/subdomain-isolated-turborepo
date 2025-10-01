// apps/protected/app/s/[subdomain]/(protected)/(org-settings)/org-settings/billing/page.tsx
/**
 * ✅ PHASE 1.5f: Simplified billing page
 * - Simple role check (owner/admin only)
 * - ⚠️ NO CACHING - billing needs real-time subscription status
 */
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { CreditCard } from "lucide-react";

export default async function BillingSettingsPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  // ⚠️ Keep noStore() - billing needs real-time data
  noStore();

  await params; // Consume params (subdomain not needed here)
  const supabase = await createClient();

  // ✅ Simple role check
  const { data: claims } = await supabase.auth.getClaims();
  const userRole = claims?.claims.user_role || "member";

  if (!["owner", "admin"].includes(userRole)) {
    redirect("/dashboard?error=unauthorized");
  }

  const orgId = claims?.claims.org_id;
  if (!orgId) {
    redirect("/dashboard?error=no_organization");
  }

  // Fetch organization billing data
  const { data: organization } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .single();

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
              <p className="text-2xl font-bold">
                {organization?.plan || "Free"}
              </p>
            </div>
            <Button>Upgrade Plan</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
