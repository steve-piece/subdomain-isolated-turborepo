// components/security/security-summary.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Loader2, Shield, Clock, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { getUserSecuritySummary, type SecuritySummary } from "@/app/actions/security/security-summary";
import { formatDistanceToNow } from "date-fns";

interface SecuritySummaryProps {
  showFullDetails?: boolean;
}

export function SecuritySummaryCard({ showFullDetails = false }: SecuritySummaryProps) {
  const [summary, setSummary] = useState<SecuritySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getUserSecuritySummary();
        if (result.success && result.data) {
          setSummary(result.data);
        } else {
          setError(result.message || "Failed to fetch security summary");
        }
      } catch {
        setError("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  if (loading) {
    return (
      <Card className="border-none shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle className="text-lg">Security Summary</CardTitle>
          </div>
          <CardDescription>Your account security overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !summary) {
    return (
      <Card className="border-none shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle className="text-lg">Security Summary</CardTitle>
          </div>
          <CardDescription>Your account security overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-md bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive">{error || "No data available"}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return "Unknown";
    }
  };

  return (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <CardTitle className="text-lg">Security Summary</CardTitle>
        </div>
        <CardDescription>Your account security overview</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* MFA Status */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              {summary.mfaEnabled ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : (
                <XCircle className="h-5 w-5 text-warning" />
              )}
              <div>
                <p className="text-sm font-medium">Two-Factor Authentication</p>
                {summary.mfaEnabled && summary.mfaEnrolledAt && (
                  <p className="text-xs text-muted-foreground">
                    Enabled {formatDate(summary.mfaEnrolledAt)}
                  </p>
                )}
              </div>
            </div>
            <Badge variant={summary.mfaEnabled ? "default" : "secondary"}>
              {summary.mfaEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>

          {/* Last Password Change */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Last Password Change</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(summary.lastPasswordChange)}
                </p>
              </div>
            </div>
          </div>

          {showFullDetails && (
            <>
              {/* Last Login */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Last Login</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(summary.lastLoginDate)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Recent Activity (7 days)</p>
                    <p className="text-xs text-muted-foreground">
                      {summary.recentEventsCount} security {summary.recentEventsCount === 1 ? 'event' : 'events'}
                    </p>
                  </div>
                </div>
                <Badge variant="outline">{summary.recentEventsCount}</Badge>
              </div>

              {/* Critical Alerts */}
              {summary.criticalAlertsCount > 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <div>
                      <p className="text-sm font-medium text-destructive">
                        Critical Alerts
                      </p>
                      <p className="text-xs text-destructive/80">
                        {summary.criticalAlertsCount} critical security {summary.criticalAlertsCount === 1 ? 'event' : 'events'}
                      </p>
                    </div>
                  </div>
                  <Badge variant="destructive">{summary.criticalAlertsCount}</Badge>
                </div>
              )}

              {/* Total Events */}
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Security Events</span>
                  <span className="font-medium">{summary.totalSecurityEvents}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
