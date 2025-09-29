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
import { useState, useEffect } from "react";

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

  // Simplified authentication check - server-side already handled OTP verification for reset flows
  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log("🔍 UpdatePasswordForm - Checking session...", {
          isResetFlow,
          userEmail,
          subdomain,
        });

        const supabase = createClient();
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
          if (isResetFlow) {
            // For reset flows, this shouldn't happen since server-side verified OTP
            setSessionInfo("❌ Reset session not established");
            setError(
              "Reset session not established. Please try the reset link again."
            );
          } else {
            // For regular flows, user needs to login
            setSessionInfo("❌ No active session - please login");
            setError("No active session found. Please login first.");
          }
          return;
        }

        // Session established successfully
        const displayEmail = userEmail || session.user.email;
        setSessionInfo(
          isResetFlow
            ? `✅ Reset verified for: ${displayEmail}`
            : `✅ Active session: ${displayEmail}`
        );
        console.log(
          "✅ UpdatePasswordForm - Session ready for password update:",
          {
            userId: session.user.id,
            email: displayEmail,
            isResetFlow,
          }
        );
        setError(null);
      } catch (error) {
        console.error("🚨 UpdatePasswordForm - Session check error:", error);
        setSessionInfo(
          `Session Check Error: ${error instanceof Error ? error.message : "Unknown error"}`
        );
        setError(
          `Session Check Error: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    };

    checkSession();
  }, [isResetFlow, userEmail, subdomain]);

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

      // Redirect based on flow type
      if (isResetFlow) {
        router.push(
          "/auth/login?message=Password updated successfully! Please login with your new password."
        );
      } else {
        router.push("/protected");
      }
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
