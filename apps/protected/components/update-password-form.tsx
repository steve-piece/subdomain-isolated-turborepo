"use client";

import React from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";

interface UpdatePasswordFormProps
  extends React.ComponentPropsWithoutRef<"div"> {
  className?: string;
}

export function UpdatePasswordForm({
  className,
  ...props
}: UpdatePasswordFormProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<string>("Checking session...");
  const router = useRouter();
  const searchParams = useSearchParams();

  // Log all URL parameters
  useEffect(() => {
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type");
    const accessToken = searchParams.get("access_token");
    const refreshToken = searchParams.get("refresh_token");

    console.log("🔍 UpdatePasswordForm - URL Parameters:", {
      tokenHash: tokenHash ? `${tokenHash.slice(0, 20)}...` : null,
      type,
      accessToken: accessToken ? `${accessToken.slice(0, 10)}...` : null,
      refreshToken: refreshToken ? `${refreshToken.slice(0, 10)}...` : null,
      fullUrl: window.location.href,
    });
  }, [searchParams]);

  // ✅ CORRECT: For password reset, verify OTP FIRST
  useEffect(() => {
    const handleAuth = async () => {
      try {
        console.log("🔍 UpdatePasswordForm - Starting authentication check...");
        const supabase = createClient();

        // Check if this is a password reset flow (OTP tokens in URL)
        const tokenHash = searchParams.get("token_hash");
        const type = searchParams.get("type");

        if (tokenHash && type) {
          // This is a password reset - verify OTP first to establish session
          console.log(
            "🔄 UpdatePasswordForm - Password reset flow detected, verifying OTP..."
          );
          setSessionInfo("🔄 Verifying reset token...");

          try {
            const { data, error: verifyError } = await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: type as any,
            });

            if (verifyError) {
              console.error(
                "🚨 UpdatePasswordForm - OTP verification failed:",
                verifyError
              );
              setSessionInfo("❌ Reset token verification failed");
              setError(`Reset Token Invalid: ${verifyError.message}`);
              return;
            }

            if (!data.user) {
              console.error(
                "🚨 UpdatePasswordForm - OTP verified but no user returned"
              );
              setSessionInfo("❌ Reset token verification failed");
              setError("Reset token verification failed - no user found");
              return;
            }

            console.log(
              "✅ UpdatePasswordForm - OTP verification successful:",
              data.user.id
            );
            setSessionInfo(`✅ Reset token verified for: ${data.user.email}`);
            setError(null);
            return;
          } catch (otpError) {
            console.error(
              "🚨 UpdatePasswordForm - OTP verification error:",
              otpError
            );
            setSessionInfo("❌ Reset token verification error");
            setError(
              `Reset Token Error: ${otpError instanceof Error ? otpError.message : "Unknown error"}`
            );
            return;
          }
        }

        // No OTP tokens - check for existing session (regular authenticated flow)
        console.log(
          "🔍 UpdatePasswordForm - No reset tokens, checking existing session..."
        );
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        console.log("🔍 UpdatePasswordForm - Session check result:", {
          hasSession: !!session,
          sessionError: sessionError?.message,
          userId: session?.user?.id,
          userEmail: session?.user?.email,
          accessToken: session?.access_token
            ? `${session.access_token.slice(0, 20)}...`
            : null,
        });

        if (sessionError) {
          console.error("🚨 UpdatePasswordForm - Session error:", sessionError);
          setSessionInfo(`Session Error: ${sessionError.message}`);
          setError(`Session Error: ${sessionError.message}`);
          return;
        }

        if (!session) {
          console.warn("⚠️ UpdatePasswordForm - No active session found");
          setSessionInfo(
            "❌ No active session - please login or use password reset"
          );
          setError(
            "No active session found. Please login or use the password reset link from your email."
          );
          return;
        }

        setSessionInfo(`✅ Active session: ${session.user.email}`);
        console.log(
          "✅ UpdatePasswordForm - Active session found for:",
          session.user.email
        );
        setError(null);
      } catch (error) {
        console.error(
          "🚨 UpdatePasswordForm - Error during authentication:",
          error
        );
        setSessionInfo(
          `Authentication Error: ${error instanceof Error ? error.message : "Unknown error"}`
        );
        setError(
          `Authentication Error: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    };

    handleAuth();
  }, [searchParams]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("🔄 UpdatePasswordForm - Starting password update...");

    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      // Double-check session before updating
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      console.log("🔍 UpdatePasswordForm - Pre-update user check:", {
        hasUser: !!user,
        userId: user?.id,
        userError: userError?.message,
      });

      if (userError) {
        throw new Error(`User check failed: ${userError.message}`);
      }

      if (!user) {
        throw new Error("No authenticated user found");
      }

      console.log("🔄 UpdatePasswordForm - Calling updateUser...");
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        console.error("🚨 UpdatePasswordForm - Update password failed:", error);
        throw error;
      }

      console.log(
        "✅ UpdatePasswordForm - Password updated successfully, redirecting..."
      );
      router.push("/protected");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "An error occurred";
      console.error(
        "🚨 UpdatePasswordForm - Password update error:",
        errorMessage
      );
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={className} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Reset Your Password</CardTitle>
          <CardDescription>
            Please enter your new password below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-3 rounded-md bg-blue-50 border border-blue-200">
            <p className="text-sm text-blue-700">
              <strong>Debug Info:</strong> {sessionInfo}
            </p>
          </div>

          <form onSubmit={handleUpdatePassword}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="New password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save new password"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
