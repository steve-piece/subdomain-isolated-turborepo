// apps/protected/app/s/[subdomain]/auth/update-password/page.tsx
import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";
import type { EmailOtpType } from "@supabase/supabase-js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";

interface UpdatePasswordPageProps {
  params: Promise<{ subdomain: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function UpdatePasswordPage({
  params,
  searchParams,
}: UpdatePasswordPageProps) {
  noStore();
  const { subdomain } = await params;
  const searchParamsData = await searchParams;

  const token_hash = searchParamsData.token_hash as string;
  const type = searchParamsData.type as string;
  const access_token = searchParamsData.access_token as string;
  const refresh_token = searchParamsData.refresh_token as string;
  const error = searchParamsData.error as string;

  console.log("🔍 UpdatePasswordPage - Server-side params:", {
    subdomain,
    tokenHash: token_hash ? `${token_hash.slice(0, 20)}...` : null,
    type,
    accessToken: access_token ? `${access_token.slice(0, 10)}...` : null,
    refreshToken: refresh_token ? `${refresh_token.slice(0, 10)}...` : null,
    error: error || null,
  });

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

  // For password recovery, render form and let client handle PASSWORD_RECOVERY event
  // Do NOT verify OTP server-side as it consumes the single-use token
  if (token_hash && type === "recovery") {
    console.log(
      "🔄 UpdatePasswordPage - Recovery tokens detected, rendering form for client-side handling"
    );

    return (
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md">
          <UpdatePasswordForm
            className="flex flex-col gap-6"
            subdomain={subdomain}
            isResetFlow={true}
          />
        </div>
      </div>
    );
  }

  // For other OTP types (email confirmation, etc.), verify server-side
  if (token_hash && type) {
    console.log(
      "🔄 UpdatePasswordPage - Server-side OTP verification starting for type:",
      type
    );

    try {
      const supabase = await createClient();

      // Verify OTP server-side to establish tenant-scoped session
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        token_hash,
        type: type as EmailOtpType,
      });

      if (verifyError) {
        console.error(
          "🚨 UpdatePasswordPage - Server-side OTP verification failed:",
          verifyError
        );

        return (
          <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-md">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl text-red-600">
                    Verification Failed
                  </CardTitle>
                  <CardDescription>
                    Your verification link is invalid or expired
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-3 rounded-md bg-red-50 border border-red-200">
                      <p className="text-sm text-red-700 flex items-center">
                        <span className="mr-2">⚠️</span>
                        {verifyError.message}
                      </p>
                    </div>
                    <div className="text-center space-y-2">
                      <Link href="/auth/login">
                        <Button className="w-full">Back to Login</Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );
      }

      if (!data.user) {
        console.error(
          "🚨 UpdatePasswordPage - OTP verified but no user returned"
        );

        return (
          <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-md">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl text-red-600">
                    Verification Failed
                  </CardTitle>
                  <CardDescription>
                    Unable to verify your identity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-3 rounded-md bg-red-50 border border-red-200">
                      <p className="text-sm text-red-700 flex items-center">
                        <span className="mr-2">⚠️</span>
                        Verification failed - no user found
                      </p>
                    </div>
                    <div className="text-center space-y-2">
                      <Link href="/auth/login">
                        <Button className="w-full">Back to Login</Button>
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
        "✅ UpdatePasswordPage - Server-side OTP verification successful:",
        {
          userId: data.user.id,
          userEmail: data.user.email,
          subdomain,
        }
      );

      // Server-side verification successful, render form with tenant context
      return (
        <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-md">
            <UpdatePasswordForm
              className="flex flex-col gap-6"
              subdomain={subdomain}
              isResetFlow={false}
              userEmail={data.user.email}
            />
          </div>
        </div>
      );
    } catch (error) {
      console.error(
        "🚨 UpdatePasswordPage - Server-side verification error:",
        error
      );

      return (
        <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-md">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl text-red-600">
                  Verification Error
                </CardTitle>
                <CardDescription>
                  An error occurred while processing your link
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 rounded-md bg-red-50 border border-red-200">
                    <p className="text-sm text-red-700 flex items-center">
                      <span className="mr-2">⚠️</span>
                      {error instanceof Error
                        ? error.message
                        : "Unknown error occurred"}
                    </p>
                  </div>
                  <div className="text-center space-y-2">
                    <Link href="/auth/login">
                      <Button className="w-full">Back to Login</Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }
  }

  // No reset tokens - render form for authenticated users
  console.log(
    "🔍 UpdatePasswordPage - No reset tokens, rendering form for authenticated users"
  );

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md">
        <UpdatePasswordForm
          className="flex flex-col gap-6"
          subdomain={subdomain}
          isResetFlow={false}
        />
      </div>
    </div>
  );
}
