// apps/protected/app/s/[subdomain]/(org-settings)/org-settings/page.tsx
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
import { Label } from "@workspace/ui/components/label";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { Building2, Globe, MapPin, Calendar } from "lucide-react";
import RequireTenantAuth from "@/components/require-tenant-auth";

export default async function OrgSettingsPage({
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

  // Check if user has permission to view org settings
  const allowedRoles = ["owner", "admin", "superadmin"];
  if (!allowedRoles.includes(userRole)) {
    redirect("/dashboard?error=unauthorized");
  }

  return (
    <div className="space-y-6">
      {/* Organization Identity */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            <CardTitle>Organization Identity</CardTitle>
          </div>
          <CardDescription>
            Manage your organization's public profile and branding
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization Name</Label>
              <Input
                id="org-name"
                defaultValue={organizationName}
                placeholder="Enter organization name"
              />
              <p className="text-xs text-muted-foreground">
                This is how your organization appears to team members
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subdomain">Subdomain</Label>
              <div className="flex gap-2">
                <Input
                  id="subdomain"
                  defaultValue={subdomain}
                  disabled
                  className="bg-muted font-mono"
                />
                <span className="flex items-center text-sm text-muted-foreground">
                  .{process.env.NEXT_PUBLIC_APP_DOMAIN}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Contact support to change your subdomain
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Describe your organization..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" type="button">
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Organization Logo */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Logo</CardTitle>
          <CardDescription>
            Upload a logo to personalize your workspace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="h-24 w-24 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
              <span className="text-3xl font-bold text-primary-foreground">
                {organizationName?.charAt(0)?.toUpperCase() || "O"}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Upload Logo
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive">
                  Remove
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                SVG, PNG or JPG. Recommended size: 400x400px.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            <CardTitle>Contact Information</CardTitle>
          </div>
          <CardDescription>
            How people can reach your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="support-email">Support Email</Label>
                <Input
                  id="support-email"
                  type="email"
                  placeholder="support@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Business Address</Label>
              <Input id="address" placeholder="123 Main St, City, Country" />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" type="button">
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Organization Metadata */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <CardTitle>Organization Details</CardTitle>
          </div>
          <CardDescription>
            Additional information about your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm font-medium">Organization ID</span>
              <span className="text-sm text-muted-foreground font-mono">
                {claims.claims.org_id || "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm font-medium">Created</span>
              <span className="text-sm text-muted-foreground">
                {user.created_at
                  ? new Date(user.created_at).toLocaleDateString()
                  : "Unknown"}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium">Current Plan</span>
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                Free Trial
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions that affect your entire organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg border-destructive/50">
            <div>
              <h4 className="text-sm font-medium">Transfer Ownership</h4>
              <p className="text-sm text-muted-foreground">
                Transfer organization ownership to another admin
              </p>
            </div>
            <Button variant="outline" size="sm">
              Transfer
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg border-destructive/50">
            <div>
              <h4 className="text-sm font-medium">Delete Organization</h4>
              <p className="text-sm text-muted-foreground">
                Permanently delete this organization and all its data
              </p>
            </div>
            <Button variant="destructive" size="sm">
              Delete Organization
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
