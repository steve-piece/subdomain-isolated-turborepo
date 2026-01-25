import Link from "next/link";

export function HowItWorks() {
  const appDomain =
    process.env.NEXT_PUBLIC_APP_DOMAIN || "protecteddomain.com";

  return (
    <div className="py-12 text-left">
      <h2 className="text-2xl font-bold text-center mb-8">Get started</h2>
      <div className="grid gap-8 md:grid-cols-3">
        <div className="relative flex flex-col items-center text-center p-6 bg-muted/30 rounded-lg border">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary font-semibold">
            1
          </div>
          <h3 className="font-semibold mb-2">Create an account</h3>
          <p className="text-sm text-muted-foreground">
            Go to the{" "}
            <Link href="/signup" className="underline underline-offset-4">
              signup page
            </Link>
            .
          </p>
        </div>

        <div className="relative flex flex-col items-center text-center p-6 bg-muted/30 rounded-lg border">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary font-semibold">
            2
          </div>
          <h3 className="font-semibold mb-2">Confirm email + onboarding</h3>
          <p className="text-sm text-muted-foreground">
            Confirm your signup in email, then complete onboarding to create
            your organization and subdomain.
          </p>
        </div>

        <div className="relative flex flex-col items-center text-center p-6 bg-muted/30 rounded-lg border">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary font-semibold">
            3
          </div>
          <h3 className="font-semibold mb-2">Explore the dashboard</h3>
          <p className="text-sm text-muted-foreground">
            Test features like inviting a team member, creating a project, and more.
          </p>
        </div>
      </div>
    </div>
  );
}
