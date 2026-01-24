// apps/protected/app/s/[subdomain]/auth/email-change/success/page.tsx
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

interface EmailChangeSuccessPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

type StageCopyEntry = {
  title: string;
  description: string;
  nextSteps: string;
};

const stageCopy: Record<string, StageCopyEntry> = {
  generic: {
    title: "Email change confirmed",
    description:
      "Your email address has been updated successfully. Use your new email to sign in.",
    nextSteps: "You can return to the login page to continue.",
  },
  current: {
    title: "Current email verified",
    description:
      "Thanks for confirming your existing email address. We just sent a confirmation link to your new address.",
    nextSteps:
      "Open the message in your new inbox and follow the confirmation link to finish the update.",
  },
  new: {
    title: "New email verified",
    description:
      "Your new email address is confirmed and ready to use. Sign in with it going forward.",
    nextSteps: "Head back to the login page to continue to your account.",
  },
};

import type { ReactElement } from "react";

export default async function EmailChangeSuccessPage({
  searchParams,
}: EmailChangeSuccessPageProps): Promise<ReactElement> {
  const query = await searchParams;
  const stageParam = query.stage;
  const stage = Array.isArray(stageParam) ? stageParam[0] : stageParam;
  const stageKey = stage ?? "generic";
  const stageCopyEntry = stageCopy[stageKey] ?? stageCopy.generic;
  const { title, description, nextSteps } = stageCopyEntry!;

  const loginHref = "/auth/login?reason=email_change_success";

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{nextSteps}</p>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/auth/resend-verification?reason=email_change"
              className="text-sm text-muted-foreground underline underline-offset-4"
            >
              Didn&apos;t get the email?
            </Link>
            <Button asChild>
              <Link href={loginHref}>Back to login</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
