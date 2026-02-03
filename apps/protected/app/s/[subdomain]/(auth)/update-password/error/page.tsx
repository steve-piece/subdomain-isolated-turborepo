// apps/protected/app/s/[subdomain]/(auth)/update-password/error/page.tsx
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";

import type { ReactElement } from "react";

interface UpdatePasswordErrorPageProps {
  params: Promise<{ subdomain: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function UpdatePasswordErrorPage({
  params,
  searchParams,
}: UpdatePasswordErrorPageProps): Promise<ReactElement> {
  const { subdomain } = await params;
  const query = await searchParams;
  const messageParam = query.message;
  const message = Array.isArray(messageParam) ? messageParam[0] : messageParam;

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Password reset failed</CardTitle>
            <CardDescription>
              We couldn&amp;t update your password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {message && (
              <p className="text-sm text-muted-foreground mb-4">
                Error: {message}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Your reset link may have expired or been used already.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href={`/s/${subdomain}/reset-password`}
              className="text-sm text-muted-foreground underline underline-offset-4"
            >
              Request new reset link
            </Link>
            <Button asChild>
              <Link href={`/s/${subdomain}/login`}>Back to login</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
