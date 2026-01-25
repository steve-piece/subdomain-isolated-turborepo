"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTenantClaims } from "@/lib/contexts/tenant-claims-context";
import { checkBusinessPlusAccess } from "@/app/actions/subscription/tier-access";
import type { OrgTierInfo } from "@/app/actions/subscription/tier-access";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Crown, Lock, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

interface RequireTierAccessProps {
  children: React.ReactNode;
  featureName: string;
  featureDescription?: string;
}

export function RequireTierAccess({
  children,
  featureName,
  featureDescription,
}: RequireTierAccessProps) {
  const claims = useTenantClaims();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [tierInfo, setTierInfo] = useState<OrgTierInfo | null>(null);

  useEffect(() => {
    async function checkAccess() {
      if (!claims.org_id) {
        router.push("/dashboard?error=missing_org");
        return;
      }

      const result = await checkBusinessPlusAccess(claims.org_id);

      if (result.success) {
        setHasAccess(result.hasAccess);
        setTierInfo(result.tier || null);
      } else {
        // On error, deny access but show info
        setHasAccess(false);
      }

      setIsChecking(false);
    }

    checkAccess();
  }, [claims.org_id, router]);

  // Loading state
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <Sparkles className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-sm text-muted-foreground">
            Checking access permissions...
          </p>
        </div>
      </div>
    );
  }

  // Access granted - show protected content
  if (hasAccess) {
    return <>{children}</>;
  }

  // Access denied - show upgrade prompt
  return (
    <div className="container max-w-4xl mx-auto p-6">
      <Card className="border-2 border-amber-500/20 shadow-lg">
        <CardHeader className="text-center pb-4 space-y-4">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 shadow-lg">
            <Crown className="h-10 w-10 text-white drop-shadow-lg" />
          </div>
          <div className="space-y-2">
            <Badge variant="secondary" className="text-xs font-semibold">
              BUSINESS+ FEATURE
            </Badge>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              Upgrade Required
            </CardTitle>
            <CardDescription className="text-base mt-2">
              <strong>{featureName}</strong> is available on Business and
              Enterprise plans
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Current Plan Info */}
          <div className="bg-muted/50 rounded-lg p-4 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Current Plan
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xl font-bold capitalize">
                    {tierInfo?.tierName || "Free"}
                  </p>
                  <Badge
                    variant={tierInfo?.isActive ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {tierInfo?.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
              <Lock className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </div>

          {/* Feature Description */}
          {featureDescription && (
            <div className="space-y-2 p-4 bg-primary/5 rounded-lg border border-primary/10">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                About {featureName}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {featureDescription}
              </p>
            </div>
          )}

          {/* Business+ Benefits */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-600" />
              What&apos;s Included in Business+
            </h3>
            <div className="grid gap-2">
              {[
                "Custom role capabilities and granular permissions",
                "Advanced billing management and analytics",
                "Up to 100 team members",
                "500+ projects",
                "Priority support with dedicated account manager",
                "Advanced security features and audit logs",
              ].map((benefit, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 text-sm p-2 rounded hover:bg-muted/50 transition-colors"
                >
                  <ArrowRight className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Preview */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-3xl font-bold">$99</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <p className="text-xs text-muted-foreground">
              or $990/year (save 17%)
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link href="/org-settings/billing" className="flex-1">
              <Button className="w-full h-11 text-base font-semibold" size="lg">
                <Crown className="h-5 w-5 mr-2" />
                Upgrade to Business
              </Button>
            </Link>
            <Link href="/dashboard" className="flex-1">
              <Button
                variant="outline"
                size="lg"
                className="w-full h-11 text-base"
              >
                Back to Dashboard
              </Button>
            </Link>
          </div>

          {/* Help Text */}
          <div className="text-center pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Have questions or need a custom plan?
            </p>
            <a
              href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAI || "support@emaildomain.com"}`}
              className="text-xs text-primary hover:underline font-medium"
            >
              Contact our sales team →
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
