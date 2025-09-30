"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateNotificationPreferences } from "@/app/actions";
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

  const [prefs, setPrefs] = useState({
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
  });

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

  function handleReset() {
    setPrefs({
      email_account_activity: true,
      email_team_updates: true,
      email_project_activity: false,
      email_marketing: false,
      inapp_push_enabled: false,
      inapp_sound_enabled: true,
      email_digest_frequency: "realtime",
      quiet_hours_enabled: false,
      quiet_hours_start: "22:00",
      quiet_hours_end: "08:00",
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Email Notifications */}
      <Card>
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
          <div className="flex items-center justify-between p-4 border rounded-lg">
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
              className="h-4 w-4"
              checked={prefs.email_account_activity}
              onChange={(e) =>
                setPrefs({ ...prefs, email_account_activity: e.target.checked })
              }
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
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
              className="h-4 w-4"
              checked={prefs.email_team_updates}
              onChange={(e) =>
                setPrefs({ ...prefs, email_team_updates: e.target.checked })
              }
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
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
              className="h-4 w-4"
              checked={prefs.email_project_activity}
              onChange={(e) =>
                setPrefs({ ...prefs, email_project_activity: e.target.checked })
              }
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
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
              className="h-4 w-4"
              checked={prefs.email_marketing}
              onChange={(e) =>
                setPrefs({ ...prefs, email_marketing: e.target.checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* In-App Notifications */}
      <Card>
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
          <div className="flex items-center justify-between p-4 border rounded-lg">
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
              className="h-4 w-4"
              checked={prefs.inapp_push_enabled}
              onChange={(e) =>
                setPrefs({ ...prefs, inapp_push_enabled: e.target.checked })
              }
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
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
              className="h-4 w-4"
              checked={prefs.inapp_sound_enabled}
              onChange={(e) =>
                setPrefs({ ...prefs, inapp_sound_enabled: e.target.checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Communication Preferences */}
      <Card>
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
            <select
              id="frequency"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={prefs.email_digest_frequency}
              onChange={(e) =>
                setPrefs({ ...prefs, email_digest_frequency: e.target.value })
              }
            >
              <option value="realtime">Real-time (as they happen)</option>
              <option value="daily">Daily digest</option>
              <option value="weekly">Weekly digest</option>
              <option value="never">Never</option>
            </select>
            <p className="text-xs text-muted-foreground">
              Choose how often you want to receive email summaries
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
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
          <div className="flex items-center justify-between p-4 border rounded-lg">
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
              className="h-4 w-4"
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
          onClick={handleReset}
          disabled={isLoading}
        >
          Reset to Defaults
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Preferences"}
        </Button>
      </div>
    </form>
  );
}
