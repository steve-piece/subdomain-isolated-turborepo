// apps/protected/components/accept-invitation-form.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { completeInvitation } from "@/app/actions";
import { createClient } from "@/lib/supabase/client";
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
      try {
        if (typeof window === "undefined") return;

        const params = new URLSearchParams(window.location.search);
        const tokenHash = params.get("token_hash");
        const type = params.get("type");

        console.log("🔍 AcceptInvitationForm - Checking URL params:", {
          hasTokenHash: !!tokenHash,
          type,
        });

        if (!tokenHash || type !== "invite") {
          setError("Invalid or incomplete invitation link");
          setIsVerifying(false);
          return;
        }

        console.log("🔄 AcceptInvitationForm - Manually verifying OTP...");

        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "invite",
        });

        if (verifyError) {
          console.error(
            "🚨 AcceptInvitationForm - OTP verification failed:",
            verifyError
          );
          setError(verifyError.message);
          setIsVerifying(false);
          return;
        }

        if (data.session) {
          console.log("✅ AcceptInvitationForm - Session established:", {
            userEmail: data.session.user.email,
          });
          setSessionEmail(data.session.user.email);
          setError(null);
        }

        setIsVerifying(false);
      } catch (error) {
        console.error("🚨 AcceptInvitationForm - Unexpected error:", error);
        setError(
          error instanceof Error ? error.message : "Failed to verify invitation"
        );
        setIsVerifying(false);
      }
    };

    verifyInvitation();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setIsSubmitting(true);

    const result = await completeInvitation(password, redirectTo);

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.message ?? "Unable to complete invitation");
      addToast({
        title: "Unable to finish setup",
        description:
          result.message ?? "Please try again or request a new link.",
        variant: "error",
      });
      return;
    }

    addToast({
      title: "Welcome aboard!",
      description: "Your password has been set. Redirecting you now...",
      variant: "success",
      duration: 4000,
    });

    router.push(result.redirectTo ?? redirectTo);
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

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <span className="mr-2">⚠️</span>
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save password & continue"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => router.push(redirectTo)}
          disabled={isSubmitting}
        >
          Skip for now
        </Button>
      </div>
    </form>
  );
}
