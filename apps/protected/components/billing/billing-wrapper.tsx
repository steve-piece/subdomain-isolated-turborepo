// apps/protected/components/billing/billing-wrapper.tsx
import type { ReactElement } from "react";
import { BillingData } from "@/app/actions/billing/get-billing-data";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty";
import {
  Check,
  CreditCard,
  Receipt,
  TrendingUp,
  Zap,
  AlertCircle,
} from "lucide-react";
import { UpgradeButton } from "./upgrade-button";
import { ManageBillingButton } from "./manage-billing-button";
import { format } from "date-fns";

interface BillingWrapperProps {
  orgId: string;
  subdomain: string;
  billingData: BillingData;
  plans: Array<{
    id: string;
    name: string;
    price_monthly: number;
    stripe_price_id: string | null;
    features: Record<string, unknown>;
  }>;
}

export function BillingWrapper({
  orgId,
  subdomain,
  billingData,
  plans,
}: BillingWrapperProps): ReactElement {
  const currentTier = billingData.subscription?.tier || "Free";
  const usage = billingData.usage;
  const isDevelopment = process.env.NODE_ENV === "development";

  // Format currency
  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  // Calculate usage percentage
  const getUsagePercentage = (current: number, limit: number | null) => {
    if (limit === null) return 0;
    return Math.min(Math.round((current / limit) * 100), 100);
  };

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
                You are currently on the {currentTier} plan
              </CardDescription>
            </div>
            {billingData.subscription && (
              <ManageBillingButton orgId={orgId} subdomain={subdomain} />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 bg-background rounded-lg">
              <p className="text-sm text-muted-foreground">Team Members</p>
              <p className="text-2xl font-bold">
                {usage.teamMembers.current} / {usage.teamMembers.limit || "∞"}
              </p>
            </div>
            <div className="p-4 bg-background rounded-lg">
              <p className="text-sm text-muted-foreground">Projects</p>
              <p className="text-2xl font-bold">
                {usage.projects.current} / {usage.projects.limit || "∞"}
              </p>
            </div>
            <div className="p-4 bg-background rounded-lg">
              <p className="text-sm text-muted-foreground">Storage</p>
              <p className="text-2xl font-bold">
                {usage.storage.current} GB / {usage.storage.limit || "∞"} GB
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Plans */}
      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => {
          const isCurrentPlan = plan.name === currentTier;
          const isPro = plan.name === "Pro";

          return (
            <Card
              key={plan.id}
              className={isPro ? "border-primary shadow-lg" : ""}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  {isPro && (
                    <span className="inline-flex items-center rounded-full bg-primary px-2 py-1 text-xs font-medium text-primary-foreground">
                      Popular
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">
                    {formatPrice(plan.price_monthly)}
                  </span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  {plan.features &&
                    typeof plan.features === "object" &&
                    Object.entries(plan.features).map(([key, value]) => (
                      <li key={key} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        {String(value)}
                      </li>
                    ))}
                </ul>
                {isCurrentPlan ? (
                  <div className="w-full py-2 text-center text-sm text-muted-foreground">
                    Current Plan
                  </div>
                ) : plan.stripe_price_id ? (
                  <UpgradeButton
                    orgId={orgId}
                    subdomain={subdomain}
                    priceId={plan.stripe_price_id}
                    planName={plan.name}
                  />
                ) : (
                  <div className="w-full py-2 text-center text-sm text-muted-foreground">
                    Contact Sales
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
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
          {billingData.paymentMethod ? (
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <CreditCard className="h-10 w-10 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {billingData.paymentMethod.brand?.toUpperCase()} ****{" "}
                    {billingData.paymentMethod.last4}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Expires {billingData.paymentMethod.expMonth}/
                    {billingData.paymentMethod.expYear}
                  </p>
                </div>
              </div>
              <ManageBillingButton orgId={orgId} subdomain={subdomain} />
            </div>
          ) : (
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
                      Development mode - Payment methods are disabled for
                      testing. Connect a payment method in production to upgrade
                      your plan.
                    </>
                  ) : (
                    "Add a payment method to upgrade your plan and unlock premium features."
                  )}
                </EmptyDescription>
              </EmptyHeader>
              {!isDevelopment && (
                <EmptyContent>
                  <ManageBillingButton orgId={orgId} subdomain={subdomain} />
                </EmptyContent>
              )}
            </Empty>
          )}
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
          {billingData.invoices.length > 0 ? (
            <div className="space-y-2">
              {billingData.invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {invoice.number || "Invoice"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(invoice.created), "MMM d, yyyy")} •{" "}
                      {invoice.status}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-medium">
                      {formatPrice(invoice.amount)}
                    </p>
                    {invoice.pdfUrl && (
                      <a
                        href={invoice.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        Download
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
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
                      Development mode - Your billing history will appear here
                      in production once you subscribe to a paid plan.
                    </>
                  ) : (
                    "Your billing history will appear here once you upgrade to a paid plan."
                  )}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
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
            Track your organization&apos;s usage this month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Team Members</span>
                <span className="text-sm text-muted-foreground">
                  {usage.teamMembers.current} / {usage.teamMembers.limit || "∞"}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{
                    width: `${getUsagePercentage(usage.teamMembers.current, usage.teamMembers.limit)}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Storage</span>
                <span className="text-sm text-muted-foreground">
                  {usage.storage.current} GB / {usage.storage.limit || "∞"} GB
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{
                    width: `${getUsagePercentage(usage.storage.current, usage.storage.limit)}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">API Calls</span>
                <span className="text-sm text-muted-foreground">
                  {usage.apiCalls.current.toLocaleString()} /{" "}
                  {usage.apiCalls.limit?.toLocaleString() || "∞"}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{
                    width: `${getUsagePercentage(usage.apiCalls.current, usage.apiCalls.limit)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
