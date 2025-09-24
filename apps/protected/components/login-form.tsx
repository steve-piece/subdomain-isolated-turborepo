"use client";

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
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

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
  const [error, setError] = useState<string | null>(null); // shows auth errors
  const [success, setSuccess] = useState<string | null>(null); // shows success toasts/messages
  const [isLoading, setIsLoading] = useState(false); // disables submit, shows spinner

  // Next.js navigation + search params access for handling query-driven messaging
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read URL params for a one-time “verified” success message from the confirm flow.
  // If present, display it in a green box and then strip the query params from the URL.
  useEffect(() => {
    const verified = searchParams.get("verified");
    const message = searchParams.get("message");

    if (verified === "true" && message) {
      setSuccess(decodeURIComponent(message));
      // Remove the query params so the message doesn't reappear on refresh.
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [searchParams]);

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
      // Email/password sign-in via Supabase Auth.
      // If credentials are valid, Supabase will set the session cookie in the browser.
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      // Optional: After sign-in, you could fetch and verify tenant claims client-side.
      // We rely on server-side checks and middleware for correctness and clean URLs.

      // Use a CLEAN URL so middleware can rewrite to internal structure.
      // Avoid exposing /s/${subdomain} in the UI.
      router.push("/dashboard");
    } catch (error: unknown) {
      // Show the error message in a friendly alert box in the UI.
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      // Always clear the loading state so the button becomes clickable again.
      setIsLoading(false);
    }
  };

  // The UI: a card with inputs, optional success/error banners, and a submit button.
  // - Email input (required)
  // - Password input (required)
  // - “Forgot password” link goes to a clean URL
  // - Success banner appears when a verification flow sends the user here with a message
  // - Error banner shows the last auth error (with a convenient “resend verification” link)
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
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {/* Optional verification success banner */}
              {success && (
                <div className="p-3 rounded-md bg-green-50 border border-green-200">
                  <p className="text-sm text-green-700 flex items-center">
                    <span className="mr-2">✅</span>
                    {success}
                  </p>
                </div>
              )}

              {/* Error banner, including link to resend verification if needed */}
              {error && (
                <div className="p-3 rounded-md bg-red-50 border border-red-200">
                  <p className="text-sm text-red-700 flex items-center">
                    <span className="mr-2">⚠️</span>
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

              {/* Submit button with loading spinner */}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center">
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></span>
                    Logging in...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <span className="mr-2">🔐</span>
                    Login
                  </span>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
