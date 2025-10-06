"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { Input } from "@workspace/ui/components/input";
import { Switch } from "@workspace/ui/components/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Settings, Loader2, Save, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import {
  getTeamSettings,
  updateTeamSettings,
  type TeamSettings,
} from "@/app/actions/organization/team-settings";
import { useTenantClaims } from "@/lib/contexts/tenant-claims-context";

export function TeamSettingsConfig() {
  const router = useRouter();
  const claims = useTenantClaims();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [settings, setSettings] = useState<TeamSettings>({
    allow_member_invites: false,
    require_admin_approval: false,
    auto_assign_default_role: "member",
    max_team_size: null,
    allow_guest_access: false,
    guest_link_expiry_days: 30,
  });

  // Fetch settings on mount
  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await getTeamSettings(claims.org_id);
        if (response.success && response.settings) {
          setSettings(response.settings);
        } else {
          setError(response.message || "Failed to load team settings");
        }
      } catch {
        setError("An unexpected error occurred");
      } finally {
        setIsLoading(false);
      }
    }

    fetchSettings();
  }, [claims.org_id]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await updateTeamSettings(claims.org_id, settings);

      if (response.success) {
        setSuccess("Team settings updated successfully!");
        setTimeout(() => setSuccess(null), 3000);
        router.refresh();
      } else {
        setError(response.message || "Failed to update team settings");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2">Loading team settings...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Team Settings
        </CardTitle>
        <CardDescription>
          Configure how your team invites and manages members
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Member Invitations */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="allow-member-invites">
                Allow Members to Invite
              </Label>
              <p className="text-sm text-muted-foreground">
                Let team members invite others (otherwise only admins can
                invite)
              </p>
            </div>
            <Switch
              id="allow-member-invites"
              checked={settings.allow_member_invites}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, allow_member_invites: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="require-admin-approval">
                Require Admin Approval
              </Label>
              <p className="text-sm text-muted-foreground">
                Invitations must be approved by an admin before users can join
              </p>
            </div>
            <Switch
              id="require-admin-approval"
              checked={settings.require_admin_approval}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, require_admin_approval: checked })
              }
            />
          </div>
        </div>

        <div className="border-t pt-4" />

        {/* Default Role */}
        <div className="space-y-2">
          <Label htmlFor="default-role">Default Role for New Members</Label>
          <Select
            value={settings.auto_assign_default_role}
            onValueChange={(value: "member" | "view-only") =>
              setSettings({ ...settings, auto_assign_default_role: value })
            }
          >
            <SelectTrigger id="default-role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="view-only">View-Only</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Used when no specific role is assigned during invitation
          </p>
        </div>

        <div className="border-t pt-4" />

        {/* Team Size Limit */}
        <div className="space-y-2">
          <Label htmlFor="max-team-size">Maximum Team Size</Label>
          <div className="flex items-center gap-2">
            <Input
              id="max-team-size"
              type="number"
              min="1"
              placeholder="Unlimited"
              value={settings.max_team_size || ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  max_team_size: e.target.value
                    ? parseInt(e.target.value, 10)
                    : null,
                })
              }
            />
            {settings.max_team_size && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setSettings({ ...settings, max_team_size: null })
                }
              >
                Clear
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Leave empty for unlimited team members (subject to your subscription
            tier)
          </p>
        </div>

        <div className="border-t pt-4" />

        {/* Guest Access (Future Feature) */}
        <div className="space-y-4 opacity-50">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="allow-guest-access">
                Allow Guest Access (Coming Soon)
              </Label>
              <p className="text-sm text-muted-foreground">
                Enable temporary guest links for external collaborators
              </p>
            </div>
            <Switch
              id="allow-guest-access"
              checked={settings.allow_guest_access}
              disabled={true}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="guest-expiry">Guest Link Expiry (Days)</Label>
            <Input
              id="guest-expiry"
              type="number"
              min="1"
              max="365"
              value={settings.guest_link_expiry_days}
              disabled={true}
            />
          </div>
        </div>

        <div className="border-t pt-4" />

        {/* Save Button */}
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => router.refresh()}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
