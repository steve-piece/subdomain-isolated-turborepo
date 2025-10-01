// apps/protected/components/mfa-verify.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { challengeMFA, verifyMFA } from "@actions/mfa";
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

interface MFAVerifyProps {
  factorId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function MFAVerify({ factorId, onSuccess, onCancel }: MFAVerifyProps) {
  const [verificationCode, setVerificationCode] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const router = useRouter();
  const { addToast } = useToast();

  // Send challenge code on mount
  useEffect(() => {
    const sendChallenge = async () => {
      setIsSendingCode(true);
      const result = await challengeMFA(factorId);

      if (!result.success) {
        addToast({
          title: "Failed to Send Code",
          description: result.message,
          variant: "error",
        });
        setIsSendingCode(false);
        return;
      }

      setChallengeId(result.challengeId || null);
      addToast({
        title: "Verification Code Sent",
        description: "Please check your email for the 6-digit code",
        variant: "success",
      });
      setIsSendingCode(false);
    };

    sendChallenge();
  }, [addToast, factorId]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!challengeId) {
      addToast({
        title: "Error",
        description: "No verification session found. Please try again.",
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

    const result = await verifyMFA(factorId, challengeId, verificationCode);

    if (!result.success) {
      addToast({
        title: "Verification Failed",
        description: result.message,
        variant: "error",
      });
      setIsVerifying(false);
      setVerificationCode("");
      return;
    }

    addToast({
      title: "Verification Successful",
      description: "Redirecting you now...",
      variant: "success",
    });

    if (onSuccess) {
      onSuccess();
    } else {
      router.push("/dashboard");
    }
  };

  const handleResend = async () => {
    setIsSendingCode(true);
    setVerificationCode("");
    const result = await challengeMFA(factorId);

    if (!result.success) {
      addToast({
        title: "Failed to Resend",
        description: result.message,
        variant: "error",
      });
      setIsSendingCode(false);
      return;
    }

    setChallengeId(result.challengeId || null);
    addToast({
      title: "Code Resent",
      description: "A new verification code has been sent to your email",
      variant: "success",
    });
    setIsSendingCode(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Two-Factor Authentication</CardTitle>
        <CardDescription>
          Enter the 6-digit code sent to your email
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleVerify} className="space-y-4">
          {isSendingCode && !challengeId ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="mfa-code">Verification Code</Label>
                <Input
                  id="mfa-code"
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) =>
                    setVerificationCode(e.target.value.replace(/\D/g, ""))
                  }
                  className="text-center text-2xl tracking-widest"
                  autoComplete="off"
                  autoFocus
                />
              </div>

              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  onClick={handleResend}
                  disabled={isSendingCode}
                  className="text-sm"
                >
                  {isSendingCode ? "Sending..." : "Resend Code"}
                </Button>
              </div>

              <div className="flex gap-2">
                {onCancel && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={isVerifying || verificationCode.length !== 6}
                  className="flex-1"
                >
                  {isVerifying ? "Verifying..." : "Verify"}
                </Button>
              </div>
            </>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
