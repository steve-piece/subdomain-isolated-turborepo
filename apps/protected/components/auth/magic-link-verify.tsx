// apps/protected/components/magic-link-verify.tsx
"use client";

import type { ReactElement } from "react";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@workspace/supabase/client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import type { EmailOtpType } from "@supabase/supabase-js";

interface MagicLinkVerifyProps {
  type: "magiclink" | "reauthenticate";
}

export function MagicLinkVerify({ type }: MagicLinkVerifyProps): ReactElement {
  const [status, setStatus] = useState<
    "verifying" | "success" | "error" | "expired"
  >("verifying");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const router = useRouter();

  // Create client once to catch early auth events
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const verifyMagicLink = async () => {
      try {
        if (typeof window === "undefined") return;

        const params = new URLSearchParams(window.location.search);
        const tokenHash = params.get("token_hash");
        const otpType = params.get("type") as EmailOtpType | null;

        if (!tokenHash || !otpType) {
          setStatus("error");
          setErrorMessage("Invalid or incomplete verification link");
          return;
        }

        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: otpType as EmailOtpType,
        });

        if (verifyError) {
          if (
            verifyError.message.toLowerCase().includes("expired") ||
            verifyError.message.toLowerCase().includes("invalid")
          ) {
            setStatus("expired");
          } else {
            setStatus("error");
            setErrorMessage(verifyError.message);
          }
          return;
        }

        if (data.session) {
          setStatus("success");

          // Redirect based on type
          setTimeout(() => {
            if (type === "reauthenticate") {
              router.push("/dashboard?reauthenticated=true");
            } else {
              router.push("/dashboard");
            }
          }, 1500);
          return;
        }

        // No session established
        setStatus("error");
        setErrorMessage("Failed to establish session");
      } catch (error) {
        setStatus("error");
        setErrorMessage(
          error instanceof Error ? error.message : "Unknown error",
        );
      }
    };

    verifyMagicLink();
  }, [type, router, supabase]);

  if (status === "verifying") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Verifying...</CardTitle>
          <CardDescription>
            {type === "magiclink"
              ? "Logging you in with magic link"
              : "Reauthenticating your session"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Please wait while we verify your link...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (status === "success") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl text-success">Success!</CardTitle>
          <CardDescription>
            {type === "magiclink"
              ? "You've been logged in successfully"
              : "Session reauthenticated"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-3 rounded-md bg-success-muted border border-success-muted">
              <p className="text-sm text-success-foreground flex items-center">
                <span className="mr-2">✅</span>
                Redirecting you to the dashboard...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === "expired") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl text-orange-600">
            Link Expired
          </CardTitle>
          <CardDescription>
            This verification link has expired or already been used
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-3 rounded-md bg-orange-50 border border-orange-200">
              <p className="text-sm text-orange-700 flex items-center">
                <span className="mr-2">⚠️</span>
                Please request a new magic link from the login page.
              </p>
            </div>
            <Link href="/auth/login">
              <Button className="w-full">Back to Login</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl text-destructive">
          Verification Failed
        </CardTitle>
        <CardDescription>Unable to verify your link</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-3 rounded-md bg-destructive-muted border border-destructive-muted">
            <p className="text-sm text-destructive-foreground flex items-center">
              <span className="mr-2">❌</span>
              {errorMessage || "An unexpected error occurred"}
            </p>
          </div>
          <Link href="/auth/login">
            <Button className="w-full">Back to Login</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
