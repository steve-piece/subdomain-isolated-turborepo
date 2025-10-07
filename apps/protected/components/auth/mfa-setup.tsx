// apps/protected/components/mfa-setup.tsx
"use client";

import { useState, useEffect } from "react";
import {
  enrollMFA,
  verifyMFAEnrollment,
  getMFAFactors,
  unenrollMFA,
} from "@actions/mfa";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@workspace/ui/components/card";
import { useToast } from "@workspace/ui/components/toast";
import { Smartphone } from "lucide-react";

export function MFASetup() {
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCodeUri, setQrCodeUri] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [enrolledFactorId, setEnrolledFactorId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { addToast } = useToast();

  // Check if MFA is already enabled
  useEffect(() => {
    const checkMFA = async () => {
      try {
        const result = await getMFAFactors();
        if (
          result.success &&
          result.factors &&
          result.factors.some((f) => f.status === "verified")
        ) {
          setMfaEnabled(true);
          const verifiedFactor = result.factors.find(
            (f) => f.status === "verified",
          );
          if (verifiedFactor) {
            setEnrolledFactorId(verifiedFactor.id);
          }
        }
      } catch (error) {
        console.error("Error checking MFA status:", error);
      } finally {
        setIsLoading(false);
      }
    };
    checkMFA();
  }, []);

  const handleEnroll = async () => {
    setIsEnrolling(true);

    const result = await enrollMFA();

    if (!result.success) {
      addToast({
        title: "Enrollment Failed",
        description: result.message,
        variant: "error",
      });
      setIsEnrolling(false);
      return;
    }

    setFactorId(result.factorId || null);
    setQrCodeUri(result.qrCode || null);
    setSecret(result.secret || null);
    addToast({
      title: "QR Code Generated",
      description: "Scan the QR code with your authenticator app",
      variant: "success",
    });
    setIsEnrolling(false);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!factorId) {
      addToast({
        title: "Error",
        description: "No enrollment session found",
        variant: "error",
      });
      return;
    }

    if (verificationCode.length !== 6) {
      addToast({
        title: "Invalid Code",
        description: "Please enter a 6-digit code",
        variant: "error",
      });
      return;
    }

    setIsVerifying(true);

    const result = await verifyMFAEnrollment(factorId, verificationCode);

    if (!result.success) {
      addToast({
        title: "Verification Failed",
        description: result.message,
        variant: "error",
      });
      setIsVerifying(false);
      return;
    }

    addToast({
      title: "2FA Enabled",
      description: "Two-factor authentication is now active on your account",
      variant: "success",
      duration: 5000,
    });

    setMfaEnabled(true);
    setEnrolledFactorId(factorId);
    setFactorId(null);
    setVerificationCode("");
    setIsVerifying(false);
  };

  const handleDisable = async () => {
    if (!enrolledFactorId) return;

    const confirmed = window.confirm(
      "Are you sure you want to disable two-factor authentication?",
    );
    if (!confirmed) return;

    const result = await unenrollMFA(enrolledFactorId);

    if (!result.success) {
      addToast({
        title: "Failed to Disable",
        description: result.message,
        variant: "error",
      });
      return;
    }

    addToast({
      title: "2FA Disabled",
      description: "Two-factor authentication has been disabled",
      variant: "success",
    });

    setMfaEnabled(false);
    setEnrolledFactorId(null);
  };

  // Show loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Two-Factor Authentication</CardTitle>
          <CardDescription>
            Preparing your authentication settings...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-muted rounded-full animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse w-48" />
                <div className="h-3 bg-muted rounded animate-pulse w-64" />
              </div>
            </div>
            <div className="h-32 bg-muted rounded-lg animate-pulse" />
            <div className="h-10 bg-muted rounded-lg animate-pulse w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // MFA is already enabled
  if (mfaEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            TOTP authenticator app 2FA is currently enabled on your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 rounded-md bg-green-50 border border-green-200 dark:bg-green-950 dark:border-green-800">
              <p className="text-sm text-green-700 dark:text-green-300 flex items-center">
                <span className="mr-2">✅</span>
                Your account is protected with authenticator app 2FA
              </p>
            </div>
            <div className="p-3 rounded-md bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:border-slate-700">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                <strong>Note:</strong> This is TOTP-based 2FA which is free on
                all Supabase plans. You use an authenticator app (Google
                Authenticator, Authy, 1Password, etc.) to generate codes.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={handleDisable}
              className="w-full"
            >
              Disable 2FA
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show QR code for scanning
  if (factorId && qrCodeUri) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scan QR Code</CardTitle>
          <CardDescription>
            Use your authenticator app to scan the QR code below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* QR Code */}
            <div className="flex flex-col items-center space-y-4">
              <div className="p-4 bg-white rounded-lg border-2 border-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrCodeUri} alt="MFA QR Code" className="w-48 h-48" />
              </div>

              {/* Manual entry option */}
              {secret && (
                <div className="w-full p-3 rounded-md bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:border-slate-700">
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                    Can&apos;t scan? Enter this code manually:
                  </p>
                  <code className="text-sm font-mono bg-white dark:bg-slate-800 px-2 py-1 rounded border select-all">
                    {secret}
                  </code>
                </div>
              )}

              {/* Recommended apps */}
              <div className="w-full p-3 rounded-md bg-blue-50 border border-blue-200 dark:bg-blue-950 dark:border-blue-800">
                <p className="text-xs text-blue-700 dark:text-blue-300 mb-1 font-medium">
                  Recommended Authenticator Apps:
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  • Google Authenticator • Authy • 1Password • Microsoft
                  Authenticator
                </p>
              </div>
            </div>

            {/* Verification form */}
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Enter 6-digit code from your app</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) =>
                    setVerificationCode(e.target.value.replace(/\D/g, ""))
                  }
                  className="text-center text-2xl tracking-widest"
                  autoComplete="off"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFactorId(null);
                    setQrCodeUri(null);
                    setSecret(null);
                    setVerificationCode("");
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isVerifying || verificationCode.length !== 6}
                  className="flex-1"
                >
                  {isVerifying ? "Verifying..." : "Verify & Enable"}
                </Button>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Initial setup prompt
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>
          Add an extra layer of security with an authenticator app (FREE)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-4 rounded-md bg-blue-50 border border-blue-200 dark:bg-blue-950 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
              <strong>How it works:</strong>
            </p>
            <ol className="text-sm text-blue-600 dark:text-blue-400 space-y-1 list-decimal list-inside">
              <li>Install an authenticator app on your phone</li>
              <li>Scan the QR code we&apos;ll provide</li>
              <li>Enter the 6-digit code from your app to verify</li>
              <li>Use the app to generate codes when logging in</li>
            </ol>
          </div>

          <div className="p-3 rounded-md bg-green-50 border border-green-200 dark:bg-green-950 dark:border-green-800">
            <p className="text-xs text-green-700 dark:text-green-300">
              ✅ <strong>Free:</strong> TOTP authenticator 2FA is included in
              all Supabase plans at no extra cost.
            </p>
          </div>

          <Button
            onClick={handleEnroll}
            disabled={isEnrolling}
            className="w-full"
          >
            {isEnrolling ? "Generating QR Code..." : "Enable 2FA"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
