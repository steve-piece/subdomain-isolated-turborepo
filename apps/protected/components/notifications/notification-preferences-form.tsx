"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateNotificationPreferences } from "@actions/profile";
import { Button } from "@workspace/ui/components/button";
import { useToast } from "@workspace/ui/components/toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Bell, Mail, MessageSquare, AlertCircle } from "lucide-react";

interface NotificationPreferencesFormProps {
  initialPreferences?: {
    email_account_activity?: boolean;
    email_team_updates?: boolean;
    email_project_activity?: boolean;
    email_marketing?: boolean;
    inapp_push_enabled?: boolean;
    inapp_sound_enabled?: boolean;
    email_digest_frequency?: string;
    quiet_hours_enabled?: boolean;
    quiet_hours_start?: string;
    quiet_hours_end?: string;
  };
}

export function NotificationPreferencesForm({
  initialPreferences = {},
}: NotificationPreferencesFormProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Store initial values with defaults
  const initialValues = {
    email_account_activity: initialPreferences.email_account_activity ?? true,
    email_team_updates: initialPreferences.email_team_updates ?? true,
    email_project_activity: initialPreferences.email_project_activity ?? false,
    email_marketing: initialPreferences.email_marketing ?? false,
    inapp_push_enabled: initialPreferences.inapp_push_enabled ?? false,
    inapp_sound_enabled: initialPreferences.inapp_sound_enabled ?? true,
    email_digest_frequency:
      initialPreferences.email_digest_frequency ?? "realtime",
    quiet_hours_enabled: initialPreferences.quiet_hours_enabled ?? false,
    quiet_hours_start: initialPreferences.quiet_hours_start ?? "22:00",
    quiet_hours_end: initialPreferences.quiet_hours_end ?? "08:00",
  };

  const [prefs, setPrefs] = useState(initialValues);

  // Sync state when initialPreferences changes (after router.refresh())
  useEffect(() => {
    setPrefs(initialValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initialPreferences?.email_account_activity,
    initialPreferences?.email_team_updates,
    initialPreferences?.email_project_activity,
    initialPreferences?.email_marketing,
    initialPreferences?.inapp_push_enabled,
    initialPreferences?.inapp_sound_enabled,
    initialPreferences?.email_digest_frequency,
    initialPreferences?.quiet_hours_enabled,
    initialPreferences?.quiet_hours_start,
    initialPreferences?.quiet_hours_end,
  ]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await updateNotificationPreferences(prefs);

      if (result.success) {
        addToast({
          title: "Success",
          description: result.message,
          variant: "success",
        });
        // Refresh to get updated data from server
        router.refresh();
      } else {
        addToast({
          title: "Error",
          description: result.message,
          variant: "error",
        });
      }
    } catch {
      addToast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleCancel() {
    // Reset form to original values
    setPrefs(initialValues);
  }

  // Check if form has unsaved changes
  const hasChanges =
    prefs.email_account_activity !== initialValues.email_account_activity ||
    prefs.email_team_updates !== initialValues.email_team_updates ||
    prefs.email_project_activity !== initialValues.email_project_activity ||
    prefs.email_marketing !== initialValues.email_marketing ||
    prefs.inapp_push_enabled !== initialValues.inapp_push_enabled ||
    prefs.inapp_sound_enabled !== initialValues.inapp_sound_enabled ||
    prefs.email_digest_frequency !== initialValues.email_digest_frequency ||
    prefs.quiet_hours_enabled !== initialValues.quiet_hours_enabled ||
    prefs.quiet_hours_start !== initialValues.quiet_hours_start ||
    prefs.quiet_hours_end !== initialValues.quiet_hours_end;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Email Notifications */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            <CardTitle>Email Notifications</CardTitle>
          </div>
          <CardDescription>
            Choose what email notifications you&apos;d like to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 pr-9 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="account-emails" className="text-base">
                Account Activity
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive emails about account security, password changes, and
                login attempts
              </p>
            </div>
            <input
              type="checkbox"
              id="account-emails"
              className="h-5 w-5 shrink-0"
              checked={prefs.email_account_activity}
              onChange={(e) =>
                setPrefs({ ...prefs, email_account_activity: e.target.checked })
              }
            />
          </div>

          <div className="flex items-center justify-between p-4 pr-9 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="team-emails" className="text-base">
                Team Updates
              </Label>
              <p className="text-sm text-muted-foreground">
                Get notified when team members are added, removed, or change
                roles
              </p>
            </div>
            <input
              type="checkbox"
              id="team-emails"
              className="h-5 w-5 shrink-0"
              checked={prefs.email_team_updates}
              onChange={(e) =>
                setPrefs({ ...prefs, email_team_updates: e.target.checked })
              }
            />
          </div>

          <div className="flex items-center justify-between p-4 pr-9 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="project-emails" className="text-base">
                Project Activity
              </Label>
              <p className="text-sm text-muted-foreground">
                Updates about projects you&apos;re involved in
              </p>
            </div>
            <input
              type="checkbox"
              id="project-emails"
              className="h-5 w-5 shrink-0"
              checked={prefs.email_project_activity}
              onChange={(e) =>
                setPrefs({ ...prefs, email_project_activity: e.target.checked })
              }
            />
          </div>

          <div className="flex items-center justify-between p-4 pr-9 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="marketing-emails" className="text-base">
                Marketing & Updates
              </Label>
              <p className="text-sm text-muted-foreground">
                Product updates, tips, and occasional marketing messages
              </p>
            </div>
            <input
              type="checkbox"
              id="marketing-emails"
              className="h-5 w-5 shrink-0"
              checked={prefs.email_marketing}
              onChange={(e) =>
                setPrefs({ ...prefs, email_marketing: e.target.checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* In-App Notifications */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle>In-App Notifications</CardTitle>
          </div>
          <CardDescription>
            Manage how you receive notifications within the application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 pr-9 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="push-notifications" className="text-base">
                Push Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive browser push notifications for important updates
              </p>
            </div>
            <input
              type="checkbox"
              id="push-notifications"
              className="h-5 w-5 shrink-0"
              checked={prefs.inapp_push_enabled}
              onChange={(e) =>
                setPrefs({ ...prefs, inapp_push_enabled: e.target.checked })
              }
            />
          </div>

          <div className="flex items-center justify-between p-4 pr-9 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="sound-notifications" className="text-base">
                Sound Alerts
              </Label>
              <p className="text-sm text-muted-foreground">
                Play a sound when you receive a notification
              </p>
            </div>
            <input
              type="checkbox"
              id="sound-notifications"
              className="h-5 w-5 shrink-0"
              checked={prefs.inapp_sound_enabled}
              onChange={(e) =>
                setPrefs({ ...prefs, inapp_sound_enabled: e.target.checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Communication Preferences */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <CardTitle>Communication Preferences</CardTitle>
          </div>
          <CardDescription>
            Set how team members can communicate with you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="frequency">Email Digest Frequency</Label>
            <Select
              value={prefs.email_digest_frequency}
              onValueChange={(value) =>
                setPrefs({ ...prefs, email_digest_frequency: value })
              }
            >
              <SelectTrigger id="frequency">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] overflow-y-auto">
                <SelectItem value="realtime">Real-time (as they happen)</SelectItem>
                <SelectItem value="daily">Daily digest</SelectItem>
                <SelectItem value="weekly">Weekly digest</SelectItem>
                <SelectItem value="never">Never</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Choose how often you want to receive email summaries
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <CardTitle>Quiet Hours</CardTitle>
          </div>
          <CardDescription>
            Set times when you don&apos;t want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 pr-9 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="quiet-hours-enabled" className="text-base">
                Enable Quiet Hours
              </Label>
              <p className="text-sm text-muted-foreground">
                Silence non-critical notifications during specified times
              </p>
            </div>
            <input
              type="checkbox"
              id="quiet-hours-enabled"
              className="h-5 w-5 shrink-0"
              checked={prefs.quiet_hours_enabled}
              onChange={(e) =>
                setPrefs({ ...prefs, quiet_hours_enabled: e.target.checked })
              }
            />
          </div>

          <div
            className={`grid gap-4 md:grid-cols-2 ${
              !prefs.quiet_hours_enabled ? "opacity-50" : ""
            }`}
          >
            <div className="space-y-2">
              <Label htmlFor="quiet-start">Start Time</Label>
              <input
                type="time"
                id="quiet-start"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={prefs.quiet_hours_start}
                disabled={!prefs.quiet_hours_enabled}
                onChange={(e) =>
                  setPrefs({ ...prefs, quiet_hours_start: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quiet-end">End Time</Label>
              <input
                type="time"
                id="quiet-end"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={prefs.quiet_hours_end}
                disabled={!prefs.quiet_hours_enabled}
                onChange={(e) =>
                  setPrefs({ ...prefs, quiet_hours_end: e.target.value })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Changes */}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={isLoading || !hasChanges}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || !hasChanges}>
          {isLoading ? "Saving..." : "Save Preferences"}
        </Button>
      </div>
    </form>
  );
}
