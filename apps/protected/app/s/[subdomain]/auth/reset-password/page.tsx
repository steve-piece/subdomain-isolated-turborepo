// apps/protected/app/s/[subdomain]/auth/reset-password/page.tsx
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;

  return (
    <div className="flex h-screen w-full items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">Reset password</h1>
          <p className="text-muted-foreground">for {subdomain}</p>
        </div>
        <ForgotPasswordForm subdomain={subdomain} />
      </div>
    </div>
  );
}
