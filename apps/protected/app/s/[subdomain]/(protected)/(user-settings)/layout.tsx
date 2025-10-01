// apps/protected/app/s/[subdomain]/(protected)/(user-settings)/layout.tsx
/**
 * Layout for user settings routes with tabs navigation
 */
"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";
import { User, Lock, Bell } from "lucide-react";

const userSettingsTabs = [
  {
    title: "Profile",
    path: "profile",
    icon: User,
  },
  {
    title: "Security",
    path: "security",
    icon: Lock,
  },
  {
    title: "Notifications",
    path: "notifications",
    icon: Bell,
  },
];

export default function UserSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const params = useParams();
  const subdomain = params?.subdomain as string;

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-2xl font-bold">User Settings</h1>
              <p className="text-sm text-muted-foreground">
                Manage your personal account preferences
              </p>
            </div>
            <nav className="flex gap-2 overflow-x-auto">
              {userSettingsTabs.map((tab) => {
                const Icon = tab.icon;
                const fullPath = `/s/${subdomain}/${tab.path}`;
                const isActive = pathname.startsWith(fullPath);

                return (
                  <Link
                    key={tab.path}
                    href={fullPath}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                      "hover:bg-accent hover:text-accent-foreground",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.title}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">{children}</div>
      </div>
    </div>
  );
}
