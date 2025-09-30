// apps/protected/app/s/[subdomain]/(org-settings)/layout.tsx
/**
 * Layout for organization settings routes with tabs navigation
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";
import { Building2, Users, CreditCard } from "lucide-react";
import React from "react";

const orgSettingsTabs = [
  {
    title: "General",
    href: "/org-settings",
    icon: Building2,
  },
  {
    title: "Team",
    href: "/org-settings/team",
    icon: Users,
  },
  {
    title: "Billing",
    href: "/org-settings/billing",
    icon: CreditCard,
  },
];

export default function OrgSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-2xl font-bold">Organization Settings</h1>
              <p className="text-sm text-muted-foreground">
                Manage your organization&apos;s configuration and team
              </p>
            </div>
            <nav className="flex gap-2 overflow-x-auto">
              {orgSettingsTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = pathname === tab.href;

                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
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
