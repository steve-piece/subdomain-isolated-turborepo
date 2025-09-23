import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";

interface AcceptInvitationPageProps {
  params: Promise<{ subdomain: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AcceptInvitationPage({
  params,
  searchParams,
}: AcceptInvitationPageProps) {
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
              <CardTitle className="text-2xl text-red-600">
                Invalid Invitation
              </CardTitle>
              <CardDescription>
                There was a problem with your invitation link
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
                <div className="p-3 rounded-md bg-yellow-50 border border-yellow-200">
                  <p className="text-sm text-yellow-700 flex items-center">
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

  // Process the invitation
  const supabase = await createClient();

  const { data, error: verifyError } = await supabase.auth.verifyOtp({
    token_hash,
    type: "invite" as any,
  });

  if (verifyError) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-red-600">
                Invitation Error
              </CardTitle>
              <CardDescription>
                Unable to process your invitation
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

  // If successful, redirect to dashboard
  if (data.user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Welcome to {subdomain}!</CardTitle>
            <CardDescription>Your invitation has been accepted</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 rounded-md bg-green-50 border border-green-200">
                <p className="text-sm text-green-700 flex items-center">
                  <span className="mr-2">✅</span>
                  You've successfully joined the organization!
                </p>
              </div>
              <Link href="/dashboard">
                <Button className="w-full">Go to Dashboard</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
