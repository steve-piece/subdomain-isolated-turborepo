// apps/marketing/app/signup/page.tsx
import { OrganizationSignUpForm } from "@/components/organization-signup-form";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md">
        <OrganizationSignUpForm />
      </div>
    </div>
  );
}
