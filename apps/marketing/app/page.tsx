// apps/marketing/app/page.tsx
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import { SentryTestButton } from "@/components/sentry-test-button";

export default function Page() {
  return (
    <div className="flex items-center justify-center min-h-svh p-6">
      <div className="text-center max-w-2xl">
        <h1 className="text-4xl font-bold mb-6">Your App Platform</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Create your organization and start collaborating with your team in a
          secure, subdomain-based workspace.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/signup">Create Organization</Link>
          </Button>

          <Button variant="outline" asChild size="lg">
            <Link href="/login">Sign In</Link>
          </Button>
        </div>

        <div className="mt-12 text-sm text-muted-foreground">
          <p>
            Each organization gets their own secure subdomain.
            <br />
            Access your workspace at yourcompany.
            {process.env.NEXT_PUBLIC_APP_DOMAIN || "yourapp.com"}
          </p>
        </div>

        {/* Show Sentry test component only in development */}
        {process.env.NODE_ENV === "development" && (
          <div className="mt-12">
            <SentryTestButton />
          </div>
        )}
      </div>
    </div>
  );
}
