// apps/protected/components/login-form.tsx
// Tenant-scoped login card handling Supabase email/password auth and flows.
"use client";

import * as Sentry from "@sentry/nextjs";
import { cn } from "@workspace/ui/lib/utils";
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
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@workspace/supabase/client";
import { useToast } from "@workspace/ui/components/toast";
import { sendMagicLink } from "@actions/billing/auth";
import { Lock, AlertCircle } from "lucide-react";

// Props define the tenant context needed by this component.
// `subdomain` is passed from the route so the form knows which org is in scope.
interface LoginFormProps {
  subdomain: string;
  className?: string;
}

// Client component because it handles form state, user input, and navigation.
export function LoginForm({
  subdomain,
  className,
  ...props
}: LoginFormProps & React.ComponentPropsWithoutRef<"div">) {
  // Local UI state for controlled inputs and UX feedback
  const [email, setEmail] = useState(""); // bound to the email input
  const [password, setPassword] = useState(""); // bound to the password input
  const [showPassword, setShowPassword] = useState(false); // toggles password visibility
  const [error, setError] = useState<string | null>(null); // shows auth errors
  const [isLoading, setIsLoading] = useState(false); // disables submit, shows spinner
  const [isMagicLoading, setIsMagicLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false); // shows success checkmark in button

  // Next.js navigation + search params access for handling query-driven messaging
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasDisplayedToastRef = useRef(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (hasDisplayedToastRef.current) {
      return;
    }

    const verified = searchParams.get("verified");
    const rawMessage = searchParams.get("message");
    const reason = searchParams.get("reason");
    const rawVariant = searchParams.get("variant");
    const toastTitleParam = searchParams.get("toastTitle");

    type ToastVariant = "success" | "error" | "warning" | "info";

    const parseVariant = (value: string | null): ToastVariant | undefined => {
      if (!value) return undefined;
      if (
        value === "success" ||
        value === "error" ||
        value === "warning" ||
        value === "info"
      ) {
        return value;
      }
      return undefined;
    };

    const reasonToToast: Record<
      string,
      { title: string; description?: string; variant: ToastVariant }
    > = {
      no_session: {
        title: "Please sign in",
        description: "You need to sign in to access this organization.",
        variant: "info",
      },
      unauthorized: {
        title: "Access restricted",
        description: "You do not have permission to view this organization.",
        variant: "warning",
      },
      insufficient_permissions: {
        title: "Permission required",
        description: "You need additional permissions to continue.",
        variant: "warning",
      },
      email_unconfirmed: {
        title: "Verify your email",
        description: "Confirm your email address before signing in.",
        variant: "error",
      },
      email_change_success: {
        title: "Email updated",
        description: "Sign in using your new email address to continue.",
        variant: "success",
      },
    };

    const decodedMessage = rawMessage
      ? decodeURIComponent(rawMessage)
      : undefined;
    const variantFromParam = parseVariant(rawVariant);
    const reasonToast = reason ? reasonToToast[reason] : undefined;

    const toasts: Array<{
      title: string;
      description?: string;
      variant: ToastVariant;
    }> = [];

    if (verified === "true" || reason === "email_verified") {
      toasts.push({
        title: "Email verified",
        description: decodedMessage ?? "Your email has been confirmed.",
        variant: "success",
      });
    }

    if (decodedMessage) {
      toasts.push({
        title: toastTitleParam ?? reasonToast?.title ?? "Notice",
        description: decodedMessage,
        variant: variantFromParam ?? reasonToast?.variant ?? "info",
      });
    } else if (reasonToast) {
      // Only show email_unconfirmed toast if it comes with an explicit error parameter
      // This prevents misfiring during normal navigation/routing
      if (reason === "email_unconfirmed") {
        const errorParam = searchParams.get("error");
        if (errorParam === "email_unconfirmed") {
          toasts.push(reasonToast);
        }
        // Skip showing the toast if it's just the reason parameter without error context
      } else {
        toasts.push(reasonToast);
      }
    }

    if (toasts.length === 0) {
      return;
    }

    hasDisplayedToastRef.current = true;

    toasts.forEach((toast) => {
      addToast({
        title: toast.title,
        description: toast.description,
        variant: toast.variant,
        dismissible: true,
      });
    });

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      [
        "verified",
        "message",
        "variant",
        "reason",
        "toastTitle",
        "error",
      ].forEach((param) => {
        params.delete(param);
      });
      const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
      window.history.replaceState({}, "", nextUrl);
    }
  }, [searchParams, addToast]);

  // Handles the submit event for the login form.
  // 1) Prevent default form navigation
  // 2) Attempt Supabase email/password sign-in
  // 3) On success, navigate to a clean URL (middleware handles internal rewrite)
  // 4) On error, show a readable message to the user
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const emailConfirmed =
        session?.user?.email_confirmed_at ||
        (session?.user?.user_metadata as Record<string, unknown>)
          ?.email_confirmed === true;

      if (!emailConfirmed) {
        await supabase.auth.signOut();
        setError("Please confirm your email before logging in.");
        router.push(
          "/auth/resend-verification?error=email_unconfirmed&reason=email_unconfirmed&message=Please%20confirm%20your%20email%20before%20logging%20in."
        );
        return;
      }

      // Show success checkmark in button before redirecting
      setShowSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 1200); // Show success for 1.2 seconds before redirect
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
      setIsLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      setError("Enter your email before requesting a magic link");
      Sentry.logger.warn("magic_link_request_missing_email");
      return;
    }

    setIsMagicLoading(true);
    setError(null);

    await Sentry.startSpan(
      {
        op: "ui.click",
        name: "magic_link.request",
        attributes: {
          email,
        },
      },
      async (span) => {
        try {
          const result = await sendMagicLink(email, subdomain);

          if (result.success) {
            span.setStatus({ code: 1 }); // OK
            Sentry.logger.info("magic_link_request_success", {
              email,
            });
          } else {
            span.setStatus({ code: 2 }); // INTERNAL_ERROR
            Sentry.logger.warn("magic_link_request_failed", {
              email,
              message: result.message,
            });
          }

          setError(result.success ? null : result.message);
          addToast({
            title: result.success
              ? "Magic link sent"
              : "Unable to send magic link",
            description: result.message,
            variant: result.success ? "success" : "error",
            dismissible: true,
          });
        } catch (error) {
          span.setStatus({ code: 2 }); // INTERNAL_ERROR
          Sentry.captureException(error, {
            tags: {
              action: "magic_link_request",
            },
            extra: {
              email,
            },
          });

          setError(
            error instanceof Error ? error.message : "Unable to send magic link"
          );
          addToast({
            title: "Unable to send magic link",
            description:
              error instanceof Error
                ? error.message
                : "An unexpected error occurred while sending your magic link.",
            variant: "error",
            dismissible: true,
          });
        } finally {
          span.end();
          setIsMagicLoading(false);
        }
      }
    );
  };

  // The UI: a card with inputs, optional success/error banners, and a submit button.
  // - Email input (required)
  // - Password input (required)
  // - "Forgot password" link goes to a clean URL
  // - Success banner appears when a verification flow sends the user here with a message
  // - Error banner shows the last auth error (with a convenient "resend verification" link)
  // - Submit button shows a spinner while isLoading = true
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-6">
              {/* Email field */}
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

              {/* Password field + link to reset flow */}
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/auth/forgot-password" // CLEAN URL
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
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

              {/* Error banner, including link to resend verification if needed */}
              {error && (
                <div className="p-3 rounded-md bg-red-50 border border-red-200">
                  <p className="text-sm text-red-700 flex items-center">
                    <AlertCircle className="mr-2" />
                    {error}
                    {error.includes("Email not confirmed") && (
                      <Link
                        href="/auth/resend-verification" // CLEAN URL
                        className="ml-2 underline underline-offset-4 hover:no-underline"
                      >
                        Resend verification email
                      </Link>
                    )}
                  </p>
                </div>
              )}

              {/* Submit button with loading spinner and success checkmark */}
              <Button
                type="submit"
                className="w-full relative"
                disabled={isLoading || showSuccess}
              >
                {showSuccess ? (
                  <span className="flex items-center justify-center">
                    <span className="circle-loader load-complete">
                      <span className="checkmark draw"></span>
                    </span>
                  </span>
                ) : isLoading ? (
                  <span className="flex items-center justify-center">
                    <span className="circle-loader">
                      <span className="checkmark"></span>
                    </span>
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Lock className="h-4 w-4 mr-2" />
                    Login
                  </span>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleMagicLink}
                disabled={isMagicLoading}
              >
                {isMagicLoading
                  ? "Sending magic link..."
                  : "Send me a magic link"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
