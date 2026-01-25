// apps/marketing/app/page.tsx
// Landing page introducing the product with CTAs into signup and login flows.
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import { SentryTestButton } from "@/components/sentry-test-button";
import { HowItWorks } from "@/components/landing/how-it-works";

export default function Page() {
  return (
    <div className="flex items-center justify-center min-h-svh p-6 py-24">
      <div className="text-center max-w-4xl">
        <h1 className="text-4xl font-bold mb-6">Enterprise B2B SaaS Starter</h1>
        <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
          The ultimate foundation for building secure, multi-tenant B2B
          applications. Launch faster with a production-ready template designed
          for scale, security, and extensibility.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Button asChild size="lg">
            <Link href="/signup">Create Organization</Link>
          </Button>

          <Button variant="outline" asChild size="lg">
            <Link href="/login">Sign In</Link>
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16 text-left">
          <div className="space-y-3 p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
            <h3 className="font-semibold text-lg">Subdomain Isolation</h3>
            <p className="text-sm text-muted-foreground">
              True multi-tenancy where every organization gets their own
              dedicated subdomain (org.app.com) for maximum security and data
              separation.
            </p>
          </div>
          <div className="space-y-3 p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
            <h3 className="font-semibold text-lg">Auth & RBAC Ready</h3>
            <p className="text-sm text-muted-foreground">
              Complete authentication system with granular Role-Based Access
              Control. Manage permissions and team members out of the box.
            </p>
          </div>
          <div className="space-y-3 p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
            <h3 className="font-semibold text-lg">Built to Extend</h3>
            <p className="text-sm text-muted-foreground">
              A clean, modular architecture on Next.js and Supabase. Easily
              customize the UI and add new features without fighting the
              framework.
            </p>
          </div>
        </div>

        <HowItWorks />

        <div className="mt-12 text-sm text-muted-foreground">
          <p>
            Access your workspace at <em>yourcompany.</em>
            {process.env.NEXT_PUBLIC_APP_DOMAIN || "protecteddomain.com"}
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
