"use client";

import { cn } from "@workspace/ui/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  generateSubdomainSuggestion,
  isValidSubdomain,
} from "@workspace/ui/lib/subdomains";
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
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export function OrganizationSignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [organizationName, setOrganizationName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [subdomainValidation, setSubdomainValidation] = useState<
    "valid" | "invalid" | "pending" | null
  >(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  // Validate subdomain as user types
  useEffect(() => {
    if (!subdomain) {
      setSubdomainValidation(null);
      return;
    }

    if (subdomain.length < 3) {
      setSubdomainValidation("invalid");
      return;
    }

    if (!isValidSubdomain(subdomain)) {
      setSubdomainValidation("invalid");
      return;
    }

    setSubdomainValidation("valid");
  }, [subdomain]);

  // Auto-generate subdomain from organization name
  const handleOrganizationNameChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const name = e.target.value;
    setOrganizationName(name);

    // Generate subdomain suggestion using utility function
    const suggestion = generateSubdomainSuggestion(name);

    setSubdomain(suggestion);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (!isValidSubdomain(subdomain)) {
      setError(
        "Subdomain must be 3-63 characters and contain only letters, numbers, and hyphens"
      );
      setIsLoading(false);
      return;
    }

    try {
      // First, check if subdomain is available
      setIsValidating(true);
      // TODO: Add subdomain availability check API call here
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate API call
      setIsValidating(false);

      // Create user account
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            organization_name: organizationName,
            subdomain: subdomain,
            role: "owner",
          },
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      });

      if (authError) throw authError;

      // TODO: Create organization record in database here
      // This would typically involve calling an API endpoint to:
      // 1. Create organization record
      // 2. Set up subdomain mapping
      // 3. Assign user as owner

      // Show success state briefly before redirect
      setSuccess(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      router.push("/signup-success");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
      setIsValidating(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Create your organization</CardTitle>
          <CardDescription>
            Set up your account and organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="organization-name">Organization Name</Label>
                <Input
                  id="organization-name"
                  type="text"
                  placeholder="Acme Inc"
                  required
                  value={organizationName}
                  onChange={handleOrganizationNameChange}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="subdomain">Subdomain</Label>
                <div className="flex items-center">
                  <Input
                    id="subdomain"
                    type="text"
                    placeholder="acme"
                    required
                    value={subdomain}
                    onChange={(e) => setSubdomain(e.target.value)}
                    className={cn(
                      "rounded-r-none",
                      subdomainValidation === "valid" && "border-green-500",
                      subdomainValidation === "invalid" && "border-red-500"
                    )}
                  />
                  <span className="bg-muted px-3 py-2 border border-l-0 rounded-r-md text-muted-foreground">
                    .{process.env.NEXT_PUBLIC_APP_DOMAIN || "yourapp.com"}
                  </span>
                  {subdomainValidation === "valid" && (
                    <span className="ml-2 text-green-500">✓</span>
                  )}
                  {subdomainValidation === "invalid" && (
                    <span className="ml-2 text-red-500">✗</span>
                  )}
                </div>
                <p
                  className={cn(
                    "text-sm",
                    subdomainValidation === "valid" && "text-green-600",
                    subdomainValidation === "invalid" && "text-red-600",
                    !subdomainValidation && "text-muted-foreground"
                  )}
                >
                  {subdomainValidation === "invalid" && subdomain
                    ? "Subdomain must be 3-63 characters, letters, numbers, and hyphens only"
                    : `Your team will access the app at ${subdomain || "subdomain"}.${process.env.NEXT_PUBLIC_APP_DOMAIN || "yourapp.com"}`}
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Your Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@acme.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="repeat-password">Confirm Password</Label>
                <Input
                  id="repeat-password"
                  type="password"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                />
              </div>

              {error && (
                <div className="p-3 rounded-md bg-red-50 border border-red-200">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {success && (
                <div className="p-3 rounded-md bg-green-50 border border-green-200">
                  <p className="text-sm text-green-700 flex items-center">
                    <span className="mr-2">✓</span>
                    Organization created successfully! Redirecting...
                  </p>
                </div>
              )}

              <Button
                type="submit"
                className={cn(
                  "w-full transition-all",
                  success && "bg-green-600 hover:bg-green-700"
                )}
                disabled={
                  isLoading || isValidating || subdomainValidation === "invalid"
                }
              >
                {isValidating ? (
                  "Checking availability..."
                ) : isLoading ? (
                  <span className="flex items-center">
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></span>
                    Creating organization...
                  </span>
                ) : success ? (
                  "Organization created!"
                ) : (
                  "Create organization"
                )}
              </Button>
            </div>

            <div className="mt-4 text-center text-sm">
              Already have an organization?{" "}
              <Link href="/login" className="underline underline-offset-4">
                Find your team
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
