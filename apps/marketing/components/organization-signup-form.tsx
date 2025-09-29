// apps/marketing/components/organization-signup-form.tsx
// Marketing-side signup wizard that provisions organizations and handles validation.
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
import React, { useState, useEffect, useRef } from "react";
import { verifyTenant, type VerifyTenantResponse } from "@/app/actions";

type VerifyTenantFn = (subdomain: string) => Promise<VerifyTenantResponse>;

export interface OrganizationSignUpFormProps
  extends React.ComponentPropsWithoutRef<"div"> {
  verifyTenantAction?: VerifyTenantFn;
}

export function OrganizationSignUpForm({
  className,
  verifyTenantAction = verifyTenant,
  ...props
}: OrganizationSignUpFormProps) {
  // Form fields
  const [organizationName, setOrganizationName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");

  // UI toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);

  // Validation state
  const [touchedFields, setTouchedFields] = useState<{
    organizationName: boolean;
    userName: boolean;
    email: boolean;
    password: boolean;
    repeatPassword: boolean;
  }>({
    organizationName: false,
    userName: false,
    email: false,
    password: false,
    repeatPassword: false,
  });
  const [fieldErrors, setFieldErrors] = useState<{
    organizationName: string | null;
    userName: string | null;
    email: string | null;
    password: string | null;
    repeatPassword: string | null;
  }>({
    organizationName: null,
    userName: null,
    email: null,
    password: null,
    repeatPassword: null,
  });
  const [subdomainValidation, setSubdomainValidation] = useState<
    "valid" | "invalid" | "pending" | null
  >(null);
  const [subdomainTaken, setSubdomainTaken] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // Flow state
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<
    null | "pending_email" | "creating_org" | "needs_profile" | "error"
  >(null);
  const router = useRouter();

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Validate subdomain as user types, including availability check
  useEffect(() => {
    let cancelled = false;
    if (!subdomain) {
      setSubdomainTaken(false);
      setSubdomainValidation(null);
      return;
    }
    if (subdomain.length < 3 || !isValidSubdomain(subdomain)) {
      setSubdomainTaken(false);
      setSubdomainValidation("invalid");
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      setSubdomainValidation("pending");
      setIsValidating(true);
      verifyTenantAction(subdomain.trim().toLowerCase())
        .then((res) => {
          if (cancelled) return;
          if (res.error) {
            setSubdomainTaken(false);
            setSubdomainValidation("valid");
          } else if (res.exists) {
            setSubdomainTaken(true);
            setSubdomainValidation("invalid");
          } else {
            setSubdomainTaken(false);
            setSubdomainValidation("valid");
          }
        })
        .finally(() => {
          if (!cancelled) setIsValidating(false);
        });
    }, 350);

    return () => {
      cancelled = true;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [subdomain, verifyTenantAction]);

  // Field validators
  const validateField = (
    fieldName: keyof typeof fieldErrors,
    value: string
  ) => {
    let err: string | null = null;
    switch (fieldName) {
      case "organizationName":
        if (value.trim().length < 2)
          err = "Organization name must be at least 2 characters";
        break;
      case "userName":
        if (value.trim().length < 2)
          err = "Full name must be at least 2 characters";
        break;
      case "email":
        {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value))
            err = "Please enter a valid email address";
        }
        break;
      case "password":
        if (value.length < 6) err = "Password must be at least 6 characters";
        break;
      case "repeatPassword":
        if (value !== password) err = "Passwords do not match";
        break;
    }
    setFieldErrors((prev) => ({ ...prev, [fieldName]: err }));
    return err === null;
  };

  const handleFieldBlur = (
    fieldName: keyof typeof touchedFields,
    value: string
  ) => {
    setTouchedFields((prev) => ({ ...prev, [fieldName]: true }));
    validateField(fieldName, value);
  };

  const handleOrganizationNameChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const name = e.target.value;
    setOrganizationName(name);
    if (touchedFields.organizationName) validateField("organizationName", name);
    const suggestion = generateSubdomainSuggestion(name);
    setSubdomain(suggestion);
  };

  const handleUserNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setUserName(name);
    if (touchedFields.userName) validateField("userName", name);
  };

  const handleSubdomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Enforce allowed characters and lowercase for subdomains
    const cleaned = raw.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setSubdomain(cleaned);
    if (!cleaned) {
      setSubdomainValidation(null);
      return;
    }
    if (cleaned.length < 3) {
      setSubdomainValidation("invalid");
      return;
    }
    setSubdomainValidation(isValidSubdomain(cleaned) ? "valid" : "invalid");
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (touchedFields.email) validateField("email", value);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pwd = e.target.value;
    setPassword(pwd);
    if (touchedFields.password) validateField("password", pwd);
    if (touchedFields.repeatPassword)
      validateField("repeatPassword", repeatPassword);
  };

  const handleRepeatPasswordChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const pwd = e.target.value;
    setRepeatPassword(pwd);
    if (touchedFields.repeatPassword) validateField("repeatPassword", pwd);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const supabase = createClient();

    // Basic client checks
    if (password !== repeatPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      if (subdomainValidation !== "valid") {
        throw new Error(
          subdomainTaken
            ? "This subdomain is already taken. Please choose another."
            : "Please choose a valid subdomain."
        );
      }

      // Sign up the user
      const normalizedSubdomain = subdomain.trim().toLowerCase();
      const isDev = process.env.NODE_ENV !== "production";
      const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || "yourapp.com";
      const tenantBaseUrl = isDev
        ? `http://${normalizedSubdomain}.localhost:3003`
        : `https://${normalizedSubdomain}.${appDomain}`;
      const authRedirectUrl = `${tenantBaseUrl}/auth/confirm`;

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: userName,
            company_name: organizationName,
            organization_name: organizationName,
            subdomain: normalizedSubdomain,
            subdomain_url: tenantBaseUrl,
            user_role: "owner",
            redirect_to: authRedirectUrl,
            site_url: tenantBaseUrl,
          },
          emailRedirectTo: authRedirectUrl,
        },
      });

      if (authError) throw authError;

      const { data: sessionRes } = await supabase.auth.getSession();
      const hasSession = Boolean(sessionRes?.session);

      if (!hasSession) {
        setStatus("pending_email");
        setSuccess(true);
        await new Promise((resolve) => setTimeout(resolve, 1200));
        router.push("/signup/success");
        return;
      }

      if (authData.user) {
        // No direct org creation here; database trigger inserts inactive org.
        // Email verification will complete setup via /auth/confirm.
      }

      setStatus(null);

      // Show success state briefly before redirect
      setSuccess(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      router.push("/signup/success");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setStatus("error");
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
                  autoComplete="organization"
                  value={organizationName}
                  onChange={handleOrganizationNameChange}
                  onBlur={() =>
                    handleFieldBlur("organizationName", organizationName)
                  }
                  className={
                    touchedFields.organizationName &&
                    fieldErrors.organizationName
                      ? "border-red-500"
                      : ""
                  }
                />
                {touchedFields.organizationName &&
                  fieldErrors.organizationName && (
                    <p className="text-sm text-red-500 mt-1">
                      {fieldErrors.organizationName}
                    </p>
                  )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="subdomain">Subdomain</Label>
                <div className="flex items-center">
                  <Input
                    id="subdomain"
                    type="text"
                    placeholder="acme"
                    required
                    autoComplete="off"
                    value={subdomain}
                    onChange={handleSubdomainChange}
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
                    : `Your team will access the app at ${subdomain || "subdomain"}.${
                        process.env.NEXT_PUBLIC_APP_DOMAIN || "yourapp.com"
                      }`}
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="user-name">Your Full Name</Label>
                <Input
                  id="user-name"
                  type="text"
                  placeholder="John Smith"
                  required
                  autoComplete="name"
                  value={userName}
                  onChange={handleUserNameChange}
                  onBlur={() => handleFieldBlur("userName", userName)}
                  className={
                    touchedFields.userName && fieldErrors.userName
                      ? "border-red-500"
                      : ""
                  }
                />
                {touchedFields.userName && fieldErrors.userName && (
                  <p className="text-sm text-red-500 mt-1">
                    {fieldErrors.userName}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Your Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@acme.com"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={() => handleFieldBlur("email", email)}
                  className={
                    touchedFields.email && fieldErrors.email
                      ? "border-red-500"
                      : ""
                  }
                />
                {touchedFields.email && fieldErrors.email && (
                  <p className="text-sm text-red-500 mt-1">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={handlePasswordChange}
                    onBlur={() => handleFieldBlur("password", password)}
                    className={cn(
                      "pr-10",
                      touchedFields.password && fieldErrors.password
                        ? "border-red-500"
                        : ""
                    )}
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
                {touchedFields.password && fieldErrors.password && (
                  <p className="text-sm text-red-500 mt-1">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="repeat-password">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="repeat-password"
                    type={showRepeatPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={repeatPassword}
                    onChange={handleRepeatPasswordChange}
                    onBlur={() =>
                      handleFieldBlur("repeatPassword", repeatPassword)
                    }
                    className={cn(
                      "pr-10",
                      touchedFields.repeatPassword && fieldErrors.repeatPassword
                        ? "border-red-500"
                        : ""
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRepeatPassword(!showRepeatPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showRepeatPassword ? (
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
                {touchedFields.repeatPassword && fieldErrors.repeatPassword && (
                  <p className="text-sm text-red-500 mt-1">
                    {fieldErrors.repeatPassword}
                  </p>
                )}
              </div>

              {error && (
                <div className="p-3 rounded-md bg-red-50 border border-red-200">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {status === "pending_email" && !error && (
                <div className="p-3 rounded-md bg-blue-50 border border-blue-200">
                  <p className="text-sm text-blue-700 flex items-center">
                    <span className="mr-2">📬</span>
                    Check your inbox to confirm your email and finish setup.
                  </p>
                </div>
              )}

              {status === "needs_profile" && !error && (
                <div className="p-3 rounded-md bg-amber-50 border border-amber-200">
                  <p className="text-sm text-amber-700 flex items-center">
                    <span className="mr-2">⏳</span>
                    We are finalizing your organization setup. Please refresh in
                    a few seconds.
                  </p>
                </div>
              )}

              {success && (
                <div className="p-3 rounded-md bg-green-50 border border-green-200">
                  <p className="text-sm text-green-700 flex items-center">
                    <span className="mr-2">✓</span>
                    Organization created successfully. Redirecting...
                  </p>
                </div>
              )}

              <Button
                type="submit"
                className={cn(
                  "w-full transition-all",
                  success && "bg-green-600 hover:bg-green-700"
                )}
                aria-label="Create organization"
                disabled={
                  isLoading || isValidating || subdomainValidation === "invalid"
                }
              >
                {isValidating ? (
                  "Checking availability..."
                ) : isLoading ? (
                  <span className="flex items-center">
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
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
