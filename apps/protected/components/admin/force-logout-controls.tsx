// components/admin/force-logout-controls.tsx
"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import {
  forceLogoutOrganization,
  clearOrganizationForceLogout,
} from "@/app/actions/admin/force-logout";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { AlertCircle, LogOut, Shield, CheckCircle2 } from "lucide-react";
import { useTenantClaims } from "@/lib/contexts/tenant-claims-context";

export function ForceLogoutControls(): ReactElement | null {
  const claims = useTenantClaims();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Only show to owners, admins, and superadmins
  if (!["owner", "admin", "superadmin"].includes(claims.user_role)) {
    return null;
  }

  const handleForceLogoutAll = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await forceLogoutOrganization();

      if (response.success) {
        setResult({
          type: "success",
          message: response.message,
        });
        setIsDialogOpen(false);
      } else {
        setResult({
          type: "error",
          message: response.message,
        });
      }
    } catch {
      setResult({
        type: "error",
        message: "An unexpected error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearForceLogout = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await clearOrganizationForceLogout();

      if (response.success) {
        setResult({
          type: "success",
          message: response.message,
        });
      } else {
        setResult({
          type: "error",
          message: response.message,
        });
      }
    } catch {
      setResult({
        type: "error",
        message: "An unexpected error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-destructive" />
          <CardTitle>Force Logout Controls</CardTitle>
        </div>
        <CardDescription>
          Manage user sessions across your organization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Explanation Alert */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>When to use force logout</AlertTitle>
          <AlertDescription className="space-y-2 mt-2">
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>After making significant permission changes</li>
              <li>During security incidents or suspicious activity</li>
              <li>After database migrations affecting authentication</li>
              <li>When organization settings change dramatically</li>
            </ul>
            <p className="text-sm mt-2">
              <strong>Note:</strong> Users will be automatically logged out on
              their next page load and asked to log in again.
            </p>
          </AlertDescription>
        </Alert>

        {/* Auto-Logout Info */}
        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
          <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertTitle className="text-blue-900 dark:text-blue-100">
            Auto-Logout Active
          </AlertTitle>
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            Users are automatically logged out when:
            <ul className="list-disc list-inside space-y-1 text-sm mt-2">
              <li>Their role or permissions are changed</li>
              <li>Organization-wide permissions are updated</li>
              <li>You trigger a manual force logout below</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Result Message */}
        {result && (
          <Alert
            variant={result.type === "success" ? "default" : "destructive"}
            className={
              result.type === "success"
                ? "border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800"
                : ""
            }
          >
            {result.type === "success" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertTitle>
              {result.type === "success" ? "Success" : "Error"}
            </AlertTitle>
            <AlertDescription>{result.message}</AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {/* Force Logout All Users */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" className="flex-1">
                <LogOut className="h-4 w-4 mr-2" />
                Force Logout All Users
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Force Logout All Users?</DialogTitle>
                <DialogDescription>
                  This will immediately log out all users in your organization
                  on their next page load. They will need to log in again to
                  access the application.
                </DialogDescription>
              </DialogHeader>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  This action cannot be undone. All active sessions will be
                  terminated. Use this only when necessary.
                </AlertDescription>
              </Alert>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleForceLogoutAll}
                  disabled={isLoading}
                >
                  {isLoading ? "Processing..." : "Yes, Force Logout All"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Clear Force Logout (Only for owners) */}
          {["owner", "superadmin"].includes(claims.user_role) && (
            <Button
              variant="outline"
              onClick={handleClearForceLogout}
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : "Clear Force Logout"}
            </Button>
          )}
        </div>

        {/* Additional Info */}
        <p className="text-xs text-muted-foreground">
          {claims.user_role === "admin"
            ? "As an admin, you can force logout all users. Only owners can clear force logout restrictions."
            : "As an owner, you have full control over force logout settings."}
        </p>
      </CardContent>
    </Card>
  );
}
