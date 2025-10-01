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
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import { MFASetup } from "@/components/auth/mfa-setup";
import { Shield, Key, Smartphone, History } from "lucide-react";

interface SecurityWrapperProps {
  subdomain: string;
  lastSignIn: string;
}

export function SecurityWrapper({
  subdomain,
  lastSignIn,
}: SecurityWrapperProps) {
  const claims = useTenantClaims();

  return (
    <div className="space-y-6">
      {/* Security Overview */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Security Settings</CardTitle>
          </div>
          <CardDescription>
            Manage your account security and authentication methods
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Password Section */}
      <Card>
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
          <Link href="/auth/update-password">
            <Button>Change Password</Button>
          </Link>
        </CardContent>
      </Card>

      {/* MFA Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            <CardTitle className="text-lg">Two-Factor Authentication</CardTitle>
          </div>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MFASetup />
        </CardContent>
      </Card>

      {/* Activity Section */}
      <Card>
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
          <Link href="/security/audit-log">
            <Button variant="outline" className="w-full">
              View Full Audit Log
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
