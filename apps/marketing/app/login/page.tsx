import { SubdomainLookupForm } from "@/components/subdomain-lookup-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md">
        <SubdomainLookupForm />
      </div>
    </div>
  );
}
