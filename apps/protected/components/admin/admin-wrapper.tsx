// components/admin/admin-wrapper.tsx
"use client";

import type { ReactElement } from "react";
import { useTenantClaims } from "@/lib/contexts/tenant-claims-context";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Users,
  Settings,
  CreditCard,
  Shield,
  Wrench,
  Plug,
  BarChart3,
} from "lucide-react";
import { InviteUserDialog } from "@/components/shared/invite-user-dialog";
import { PageHeader } from "@/components/shared/page-header";

interface AdminWrapperProps {
  subdomain: string;
}

export function AdminWrapper({ subdomain }: AdminWrapperProps): ReactElement {
  // ✅ Get user data from context - no API calls!
  const claims = useTenantClaims();
  const router = useRouter();

  // Role check - redirect if insufficient permissions
  useEffect(() => {
    if (!["owner", "admin", "superadmin"].includes(claims.user_role)) {
      router.push("/dashboard?error=insufficient_permissions");
    }
  }, [claims.user_role, router]);

  // Show loading or access denied
  if (!["owner", "admin", "superadmin"].includes(claims.user_role)) {
    return <div className="p-6">Checking permissions...</div>;
  }

  const organizationName = claims.company_name || subdomain;

  return (
    <>
      <PageHeader title="Admin Dashboard" />
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="mx-auto w-full max-w-6xl space-y-6">
          {/* Admin Overview */}
          <Card className="bg-gradient-to-r from-card to-card/50 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Wrench className="h-6 w-6" />
                Organization Management
              </CardTitle>
              <CardDescription className="text-base">
                Advanced settings and administration tools for{" "}
                {organizationName}
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Management Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Link href="/org-settings/team">
              <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    User Management
                  </CardTitle>
                  <Users className="h-6 w-6 text-muted-foreground group-hover:scale-110 transition-transform" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Active</div>
                  <p className="text-xs text-muted-foreground">
                    Manage team members & roles
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/org-settings">
              <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Organization Settings
                  </CardTitle>
                  <Settings className="h-6 w-6 text-muted-foreground group-hover:scale-110 transition-transform" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Active</div>
                  <p className="text-xs text-muted-foreground">
                    Configure organization preferences
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/org-settings/billing">
              <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Billing & Plans
                  </CardTitle>
                  <CreditCard className="h-6 w-6 text-muted-foreground group-hover:scale-110 transition-transform" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Active</div>
                  <p className="text-xs text-muted-foreground">
                    Manage subscriptions and usage
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/admin/security">
              <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Security & Audit
                  </CardTitle>
                  <Shield className="h-6 w-6 text-muted-foreground group-hover:scale-110 transition-transform" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Enabled</div>
                  <p className="text-xs text-muted-foreground">
                    Review audit logs and security settings
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/admin/integrations">
              <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Integrations
                  </CardTitle>
                  <Plug className="h-6 w-6 text-muted-foreground group-hover:scale-110 transition-transform" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Available</div>
                  <p className="text-xs text-muted-foreground">
                    Connect to third-party services
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/admin/analytics">
              <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Analytics
                  </CardTitle>
                  <BarChart3 className="h-6 w-6 text-muted-foreground group-hover:scale-110 transition-transform" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Live</div>
                  <p className="text-xs text-muted-foreground">
                    Monitor usage and performance
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Quick Actions */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Perform common administrative tasks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <InviteUserDialog subdomain={subdomain} />
              <Link href="/org-settings/team" className="w-full block">
                <Button
                  className="w-full justify-start"
                  size="lg"
                  variant="outline"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Manage Team Members
                </Button>
              </Link>
              <Link href="/org-settings" className="w-full block">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  size="lg"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Organization Settings
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
