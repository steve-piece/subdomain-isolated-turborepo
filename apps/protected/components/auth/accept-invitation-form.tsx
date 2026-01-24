// apps/protected/components/accept-invitation-form.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import { completeInvitation } from "@actions/invitations";
import { createClient } from "@workspace/supabase/client";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { useToast } from "@workspace/ui/components/toast";

interface AcceptInvitationFormProps {
  email?: string;
  redirectTo?: string;
}

export function AcceptInvitationForm({
  email,
  redirectTo = "/dashboard",
}: AcceptInvitationFormProps) {
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [sessionEmail, setSessionEmail] = useState<string | undefined>(email);
  const router = useRouter();
  const { addToast } = useToast();

  // Create client once
  const supabase = useMemo(() => createClient(), []);

  // Verify OTP on mount to establish session
  useEffect(() => {
    const verifyInvitation = async () => {
      const startTime = performance.now();

      Sentry.addBreadcrumb({
        category: "auth.invitation",
        message: "Starting invitation verification flow",
        level: "info",
        data: {
          hasProvidedEmail: !!email,
          redirectTo,
        },
      });

      try {
        if (typeof window === "undefined") {
          return;
        }

        const params = new URLSearchParams(window.location.search);
        const tokenHash = params.get("token_hash");
        const type = params.get("type");

        Sentry.addBreadcrumb({
          category: "auth.invitation",
          message: "Parsed URL parameters",
          level: "info",
          data: {
            hasTokenHash: !!tokenHash,
            type,
          },
        });

        if (!tokenHash || type !== "invite") {
          const errorMsg = "Invalid or incomplete invitation link";

          Sentry.addBreadcrumb({
            category: "auth.invitation",
            message: "Missing or invalid URL parameters",
            level: "warning",
            data: {
              hasTokenHash: !!tokenHash,
              type,
            },
          });

          Sentry.withScope((scope) => {
            scope.setContext("invitation", {
              hasTokenHash: !!tokenHash,
              type,
              redirectTo,
              email: email || "unknown",
            });
            scope.setTag("component", "AcceptInvitationForm");
            scope.setTag("step", "url_validation");
            scope.setLevel("warning");
            Sentry.captureMessage(errorMsg);
          });

          setError(errorMsg);
          setIsVerifying(false);
          return;
        }

        Sentry.addBreadcrumb({
          category: "auth.invitation",
          message: "Verifying OTP token",
          level: "info",
        });

        const verifyStartTime = performance.now();
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "invite",
        });
        const verifyDuration = performance.now() - verifyStartTime;

        Sentry.addBreadcrumb({
          category: "auth.invitation",
          message: "OTP verification completed",
          level: "info",
          data: {
            duration: `${verifyDuration.toFixed(2)}ms`,
            success: !verifyError,
          },
        });

        if (verifyError) {
          Sentry.addBreadcrumb({
            category: "auth.invitation",
            message: "OTP verification failed",
            level: "error",
            data: {
              error: verifyError.message,
              code: verifyError.code,
              duration: `${verifyDuration.toFixed(2)}ms`,
            },
          });

          Sentry.withScope((scope) => {
            scope.setContext("invitation", {
              email: email || "unknown",
              redirectTo,
              errorCode: verifyError.code,
              errorMessage: verifyError.message,
              verifyDuration: `${verifyDuration.toFixed(2)}ms`,
            });
            scope.setTag("component", "AcceptInvitationForm");
            scope.setTag("step", "otp_verification");
            scope.setTag("error_code", verifyError.code || "unknown");
            scope.setLevel("error");
            Sentry.captureException(verifyError);
          });

          setError(verifyError.message);
          setIsVerifying(false);
          return;
        }

        if (data?.session) {
          const userEmail = data.session.user.email;
          const userId = data.session.user.id;

          console.log("✅ AcceptInvitationForm - Session established:", {
            userEmail,
          });

          const totalDuration = performance.now() - startTime;

          Sentry.addBreadcrumb({
            category: "auth.invitation",
            message: "Session established successfully",
            level: "info",
            data: {
              userEmail,
              totalDuration: `${totalDuration.toFixed(2)}ms`,
            },
          });

          Sentry.setUser({
            email: userEmail,
            id: userId,
          });

          // Send successful verification event
          Sentry.withScope((scope) => {
            scope.setContext("invitation", {
              email: userEmail,
              redirectTo,
              totalDuration: `${totalDuration.toFixed(2)}ms`,
            });
            scope.setTag("component", "AcceptInvitationForm");
            scope.setTag("step", "verification_success");
            scope.setLevel("info");
            Sentry.captureMessage("Invitation OTP verified successfully");
          });

          setSessionEmail(userEmail);
          setError(null);
        }

        setIsVerifying(false);
      } catch (error) {
        const totalDuration = performance.now() - startTime;

        Sentry.addBreadcrumb({
          category: "auth.invitation",
          message: "Unexpected error during verification",
          level: "error",
          data: {
            totalDuration: `${totalDuration.toFixed(2)}ms`,
          },
        });

        Sentry.withScope((scope) => {
          scope.setContext("invitation", {
            email: email || "unknown",
            redirectTo,
            totalDuration: `${totalDuration.toFixed(2)}ms`,
          });
          scope.setTag("component", "AcceptInvitationForm");
          scope.setTag("step", "verification_unexpected");
          scope.setLevel("error");
          Sentry.captureException(error);
        });

        setError(
          error instanceof Error
            ? error.message
            : "Failed to verify invitation",
        );
        setIsVerifying(false);
      }
    };

    verifyInvitation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const startTime = performance.now();

    Sentry.addBreadcrumb({
      category: "auth.invitation",
      message: "User submitted password setup form",
      level: "info",
      data: {
        hasSessionEmail: !!sessionEmail,
        hasFullName: !!fullName,
      },
    });

    // Validation
    if (!fullName || fullName.trim().length < 2) {
      const errorMsg = "Full name is required (minimum 2 characters)";

      Sentry.addBreadcrumb({
        category: "auth.invitation",
        message: "Full name validation failed",
        level: "warning",
        data: {
          fullNameLength: fullName.length,
        },
      });

      setError(errorMsg);
      return;
    }

    if (password !== confirmPassword) {
      const errorMsg = "Passwords do not match";

      Sentry.addBreadcrumb({
        category: "auth.invitation",
        message: "Password validation failed: mismatch",
        level: "warning",
      });

      setError(errorMsg);
      return;
    }

    if (password.length < 6) {
      const errorMsg = "Password must be at least 6 characters long";

      Sentry.addBreadcrumb({
        category: "auth.invitation",
        message: "Password validation failed: too short",
        level: "warning",
        data: {
          passwordLength: password.length,
        },
      });

      setError(errorMsg);
      return;
    }

    setIsSubmitting(true);

    Sentry.addBreadcrumb({
      category: "auth.invitation",
      message: "Calling completeInvitation server action",
      level: "info",
    });

    try {
      const actionStartTime = performance.now();
      const result = await completeInvitation(
        password,
        fullName.trim(),
        redirectTo,
      );
      const actionDuration = performance.now() - actionStartTime;

      Sentry.addBreadcrumb({
        category: "auth.invitation",
        message: "CompleteInvitation server action completed",
        level: "info",
        data: {
          success: result.success,
          duration: `${actionDuration.toFixed(2)}ms`,
        },
      });

      setIsSubmitting(false);

      if (!result.success) {
        Sentry.addBreadcrumb({
          category: "auth.invitation",
          message: "Invitation completion failed",
          level: "error",
          data: {
            message: result.message,
            duration: `${actionDuration.toFixed(2)}ms`,
          },
        });

        Sentry.withScope((scope) => {
          scope.setContext("invitation", {
            email: sessionEmail || email || "unknown",
            redirectTo,
            resultMessage: result.message,
            actionDuration: `${actionDuration.toFixed(2)}ms`,
            totalDuration: `${(performance.now() - startTime).toFixed(2)}ms`,
          });
          scope.setTag("component", "AcceptInvitationForm");
          scope.setTag("step", "complete_invitation");
          scope.setLevel("error");
          Sentry.captureMessage(
            result.message ?? "Unable to complete invitation",
          );
        });

        setError(result.message ?? "Unable to complete invitation");
        addToast({
          title: "Unable to finish setup",
          description:
            result.message ?? "Please try again or request a new link.",
          variant: "error",
        });

        return;
      }

      const totalDuration = performance.now() - startTime;

      Sentry.addBreadcrumb({
        category: "auth.invitation",
        message: "Invitation completed successfully",
        level: "info",
        data: {
          redirectTo: result.redirectTo ?? redirectTo,
          totalDuration: `${totalDuration.toFixed(2)}ms`,
        },
      });

      // Send success event
      Sentry.withScope((scope) => {
        scope.setContext("invitation", {
          email: sessionEmail || email || "unknown",
          redirectTo: result.redirectTo ?? redirectTo,
          totalDuration: `${totalDuration.toFixed(2)}ms`,
        });
        scope.setTag("component", "AcceptInvitationForm");
        scope.setTag("step", "complete_success");
        scope.setLevel("info");
        Sentry.captureMessage("Invitation completed successfully");
      });

      addToast({
        title: "Welcome aboard!",
        description: "Your password has been set. Redirecting you now...",
        variant: "success",
        duration: 4000,
      });

      router.push(result.redirectTo ?? redirectTo);
    } catch (error) {
      setIsSubmitting(false);
      const totalDuration = performance.now() - startTime;

      Sentry.addBreadcrumb({
        category: "auth.invitation",
        message: "Unexpected error completing invitation",
        level: "error",
        data: {
          totalDuration: `${totalDuration.toFixed(2)}ms`,
        },
      });

      Sentry.withScope((scope) => {
        scope.setContext("invitation", {
          email: sessionEmail || email || "unknown",
          redirectTo,
          totalDuration: `${totalDuration.toFixed(2)}ms`,
        });
        scope.setTag("component", "AcceptInvitationForm");
        scope.setTag("step", "complete_invitation_unexpected");
        scope.setLevel("error");
        Sentry.captureException(error);
      });

      const errorMsg =
        error instanceof Error ? error.message : "An unexpected error occurred";
      setError(errorMsg);
      addToast({
        title: "Unable to finish setup",
        description: errorMsg,
        variant: "error",
      });
    }
  };

  // Show loading state while verifying
  if (isVerifying) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          Verifying your invitation...
        </p>
      </div>
    );
  }

  // Show error state if verification failed
  if (error && !sessionEmail) {
    return (
      <div className="space-y-4">
        <div className="p-3 rounded-md bg-red-50 border border-red-200">
          <p className="text-sm text-red-700 flex items-center">
            <span className="mr-2">❌</span>
            {error}
          </p>
        </div>
        <Button
          type="button"
          className="w-full"
          variant="outline"
          onClick={() => router.push("/auth/login")}
        >
          Back to Login
        </Button>
      </div>
    );
  }

  // Show password setup form
  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {sessionEmail && (
        <div className="p-3 rounded-md bg-blue-50 border border-blue-200 mb-4">
          <p className="text-sm text-blue-700">
            Setting up password for: <strong>{sessionEmail}</strong>
          </p>
        </div>
      )}
      {email ? (
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Invited email:</span>{" "}
          {email}
        </div>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="full-name">Full Name</Label>
        <Input
          id="full-name"
          type="text"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="Enter your full name"
          minLength={2}
          required
          autoComplete="name"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="password">Create a password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={6}
            required
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((val) => !val)}
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
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
                aria-hidden="true"
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
                aria-hidden="true"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="confirm-password">Confirm password</Label>
        <div className="relative">
          <Input
            id="confirm-password"
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            minLength={6}
            required
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((val) => !val)}
            tabIndex={-1}
            aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
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
                aria-hidden="true"
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
                aria-hidden="true"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <span className="mr-2">⚠️</span>
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Complete setup"}
        </Button>
      </div>
    </form>
  );
}
