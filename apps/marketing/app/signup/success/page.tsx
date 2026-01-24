// apps/marketing/app/signup/success/page.tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import {
  buildSubdomainUrl,
  isValidSubdomain,
} from "@workspace/ui/lib/subdomains";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<{
    subdomain?: string | string[];
    email?: string | string[];
  }>;
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const subdomainParam = params.subdomain;
  const emailParam = params.email;

  // Handle both string and string[] cases
  const subdomainValue = Array.isArray(subdomainParam)
    ? subdomainParam[0]
    : subdomainParam;
  const subdomain = subdomainValue
    ? decodeURIComponent(subdomainValue).trim().toLowerCase()
    : null;

  const emailValue = Array.isArray(emailParam) ? emailParam[0] : emailParam;
  const email = emailValue ? decodeURIComponent(emailValue) : null;

  // Build login URL if subdomain is valid
  const isDevelopment = process.env.NODE_ENV === "development";
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN;
  const loginUrl =
    subdomain && isValidSubdomain(subdomain)
      ? buildSubdomainUrl(subdomain, "/auth/login", isDevelopment, appDomain)
      : null;

  // Build resend verification URL
  const resendUrl =
    subdomain && email && isValidSubdomain(subdomain)
      ? buildSubdomainUrl(
          subdomain,
          `/auth/resend-verification?email=${encodeURIComponent(email)}&subdomain=${encodeURIComponent(subdomain)}`,
          isDevelopment,
          appDomain,
        )
      : null;

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                Thank you for signing up!
              </CardTitle>
              <CardDescription>Check your email to confirm</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  You&apos;ve successfully signed up. Please check your email to
                  confirm your account before signing in.
                </p>
                {subdomain && (
                  <div className="rounded-lg bg-muted p-3 space-y-1">
                    <p className="text-sm font-medium">
                      Organization:{" "}
                      <span className="font-mono">{subdomain}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Your subdomain is reserved for 48 hours. Please confirm
                      your email to complete setup.
                    </p>
                  </div>
                )}
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground">
                    Didn&apos;t receive the email? Check your spam folder or
                    click below to resend.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="flex flex-col gap-3">
            {resendUrl && (
              <Button asChild className="w-full">
                <Link href={resendUrl}>Resend Verification Email</Link>
              </Button>
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link href="/">Back to Homepage</Link>
              </Button>
              {loginUrl && (
                <Button
                  asChild
                  variant="secondary"
                  className="w-full sm:w-auto"
                >
                  <Link href={loginUrl}>Go to Login</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
