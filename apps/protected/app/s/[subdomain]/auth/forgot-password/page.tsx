// apps/protected/app/s/[subdomain]/auth/forgot-password/page.tsx
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

interface ForgotPasswordPageProps {
  params: Promise<{ subdomain: string }>;
}

export default async function ForgotPasswordPage({
  params,
}: ForgotPasswordPageProps) {
  const { subdomain } = await params;

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md">
        <ForgotPasswordForm subdomain={subdomain} />
      </div>
    </div>
  );
}
