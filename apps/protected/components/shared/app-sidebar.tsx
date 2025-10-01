"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";
import { Input } from "@workspace/ui/components/input";
import { Badge } from "@workspace/ui/components/badge";
import { useToast } from "@workspace/ui/components/toast";
import { signOut } from "@actions/auth";
import {
  Home,
  Users,
  Building2,
  CreditCard,
  Bell,
  User,
  Lock,
  ChevronDown,
  LayoutDashboard,
  Briefcase,
  ShieldCheck,
  Search,
  Settings,
  Crown,
} from "lucide-react";

interface AppSidebarProps {
  subdomain: string;
  organizationName: string;
  userRole?: string;
  userCapabilities?: string[];
}

interface NavigationItem {
  title: string;
  href: string;
  icon: typeof Home;
  description: string;
  requiredCapabilities?: string[];
  requiredRoles?: string[];
  isPremium?: boolean;
}

interface NavigationGroup {
  title: string;
  items: NavigationItem[];
}

// Define navigation structure with RBAC requirements
const navigationGroups: NavigationGroup[] = [
  {
    title: "Main",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: Home,
        description: "Overview and quick actions",
      },
      {
        title: "Admin Panel",
        href: "/admin",
        icon: LayoutDashboard,
        description: "Organization management",
        requiredRoles: ["owner", "admin", "superadmin"],
        requiredCapabilities: ["org.settings.view"],
      },
    ],
  },
  {
    title: "Organization",
    items: [
      {
        title: "General",
        href: "/org-settings",
        icon: Building2,
        description: "Company details",
        requiredRoles: ["owner", "admin", "superadmin"],
        requiredCapabilities: ["org.settings.view"],
      },
      {
        title: "Team",
        href: "/org-settings/team",
        icon: Users,
        description: "Manage members",
        requiredRoles: ["owner", "admin", "superadmin"],
        requiredCapabilities: ["team.view"],
      },
      {
        title: "Roles",
        href: "/org-settings/roles",
        icon: ShieldCheck,
        description: "Custom permissions",
        requiredRoles: ["owner"],
        requiredCapabilities: ["org.settings.view"],
        isPremium: true,
      },
      {
        title: "Billing",
        href: "/org-settings/billing",
        icon: CreditCard,
        description: "Plans & invoices",
        requiredRoles: ["owner", "admin"],
        requiredCapabilities: ["billing.view"],
        isPremium: true,
      },
    ],
  },
];

// User settings items for the bottom settings section
const userSettingsItems: NavigationItem[] = [
  {
    title: "Profile",
    href: "/profile",
    icon: User,
    description: "Personal information",
    requiredCapabilities: ["profile.edit_own"],
  },
  {
    title: "Security",
    href: "/security",
    icon: Lock,
    description: "Password & 2FA",
    requiredCapabilities: ["security.view_own"],
  },
  {
    title: "Notifications",
    href: "/notifications",
    icon: Bell,
    description: "Email & alerts",
    requiredCapabilities: ["notifications.edit_own"],
  },
];

