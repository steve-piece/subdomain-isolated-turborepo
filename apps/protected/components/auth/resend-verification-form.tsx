// apps/protected/components/auth/resend-verification-form.tsx
"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { resendEmailVerification } from "@/app/actions/auth";
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

import type { ReactElement } from "react";

interface ResendVerificationFormProps {
  subdomain: string;
}

export function ResendVerificationForm({
  subdomain,
}: ResendVerificationFormProps): ReactElement {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const urlError = searchParams.get("error");
    const urlMessage = searchParams.get("message");
    const urlEmail = searchParams.get("email");

    // Pre-fill email from query params
    if (urlEmail) {
      setEmail(decodeURIComponent(urlEmail));
    }

    if (urlError) {
      setError(urlError);
    } else if (urlMessage) {
      setError(urlMessage);
    }
  }, [searchParams]);

  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await resendEmailVerification(email, subdomain);

      if (result.success) {
        setSuccess(result.message);

        // Clear form
        setEmail("");

        // Redirect to login after a delay
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      } else {
        setError(result.message);
      }
    } catch (error: unknown) {
      setError(
        error instanceof Error ? error.message : "An unexpected error occurred",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Resend Verification</CardTitle>
            <CardDescription>
              Enter your email address to receive a new verification email
            </CardDescription>
            {subdomain && (
              <div className="mt-4 rounded-lg bg-muted p-3 space-y-1">
                <p className="text-sm font-medium">
                  Organization: <span className="font-mono">{subdomain}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Your subdomain reservation will be extended for another 48
                  hours after resending.
                </p>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResendVerification}>
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
                    <p className="text-sm text-destructive-foreground">{error}</p>
                  </div>
                )}

                {success && (
                  <div className="p-3 rounded-md bg-success-muted border border-success-muted">
                    <p className="text-sm text-success-foreground flex items-center">
                      <span className="mr-2">✓</span>
                      {success}
                    </p>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Sending..." : "Send New Verification Email"}
                </Button>
              </div>

              <div className="mt-4 text-center text-sm">
                Already verified?{" "}
                <Link
                  href="/login"
                  className="underline underline-offset-4"
                >
                  Sign in
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
