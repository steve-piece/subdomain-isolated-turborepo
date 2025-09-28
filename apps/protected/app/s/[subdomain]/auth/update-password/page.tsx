// apps/protected/app/s/[subdomain]/auth/update-password/page.tsx
import { createClient } from "@/lib/supabase/server";
import { UpdatePasswordForm } from "@/components/update-password-form";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import Link from "next/link";

interface UpdatePasswordPageProps {
  params: Promise<{ subdomain: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function UpdatePasswordPage({
  params,
  searchParams,
}: UpdatePasswordPageProps) {
  const { subdomain } = await params;
  const searchParamsData = await searchParams;

  const token_hash = searchParamsData.token_hash as string;
  const type = searchParamsData.type as string;
  const error = searchParamsData.error as string;

  // Handle direct error from URL parameters
  if (error) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-red-600">
                Reset Link Error
              </CardTitle>
              <CardDescription>
                There was a problem with your password reset link
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 rounded-md bg-red-50 border border-red-200">
                  <p className="text-sm text-red-700 flex items-center">
                    <span className="mr-2">⚠️</span>
                    {decodeURIComponent(error)}
                  </p>
                </div>
                <div className="text-center space-y-2">
                  <Link href="/auth/forgot-password">
                    <Button className="w-full">Request New Reset Link</Button>
                  </Link>
                  <div className="text-sm">
                    <Link
                      href="/auth/login"
                      className="underline underline-offset-4"
                    >
                      ← Back to Login
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Check if required parameters are present
  if (!token_hash || !type) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Invalid Reset Link</CardTitle>
              <CardDescription>
                This password reset link appears to be incomplete
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 rounded-md bg-yellow-50 border border-yellow-200">
                  <p className="text-sm text-yellow-700 flex items-center">
                    <span className="mr-2">⚠️</span>
                    Please use the complete password reset link from your email.
                  </p>
                </div>
                <div className="text-center space-y-2">
                  <Link href="/auth/forgot-password">
                    <Button className="w-full">Request New Reset Link</Button>
                  </Link>
                  <div className="text-sm">
                    <Link
                      href="/auth/login"
                      className="underline underline-offset-4"
                    >
                      ← Back to Login
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Validate the password reset token
  const supabase = await createClient();

  const { data, error: verifyError } = await supabase.auth.verifyOtp({
    token_hash,
    type: "recovery",
  });

  // Handle expired or invalid token
  if (verifyError) {
    const isExpired =
      verifyError.message.toLowerCase().includes("expired") ||
      verifyError.message.toLowerCase().includes("invalid");

    return (
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-red-600">
                {isExpired ? "Reset Link Expired" : "Invalid Reset Link"}
              </CardTitle>
              <CardDescription>
                {isExpired
                  ? "Your password reset link has expired"
                  : "Unable to verify your password reset link"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 rounded-md bg-red-50 border border-red-200">
                  <p className="text-sm text-red-700 flex items-center">
                    <span className="mr-2">⚠️</span>
                    {isExpired
                      ? "This link has expired for security reasons. Please request a new password reset link."
                      : verifyError.message}
                  </p>
                </div>
                <div className="text-center space-y-2">
                  <Link href="/auth/forgot-password">
                    <Button className="w-full">Request New Reset Link</Button>
                  </Link>
                  <div className="text-sm">
                    <Link
                      href="/auth/login"
                      className="underline underline-offset-4"
                    >
                      ← Back to Login
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // If token is valid, check if user is authenticated (verifyOtp should have signed them in)
  if (!data.user) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-red-600">
                Authentication Error
              </CardTitle>
              <CardDescription>
                Unable to authenticate your password reset request
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 rounded-md bg-red-50 border border-red-200">
                  <p className="text-sm text-red-700 flex items-center">
                    <span className="mr-2">⚠️</span>
                    There was a problem with your reset link. Please try
                    requesting a new one.
                  </p>
                </div>
                <div className="text-center space-y-2">
                  <Link href="/auth/forgot-password">
                    <Button className="w-full">Request New Reset Link</Button>
                  </Link>
                  <div className="text-sm">
                    <Link
                      href="/auth/login"
                      className="underline underline-offset-4"
                    >
                      ← Back to Login
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // If everything is valid, show the password update form
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md">
        <UpdatePasswordForm subdomain={subdomain} />
      </div>
    </div>
  );
}
