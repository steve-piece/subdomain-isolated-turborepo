// apps/protected/components/reauthenticate-form.tsx
"use client";

import { useState } from "react";
import * as Sentry from "@sentry/nextjs";
import { useRouter } from "next/navigation";
import { verifyReauthentication } from "@actions/billing/auth";
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
import { useToast } from "@workspace/ui/components/toast";

interface ReauthenticateFormProps {
  subdomain: string;
  pendingAction?: string;
}

export function ReauthenticateForm({
  subdomain,
  pendingAction,
}: ReauthenticateFormProps) {
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { addToast } = useToast();

  const actionDescription = pendingAction
    ? `to complete: ${pendingAction.replace(/[_-]/g, " ")}`
    : "for this sensitive action";

  const handleVerifyReauth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (otpCode.length !== 6) {
      setError("Please enter the 6-digit code from your email");
      setIsLoading(false);
      return;
    }

    await Sentry.startSpan(
      {
        op: "ui.form",
        name: "reauthenticate.verify",
        attributes: {
          subdomain,
          pendingAction: pendingAction ?? "unknown",
        },
      },
      async (span) => {
        try {
          const result = await verifyReauthentication(otpCode, subdomain);

          if (result.success) {
            span.setStatus({ code: 1 });
            Sentry.logger.info("reauthentication_success", {
              subdomain,
              pendingAction,
            });

            addToast({
              title: "Verification successful",
              description: result.message,
              variant: "success",
            });

            if (result.redirectTo) {
              router.push(result.redirectTo);
            } else {
              router.push("/dashboard");
            }
          } else {
            span.setStatus({ code: 2 });
            setError(result.message);
            Sentry.logger.warn("reauthentication_failed", {
              subdomain,
              pendingAction,
              message: result.message,
            });
          }
        } catch (error) {
          span.setStatus({ code: 2 });
          Sentry.captureException(error, {
            tags: { action: "reauthenticate_verify" },
            extra: { subdomain, pendingAction },
          });
          setError("An unexpected error occurred");
        } finally {
          setIsLoading(false);
          span.end();
        }
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Confirm your identity</CardTitle>
        <CardDescription>
          Enter the 6-digit code sent to your email {actionDescription}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleVerifyReauth}>
          <div className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="otp-code">Verification code</Label>
              <Input
                id="otp-code"
                type="text"
                placeholder="123456"
                required
                value={otpCode}
                onChange={(e) =>
                  setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className="text-center text-lg tracking-wider"
                maxLength={6}
              />
            </div>

            {error && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200">
                <p className="text-sm text-red-700 flex items-center">
                  <span className="mr-2">⚠️</span>
                  {error}
                </p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Verifying..." : "Verify code"}
            </Button>

            <div className="mt-4 text-center text-sm">
              <Link
                href="/auth/login"
                className="text-muted-foreground underline underline-offset-4"
              >
                Cancel and return to login
              </Link>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
