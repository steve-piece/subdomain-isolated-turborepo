// apps/protected/components/mfa-setup.tsx
"use client";

import { useState } from "react";
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

export function MFASetup() {
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [enrolledFactorId, setEnrolledFactorId] = useState<string | null>(null);
  const { addToast } = useToast();

  // Check if MFA is already enabled
  useState(() => {
    const checkMFA = async () => {
      const result = await getMFAFactors();
      if (
        result.success &&
        result.factors &&
        result.factors.some((f) => f.status === "verified")
      ) {
        setMfaEnabled(true);
        const verifiedFactor = result.factors.find(
          (f) => f.status === "verified"
        );
        if (verifiedFactor) {
          setEnrolledFactorId(verifiedFactor.id);
        }
      }
    };
    checkMFA();
  });

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
    addToast({
      title: "Verification Code Sent",
      description: "Please check your email for the 6-digit code",
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
      "Are you sure you want to disable two-factor authentication?"
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

  if (mfaEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Two-Factor Authentication</CardTitle>
          <CardDescription>
            Email-based 2FA is currently enabled on your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-3 rounded-md bg-green-50 border border-green-200">
              <p className="text-sm text-green-700 flex items-center">
                <span className="mr-2">✅</span>
                Your account is protected with two-factor authentication
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

  if (factorId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verify Your Email</CardTitle>
          <CardDescription>
            Enter the 6-digit code sent to your email
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Verification Code</Label>
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
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Two-Factor Authentication</CardTitle>
        <CardDescription>
          Add an extra layer of security to your account with email-based 2FA
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-3 rounded-md bg-blue-50 border border-blue-200">
            <p className="text-sm text-blue-700">
              When enabled, you'll receive a 6-digit code via email each time
              you sign in.
            </p>
          </div>
          <Button
            onClick={handleEnroll}
            disabled={isEnrolling}
            className="w-full"
          >
            {isEnrolling ? "Setting up..." : "Enable 2FA"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
