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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
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

          if (tokenHash && type === "recovery") {
            const { data, error: verifyError } = await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: "recovery",
            });

            if (verifyError) {
              setError(verifyError.message);
              return;
            }

            if (data.session) {
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

        if (sessionError || !session) {
          if (!isResetFlow) {
            setError("No active session found. Please login first.");
          }
          return;
        }

        setError(null);
      } catch (error) {
        setError(
          `Session Error: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    };

    setupSession();
  }, [isResetFlow, userEmail, supabase.auth]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setIsLoading(false);
      return;
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        throw updateError;
      }

      // Sign out and redirect to login
      await supabase.auth.signOut();

      router.push(
        `/auth/login?message=${encodeURIComponent(
          "Password updated successfully! Please login with your new password."
        )}`
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "An error occurred";
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
          <form onSubmit={handleUpdatePassword}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="password">New password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="New password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                        <line x1="3" y1="3" x2="21" y2="21" />
                      </svg>
                    ) : (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                        <line x1="3" y1="3" x2="21" y2="21" />
                      </svg>
                    ) : (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
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
