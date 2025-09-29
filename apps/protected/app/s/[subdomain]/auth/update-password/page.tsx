// apps/protected/app/s/[subdomain]/auth/update-password/page.tsx
import { UpdatePasswordForm } from "@/components/update-password-form";

export default function UpdatePasswordPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md">
        <UpdatePasswordForm className="flex flex-col gap-6" />
      </div>
    </div>
  );
}