export function AppSidebar({
  subdomain,
  organizationName,
  userRole = "member",
  userCapabilities = [],
}: AppSidebarProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [expandedGroups, setExpandedGroups] = React.useState<
    Record<string, boolean>
  >({
    Main: false,
    Organization: false,
  });
  const [settingsExpanded, setSettingsExpanded] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const pathname = usePathname();
  const { addToast } = useToast();

  const toggleGroup = (title: string) => {
    setExpandedGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const result = await signOut();
      if (result.success) {
        // Redirect to marketing site or login page
        const marketingDomain =
          process.env.NEXT_PUBLIC_MARKETING_DOMAIN || "bask-app.com";
        window.location.href = `https://${marketingDomain}`;
      } else {
        addToast({
          title: "Error",
          description: result.error || "Failed to sign out",
          variant: "error",
        });
        setIsLoggingOut(false);
      }
    } catch {
      addToast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "error",
      });
      setIsLoggingOut(false);
    }
  };

  /**
   * Check if user has access to a navigation item
   */
  const hasAccess = React.useCallback(
    (item: NavigationItem): boolean => {
      // Check role requirements
      if (item.requiredRoles && item.requiredRoles.length > 0) {
        if (!item.requiredRoles.includes(userRole)) {
          return false;
        }
      }

      // Check capability requirements
      if (item.requiredCapabilities && item.requiredCapabilities.length > 0) {
        const hasAllCapabilities = item.requiredCapabilities.every((cap) =>
          userCapabilities.includes(cap)
        );
        if (!hasAllCapabilities) {
          return false;
        }
      }

      return true;
    },
    [userRole, userCapabilities]
  );

  /**
   * Filter navigation groups to show only accessible items
   */
  const filteredGroups = React.useMemo(() => {
    let groups = navigationGroups
      .map((group) => ({
        ...group,
        items: group.items.filter(hasAccess),
      }))
      .filter((group) => group.items.length > 0);

    // Filter by search query if present
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      groups = groups
        .map((group) => ({
          ...group,
          items: group.items.filter(
            (item) =>
              item.title.toLowerCase().includes(query) ||
              item.description.toLowerCase().includes(query)
          ),
        }))
        .filter((group) => group.items.length > 0);
    }

    return groups;
  }, [hasAccess, searchQuery]);

  return (
    <aside className="flex flex-col border-r bg-background h-screen sticky top-0 w-64">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex aspect-square size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 text-white">
              <Briefcase className="size-5" />
            </div>
            <div>
              <h2 className="font-semibold text-sm truncate max-w-[140px]">
                {organizationName}
              </h2>
              <p className="text-xs text-muted-foreground">{subdomain}</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              className="w-full rounded-2xl bg-muted pl-9 pr-4 py-2"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <div className="space-y-1">
            {filteredGroups.map((group) => (
              <div key={group.title} className="mb-1">
                <button
                  className={cn(
                    "flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm font-medium hover:bg-muted"
                  )}
                  onClick={() => toggleGroup(group.title)}
                >
                  <span>{group.title}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      expandedGroups[group.title] ? "rotate-180" : ""
                    )}
                  />
                </button>

                {expandedGroups[group.title] && (
                  <div className="mt-1 ml-6 space-y-1 border-l pl-3">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isExactMatch = pathname === item.href;
                      const isNestedRoute = pathname?.startsWith(
                        item.href + "/"
                      );
                      const hasSiblingMatch = group.items.some(
                        (sibling) =>
                          sibling.href !== item.href &&
                          (pathname === sibling.href ||
                            pathname?.startsWith(sibling.href + "/"))
                      );
                      const isActive =
                        isExactMatch || (isNestedRoute && !hasSiblingMatch);

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "flex items-center justify-between rounded-2xl px-3 py-2 text-sm hover:bg-muted transition-colors",
                            isActive && "bg-primary/10 text-primary font-medium"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {item.title}
                          </div>
                          {item.isPremium && (
                            <Badge
                              variant="outline"
                              className="ml-auto rounded-full px-2 py-0.5 text-xs"
                            >
                              <Crown className="h-3 w-3" />
                            </Badge>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer - Settings & User */}
        <div className="border-t p-3">
          <div className="space-y-1">
            {/* Settings Section */}
            <div>
              <button
                className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm font-medium hover:bg-muted"
                onClick={() => setSettingsExpanded(!settingsExpanded)}
              >
                <div className="flex items-center gap-3">
                  <Settings className="h-5 w-5" />
                  <span>Settings</span>
                </div>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    settingsExpanded ? "rotate-180" : ""
                  )}
                />
              </button>

              {settingsExpanded && (
                <div className="mt-1 ml-6 space-y-1 border-l pl-3">
                  {userSettingsItems.filter(hasAccess).map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2 rounded-2xl px-3 py-2 text-sm hover:bg-muted",
                          isActive && "bg-primary/10 text-primary font-medium"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {item.title}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* User Info & Logout */}
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                  {organizationName.charAt(0).toUpperCase()}
                </div>
                <span>{isLoggingOut ? "Signing out..." : "Sign Out"}</span>
              </div>
              <Badge variant="outline" className="ml-auto capitalize">
                {userRole}
              </Badge>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
