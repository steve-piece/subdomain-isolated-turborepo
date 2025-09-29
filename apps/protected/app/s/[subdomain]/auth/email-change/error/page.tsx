// apps/protected/app/s/[subdomain]/auth/email-change/error/page.tsx
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

interface EmailChangeErrorPageProps {
  params: Promise<{ subdomain: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const reasonCopy: Record<
  string,
  { title: string; description: string; action?: string }
> = {
  expired: {
    title: "Email change link expired",
    description:
      "The confirmation link is no longer valid. Request a new email change from your account settings.",
    action: "Return to login",
  },
  unauthorized: {
    title: "Email change not authorized",
    description:
      "We couldn’t verify this request. Please ensure you’re using the latest link from your inbox.",
    action: "Try again",
  },
};

function resolveCopy(reasonParam?: string | string[]) {
  const reason = Array.isArray(reasonParam) ? reasonParam[0] : reasonParam;
  return reason && reasonCopy[reason]
    ? { reason, ...reasonCopy[reason] }
    : {
        reason: "unknown",
        title: "We couldn’t finish updating your email",
        description:
          "Please request a new confirmation email from your account settings and try again.",
        action: "Back to login",
      };
}

export default async function EmailChangeErrorPage({
  params,
  searchParams,
}: EmailChangeErrorPageProps) {
  const { subdomain } = await params;
  const query = await searchParams;
  const messageParam = query.message;
  const resolved = resolveCopy(query.reason);
  const message = Array.isArray(messageParam) ? messageParam[0] : messageParam;
  const fallbackAction = "Back to login";
  const { title, description, action } = resolved;

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            {message ? (
              <p className="text-sm text-muted-foreground">
                Server message: {message}
              </p>
            ) : null}
          </CardContent>
          <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href={`/s/${subdomain}/auth/resend-verification?reason=email_change`}
              className="text-sm text-muted-foreground underline underline-offset-4"
            >
              Need another confirmation email?
            </Link>
            <Button asChild>
              <Link href={`/s/${subdomain}/auth/login`}>Back to login</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
