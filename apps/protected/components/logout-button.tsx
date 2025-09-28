// apps/protected/components/logout-button.tsx
"use client";

import { Button } from "@workspace/ui/components/button";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface LogoutButtonProps {
  subdomain: string;
}

export function LogoutButton({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  subdomain: _subdomain,
}: LogoutButtonProps) {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <Button
      variant="outline"
      onClick={handleLogout}
      className="flex items-center gap-2"
    >
      <span>🚪</span>
      Sign out
    </Button>
  );
}
