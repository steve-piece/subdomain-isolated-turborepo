// apps/protected/components/mfa-setup.tsx
"use client";

import type { ReactElement } from "react";
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
import { useToast } from "@workspace/ui/components/toast";
import { Skeleton } from "@workspace/ui/components/skeleton";

export function MFASetup(): ReactElement {
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
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-64" />
          </div>
        </div>
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    );
  }

  // MFA is already enabled
  if (mfaEnabled) {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-md bg-success-muted border border-success">
          <p className="text-sm text-success-foreground flex items-center">
            <span className="mr-2">✅</span>
            Your account is protected with authenticator app 2FA
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
    );
  }

  // Show QR code for scanning
  if (factorId && qrCodeUri) {
    return (
      <div className="space-y-4">
        {/* QR Code */}
        <div className="flex flex-col items-center space-y-4">
          <div className="p-4 bg-background rounded-lg border-2 border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrCodeUri} alt="MFA QR Code" className="w-48 h-48" />
          </div>

          {/* Manual entry option */}
          {secret && (
            <div className="w-full p-3 rounded-md bg-muted border border-border">
              <p className="text-xs text-muted-foreground mb-2">
                Can&apos;t scan? Enter this code manually:
              </p>
              <code className="text-sm font-mono bg-background px-2 py-1 rounded border select-all">
                {secret}
              </code>
            </div>
          )}

          {/* Recommended apps */}
          <div className="w-full p-3 rounded-md bg-info-muted border border-info-muted dark:bg-info-muted dark:border-info-muted">
            <p className="text-xs text-info-foreground dark:text-info-foreground mb-1 font-medium">
              Recommended Authenticator Apps:
            </p>
            <p className="text-xs text-info dark:text-info">
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
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
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
    );
  }

  // Initial setup prompt
  return (
    <Button
      onClick={handleEnroll}
      disabled={isEnrolling}
      className="w-full"
    >
      {isEnrolling ? "Generating QR Code..." : "Enable 2FA"}
    </Button>
  );
}
