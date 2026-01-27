// apps/protected/app/s/[subdomain]/auth/accept-invitation/page.tsx
import { unstable_noStore as noStore } from "next/cache";
import { AcceptInvitationForm } from "@/components/auth/accept-invitation-form";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@workspace/ui/components/card";
import type { ReactElement } from "react";
import Link from "next/link";

interface AcceptInvitationPageProps {
  params: Promise<{ subdomain: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AcceptInvitationPage({
  params,
  searchParams,
}: AcceptInvitationPageProps): Promise<ReactElement> {
  noStore();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { subdomain } = await params;
  const searchParamsData = await searchParams;

  const token_hash = searchParamsData.token_hash as string;
  const type = searchParamsData.type as string;
  const error = searchParamsData.error as string;

  if (error) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-destructive">
                Invalid Invitation
              </CardTitle>
              <CardDescription>
                There was a problem with your invitation link
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 rounded-md bg-destructive-muted border border-destructive-muted">
                  <p className="text-sm text-destructive-foreground flex items-center">
                    <span className="mr-2">⚠️</span>
                    {decodeURIComponent(error)}
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
        </div>
      </div>
    );
  }

  if (!token_hash || !type) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                Missing Invitation Data
              </CardTitle>
              <CardDescription>
                This invitation link appears to be incomplete
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 rounded-md bg-warning-muted border border-warning-muted">
                  <p className="text-sm text-warning-foreground flex items-center">
                    <span className="mr-2">⚠️</span>
                    Please use the complete invitation link from your email.
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
        </div>
      </div>
    );
  }

  console.log(
    "🔄 AcceptInvitationPage - Rendering client-side form for invite type",
  );

  // Render the client-side form that will:
  // 1. Verify OTP to establish session
  // 2. Show password setup form
  // 3. Complete invitation and redirect
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              Welcome to {process.env.APP_NAME || "Your App"}!
            </CardTitle>
            <CardDescription>
              Set up your password to complete your invitation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AcceptInvitationForm redirectTo="/dashboard" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
