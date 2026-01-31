// apps/protected/components/forgot-password-form.tsx
// Handles sending password reset emails targeted to a tenant-specific subdomain.
"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import { requestPasswordReset } from "@/app/actions/auth/password-reset";
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
import Link from "next/link";

interface ForgotPasswordFormProps {
  subdomain: string;
}

export function ForgotPasswordForm({ subdomain }: ForgotPasswordFormProps): ReactElement {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await requestPasswordReset(email, subdomain);

      if (!result.success) {
        throw new Error(result.message);
      }

      setSuccess(true);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {success ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Check Your Email</CardTitle>
            <CardDescription>Password reset instructions sent</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 rounded-md bg-success-muted border border-success-muted">
                <p className="text-sm text-success-foreground flex items-center">
                  <span className="mr-2">✅</span>
                  If you registered using your email and password, you will
                  receive a password reset email with a link to reset your
                  password.
                </p>
              </div>
              <div className="text-center text-sm">
                <Link
                  href="/auth/login"
                  className="underline underline-offset-4"
                >
                  ← Back to Login
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Reset Your Password</CardTitle>
            <CardDescription>
              Enter your email address and we&apos;ll send you a link to reset
              your password for <strong>{subdomain}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                {error && (
                  <div className="p-3 rounded-md bg-destructive-muted border border-destructive-muted">
                    <p className="text-sm text-destructive-foreground flex items-center">
                      <span className="mr-2">⚠️</span>
                      {error}
                    </p>
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Sending..." : "Send Reset Email"}
                </Button>
              </div>
              <div className="mt-4 text-center text-sm">
                Remember your password?{" "}
                <Link
                  href="/auth/login"
                  className="underline underline-offset-4"
                >
                  Login
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </>
  );
}
