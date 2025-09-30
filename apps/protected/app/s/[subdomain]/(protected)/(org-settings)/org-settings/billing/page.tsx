// apps/protected/app/s/[subdomain]/(org-settings)/org-settings/billing/page.tsx
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
import {
  CreditCard,
  TrendingUp,
  Receipt,
  AlertCircle,
  Check,
  Zap,
} from "lucide-react";

export default async function BillingSettingsPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  noStore();
  const { subdomain } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/auth/login?reason=no_session");
  }

  const { data: claims, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claims || claims.claims.subdomain !== subdomain) {
    redirect("/auth/login?error=unauthorized");
  }

  const organizationName = claims.claims.company_name || subdomain;
  const userRole = claims.claims.user_role || "member";

  // Check if user has permission to view billing settings
  const allowedRoles = ["owner", "admin"];
  if (!allowedRoles.includes(userRole)) {
    redirect("/dashboard?error=unauthorized");
  }

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <CardTitle>Current Plan</CardTitle>
              </div>
              <CardDescription>
                You are currently on the Free Trial plan
              </CardDescription>
            </div>
            <Button>Upgrade Plan</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 bg-background rounded-lg">
              <p className="text-sm text-muted-foreground">Team Members</p>
              <p className="text-2xl font-bold">1 / 5</p>
            </div>
            <div className="p-4 bg-background rounded-lg">
              <p className="text-sm text-muted-foreground">Projects</p>
              <p className="text-2xl font-bold">0 / 10</p>
            </div>
            <div className="p-4 bg-background rounded-lg">
              <p className="text-sm text-muted-foreground">Storage</p>
              <p className="text-2xl font-bold">0 / 5 GB</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Plans */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Free Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Free</CardTitle>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">$0</span>
              <span className="text-sm text-muted-foreground">/month</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                Up to 5 team members
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                10 projects
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />5 GB storage
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                Basic support
              </li>
            </ul>
            <Button variant="outline" className="w-full" disabled>
              Current Plan
            </Button>
          </CardContent>
        </Card>

        {/* Pro Plan */}
        <Card className="border-primary shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Pro</CardTitle>
              <span className="inline-flex items-center rounded-full bg-primary px-2 py-1 text-xs font-medium text-primary-foreground">
                Popular
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">$29</span>
              <span className="text-sm text-muted-foreground">/month</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                Up to 25 team members
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                Unlimited projects
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                50 GB storage
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                Priority support
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                Advanced analytics
              </li>
            </ul>
            <Button className="w-full">Upgrade to Pro</Button>
          </CardContent>
        </Card>

        {/* Enterprise Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Enterprise</CardTitle>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">Custom</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                Unlimited team members
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                Unlimited projects
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                Unlimited storage
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                24/7 dedicated support
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                Custom integrations
              </li>
            </ul>
            <Button variant="outline" className="w-full">
              Contact Sales
            </Button>
          </CardContent>
        </Card>
      </div>

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
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <CreditCard className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">No payment method added</p>
                <p className="text-xs text-muted-foreground">
                  Add a payment method to upgrade your plan
                </p>
              </div>
            </div>
            <Button variant="outline">Add Payment Method</Button>
          </div>
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
          <div className="text-center py-8 text-muted-foreground">
            <Receipt className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No invoices yet</p>
            <p className="text-xs mt-1">
              Your billing history will appear here once you upgrade
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Usage Stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            <CardTitle>Usage Statistics</CardTitle>
          </div>
          <CardDescription>
            Track your organization's usage this month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Team Members</span>
                <span className="text-sm text-muted-foreground">1 / 5</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary w-[20%]" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Storage</span>
                <span className="text-sm text-muted-foreground">
                  0 GB / 5 GB
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary w-[0%]" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">API Calls</span>
                <span className="text-sm text-muted-foreground">
                  0 / 10,000
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary w-[0%]" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
