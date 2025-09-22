import { SubdomainLookupForm } from "@/components/subdomain-lookup-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold">Welcome back</h1>
          <p className="text-muted-foreground mt-2">
            Enter your organization&apos;s name to access your workspace
          </p>
        </div>
        <SubdomainLookupForm />
      </div>
    </div>
  );
}
