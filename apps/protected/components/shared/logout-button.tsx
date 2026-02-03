// apps/protected/components/logout-button.tsx
// Provides a tenant-aware sign-out button that clears Supabase session state.
"use client";

import { Button } from "@workspace/ui/components/button";
import { createClient } from "@workspace/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

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
    router.push("/login");
  };

  return (
    <Button
      variant="outline"
      onClick={handleLogout}
      className="flex items-center gap-2"
    >
      <LogOut className="h-4 w-4" />
      Sign out
    </Button>
  );
}
