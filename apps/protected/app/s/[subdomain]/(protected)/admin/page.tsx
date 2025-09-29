// apps/protected/app/s/[subdomain]/(protected)/admin/page.tsx
import RequireTenantAuth from "@/components/require-tenant-auth";
import { InviteUserDialog } from "@/components/invite-user-dialog";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import Link from "next/link";

export default async function AdminPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;

  return (
    <RequireTenantAuth
      subdomain={subdomain}
      allowedRoles={["owner", "admin", "superadmin"]}
    >
      {() => (
        <div className="flex h-screen w-full flex-col">
          <header className="border-b bg-gradient-to-r from-background to-muted/20 px-6 py-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  ⚙️ Admin Dashboard
                </h1>
                <p className="text-muted-foreground mt-1 flex items-center">
                  <span className="mr-2">🏢</span>
                  {subdomain} administration
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link href="/">
                  <Button variant="outline" size="sm">
                    ← Back to Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </header>

          <main className="flex-1 p-6 bg-gradient-to-br from-background to-muted/30">
            <div className="mx-auto max-w-6xl space-y-6">
              {/* Admin Overview */}
              <Card className="bg-gradient-to-r from-card to-card/50 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    🔧 Organization Management
                  </CardTitle>
                  <CardDescription className="text-base">
                    Advanced settings and administration tools for {subdomain}
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Management Cards */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      User Management
                    </CardTitle>
                    <div className="text-2xl group-hover:scale-110 transition-transform">
                      👥
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">0</div>
                    <p className="text-xs text-muted-foreground">
                      Manage team members & roles
                    </p>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Organization Settings
                    </CardTitle>
                    <div className="text-2xl group-hover:scale-110 transition-transform">
                      ⚙️
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">-</div>
                    <p className="text-xs text-muted-foreground">
                      Configure organization preferences
                    </p>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Billing & Plans
                    </CardTitle>
                    <div className="text-2xl group-hover:scale-110 transition-transform">
                      💳
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">Free</div>
                    <p className="text-xs text-muted-foreground">
                      Manage subscription & billing
                    </p>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Security
                    </CardTitle>
                    <div className="text-2xl group-hover:scale-110 transition-transform">
                      🔐
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">✓</div>
                    <p className="text-xs text-muted-foreground">
                      Security settings & audit logs
                    </p>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Integrations
                    </CardTitle>
                    <div className="text-2xl group-hover:scale-110 transition-transform">
                      🔌
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">0</div>
                    <p className="text-xs text-muted-foreground">
                      Third-party integrations
                    </p>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Analytics
                    </CardTitle>
                    <div className="text-2xl group-hover:scale-110 transition-transform">
                      📊
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">-</div>
                    <p className="text-xs text-muted-foreground">
                      Usage statistics & reports
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Quick Admin Actions */}
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      ⚡ Quick Admin Actions
                    </CardTitle>
                    <CardDescription>
                      Common administrative tasks
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <InviteUserDialog subdomain={subdomain} />
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      size="lg"
                    >
                      <span className="mr-2">📧</span>
                      Send Team Notification
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      size="lg"
                    >
                      <span className="mr-2">🔄</span>
                      Export Organization Data
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      size="lg"
                    >
                      <span className="mr-2">📋</span>
                      Generate Usage Report
                    </Button>
                  </CardContent>
                </Card>

                {/* System Status */}
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      🟢 System Status
                    </CardTitle>
                    <CardDescription>
                      Current system health and alerts
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">API Status</span>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        ✓ Operational
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Database</span>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        ✓ Healthy
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Storage</span>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        ✓ Available
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Last Backup</span>
                      <span className="text-xs text-muted-foreground">
                        2 hours ago
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        </div>
      )}
    </RequireTenantAuth>
  );
}
