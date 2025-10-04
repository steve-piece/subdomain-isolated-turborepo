// apps/protected/components/update-password-form.tsx
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
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";

interface UpdatePasswordFormProps
  extends React.ComponentPropsWithoutRef<"div"> {
  className?: string;
  subdomain?: string;
  isResetFlow?: boolean;
  userEmail?: string;
}

export function UpdatePasswordForm({
  className,
  subdomain,
  isResetFlow = false,
  userEmail,
  ...props
}: UpdatePasswordFormProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<string>("Checking session...");
  const router = useRouter();

  // Create client once to catch early auth events
  const supabase = useMemo(() => createClient(), []);

  // For reset flows, manually verify the OTP from URL (workaround for @supabase/ssr issue)
  useEffect(() => {
    const setupSession = async () => {
      try {
        if (isResetFlow && typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const tokenHash = params.get("token_hash");
          const type = params.get("type");

          console.log("🔍 UpdatePasswordForm - Checking URL params:", {
            hasTokenHash: !!tokenHash,
            type,
          });

          if (tokenHash && type === "recovery") {
            console.log("🔄 UpdatePasswordForm - Manually verifying OTP...");

            const { data, error: verifyError } = await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: "recovery",
            });

            if (verifyError) {
              console.error(
                "🚨 UpdatePasswordForm - OTP verification failed:",
                verifyError,
              );
              setSessionInfo("❌ Reset link invalid or expired");
              setError(verifyError.message);
              return;
            }

            if (data.session) {
              console.log("✅ UpdatePasswordForm - Session established:", {
                userEmail: data.session.user.email,
              });
              setSessionInfo(`✅ Session active: ${data.session.user.email}`);
              setError(null);
              return;
            }
          }
        }

        // For non-reset flows or if no tokens in URL, check session normally
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        console.log("🔍 UpdatePasswordForm - Session check:", {
          hasSession: !!session,
          userEmail: session?.user?.email,
          isResetFlow,
        });

        if (sessionError || !session) {
          setSessionInfo(
            isResetFlow
              ? "⏳ Verifying reset link..."
              : "❌ No active session - please login",
          );
          if (!isResetFlow) {
            setError("No active session found. Please login first.");
          }
          return;
        }

        setSessionInfo(`✅ Session active: ${session.user.email}`);
        setError(null);
      } catch (error) {
        console.error("🚨 UpdatePasswordForm - Session setup error:", error);
        setError(
          `Session Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    };

    setupSession();
  }, [isResetFlow, userEmail, supabase.auth]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("🔄 UpdatePasswordForm - Starting password update...");

    setIsLoading(true);
    setError(null);

    try {
      // Update password directly with Supabase client
      // For recovery flows, the session is automatically established via the recovery token
      console.log(
        "🔄 UpdatePasswordForm - Calling supabase.auth.updateUser...",
      );
      const { data, error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        console.error(
          "🚨 UpdatePasswordForm - Update password failed:",
          updateError,
        );
        throw updateError;
      }

      console.log("✅ UpdatePasswordForm - Password updated successfully:", {
        userId: data.user?.id,
      });

      // Sign out and redirect to login
      await supabase.auth.signOut();

      router.push(
        `/auth/login?message=${encodeURIComponent(
          "Password updated successfully! Please login with your new password.",
        )}`,
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "An error occurred";
      console.error(
        "🚨 UpdatePasswordForm - Password update error:",
        errorMessage,
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
          <CardTitle className="text-2xl">
            {isResetFlow ? "Reset Your Password" : "Update Your Password"}
          </CardTitle>
          <CardDescription>
            {isResetFlow
              ? "Please enter your new password below."
              : `Update your password${subdomain ? ` for ${subdomain}` : ""}.`}
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
