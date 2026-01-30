// components/security/security-wrapper.tsx
"use client";

import { useTenantClaims } from "@/lib/contexts/tenant-claims-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { MFASetup } from "@/components/auth/mfa-setup";
import { AuditLogDialog } from "@/components/security/audit-log-dialog";
import { ChangePasswordDialog } from "@/components/security/change-password-dialog";
import { SecuritySummaryCard } from "@/components/security/security-summary";
import { Key, Smartphone, History, Trash2 } from "lucide-react";
import { Button } from "@workspace/ui/components/button";

interface SecurityWrapperProps {
  subdomain: string;
  lastSignIn: string;
}

export function SecurityWrapper({ lastSignIn }: SecurityWrapperProps) {
  useTenantClaims();

  return (
    <div className="space-y-6">
      {/* Security Summary */}
      <SecuritySummaryCard showFullDetails={true} />

      {/* Password Section */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            <CardTitle className="text-lg">Password</CardTitle>
          </div>
          <CardDescription>
            Change your password to keep your account secure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordDialog />
        </CardContent>
      </Card>

      {/* MFA Section */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            <CardTitle className="text-lg">
              Two-Factor Authentication
            </CardTitle>
          </div>
          <CardDescription>
            Add an extra layer of security with an authenticator app
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MFASetup />
        </CardContent>
      </Card>

      {/* Activity Section */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5" />
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </div>
          <CardDescription>
            Monitor your account security and login history
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium">Last Sign In</p>
              <p className="text-xs text-muted-foreground">{lastSignIn}</p>
            </div>
          </div>
          <AuditLogDialog />
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-none shadow-sm bg-destructive/5 py-1.5">
        <CardContent className="pt-[18px] pb-[18px]">
          <div className="flex flex-col gap-4 items-center">
            <div>
              <p className="text-sm text-muted-foreground leading-relaxed text-center">
                Permanently delete your account and all associated data.
                This action cannot be undone.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="w-fit"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
