"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
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
  ShieldCheck,
  Search,
  Settings,
  Crown,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import type { AppRole } from "../../lib/types";
import { hasRoleAccess } from "../../lib/utils/role-hierarchy";

// Default logo URL - used when organization doesn't have a custom logo
const DEFAULT_LOGO_URL =
  "https://qnbqrlpvokzgtfevnuzv.supabase.co/storage/v1/object/public/organization-logos/defaults/logo.png";

interface AppSidebarProps {
  organizationName: string;
  userRole?: AppRole;
  userCapabilities?: string[];
  logoUrl?: string | null;
  userName?: string | null;
}

interface NavigationItem {
  title: string;
  href: string;
  icon: typeof Home;
  description: string;
  requiredCapabilities?: string[];
  requiredRoles?: AppRole[];
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
  organizationName,
  userRole = "member",
  userCapabilities = [],
  logoUrl,
  userName,
}: AppSidebarProps) {
  // Debug: Log authentication context
  React.useEffect(() => {
    console.log("🔐 Sidebar Auth Context:", {
      userRole,
      capabilitiesCount: userCapabilities.length,
      capabilities: userCapabilities,
    });
  }, [userRole, userCapabilities]);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [showSearchDropdown, setShowSearchDropdown] = React.useState(false);
  const [selectedSearchIndex, setSelectedSearchIndex] = React.useState(0);
  const [expandedGroups, setExpandedGroups] = React.useState<
    Record<string, boolean>
  >({
    Main: true,
    Organization: true,
  });
  const [settingsExpanded, setSettingsExpanded] = React.useState(true);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(() => {
    // Load collapsed state from localStorage
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidebar-collapsed");
      return saved === "true";
    }
    return false;
  });
  const pathname = usePathname();
  const router = useRouter();
  const { addToast } = useToast();
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const toggleGroup = (title: string) => {
    setExpandedGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const toggleSidebar = () => {
    const newCollapsedState = !isCollapsed;
    setIsCollapsed(newCollapsedState);
    // Persist to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("sidebar-collapsed", String(newCollapsedState));
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const result = await signOut();
      if (result.success) {
        // Redirect to login page on same subdomain (like LogoutButton)
        router.push("/auth/login");
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
      // Check role requirements using hierarchy
      if (item.requiredRoles && item.requiredRoles.length > 0) {
        const hasRole = hasRoleAccess(userRole, item.requiredRoles);
        if (!hasRole) {
          console.log(
            `⛔ Access denied to "${item.title}": role hierarchy check failed`,
            {
              userRole,
              requiredRoles: item.requiredRoles,
            }
          );
          return false;
        }
      }

      // Check capability requirements
      if (item.requiredCapabilities && item.requiredCapabilities.length > 0) {
        const hasAllCapabilities = item.requiredCapabilities.every((cap) =>
          userCapabilities.includes(cap)
        );
        if (!hasAllCapabilities) {
          const missingCaps = item.requiredCapabilities.filter(
            (cap) => !userCapabilities.includes(cap)
          );
          console.log(
            `⛔ Access denied to "${item.title}": missing capabilities`,
            {
              required: item.requiredCapabilities,
              missing: missingCaps,
              userHas: userCapabilities,
            }
          );
          return false;
        }
      }

      console.log(`✅ Access granted to "${item.title}"`);
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

  /**
   * Flat list of search results for dropdown
   */
  const searchResults = React.useMemo(() => {
    if (!searchQuery.trim()) return [];

    const results: Array<{
      title: string;
      href: string;
      icon: typeof Home;
      description: string;
      groupTitle: string;
    }> = [];

    // Add navigation items
    filteredGroups.forEach((group) => {
      group.items.forEach((item) => {
        results.push({
          ...item,
          groupTitle: group.title,
        });
      });
    });

    // Add settings items
    const query = searchQuery.toLowerCase();
    userSettingsItems
      .filter(hasAccess)
      .filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query)
      )
      .forEach((item) => {
        results.push({
          ...item,
          groupTitle: "Settings",
        });
      });

    return results;
  }, [searchQuery, filteredGroups, hasAccess]);

  /**
   * Handle keyboard navigation in search
   */
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!searchResults.length) return;

    if (e.key === "Enter") {
      e.preventDefault();
      const selectedResult = searchResults[selectedSearchIndex];
      if (selectedResult) {
        router.push(selectedResult.href);
        setSearchQuery("");
        setShowSearchDropdown(false);
        searchInputRef.current?.blur();
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedSearchIndex((prev) =>
        prev < searchResults.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedSearchIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Escape") {
      e.preventDefault();
      setShowSearchDropdown(false);
      searchInputRef.current?.blur();
    }
  };

  /**
   * Update search and show dropdown
   */
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowSearchDropdown(value.trim().length > 0);
    setSelectedSearchIndex(0);
  };

  /**
   * Close dropdown when clicking outside
   */
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowSearchDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-background h-screen sticky top-0 transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Header with Toggle */}
        <div className="p-4">
          <div className="flex items-start justify-end mb-3">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="h-5 w-5" />
              ) : (
                <PanelLeftClose className="h-5 w-5" />
              )}
            </button>
          </div>
          {!isCollapsed && (
            <div className="flex items-center gap-3">
              <div className="flex aspect-square size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 text-white overflow-hidden">
                <Image
                  src={logoUrl || DEFAULT_LOGO_URL}
                  alt={`${organizationName} logo`}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-sm truncate">
                  {organizationName}
                </h2>
                <p className="text-xs text-muted-foreground truncate">
                  {userName || "Welcome"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Search */}
        {!isCollapsed && (
          <div className="px-3 py-2 relative">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                type="search"
                placeholder="Search..."
                className="w-full rounded-2xl bg-muted pl-9 pr-4 py-2"
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => searchQuery && setShowSearchDropdown(true)}
              />
            </div>

            {/* Search Results Dropdown */}
            {showSearchDropdown && searchResults.length > 0 && (
              <div className="absolute left-3 right-3 mt-2 bg-popover border rounded-lg shadow-lg max-h-64 overflow-y-auto z-50">
                {searchResults.map((result, index) => {
                  const Icon = result.icon;
                  const isSelected = index === selectedSearchIndex;

                  return (
                    <Link
                      key={result.href}
                      href={result.href}
                      onClick={() => {
                        setSearchQuery("");
                        setShowSearchDropdown(false);
                      }}
                      className={cn(
                        "flex items-start gap-3 px-3 py-2 hover:bg-muted transition-colors border-b last:border-b-0",
                        isSelected && "bg-muted"
                      )}
                    >
                      <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {result.title}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {result.groupTitle}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {result.description}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* No Results */}
            {showSearchDropdown &&
              searchQuery &&
              searchResults.length === 0 && (
                <div className="absolute left-3 right-3 mt-2 bg-popover border rounded-lg shadow-lg p-3 z-50">
                  <p className="text-sm text-muted-foreground text-center">
                    No results found for &quot;{searchQuery}&quot;
                  </p>
                </div>
              )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <div className="space-y-1">
            {filteredGroups.map((group) => (
              <div key={group.title} className="mb-1">
                {!isCollapsed && (
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
                )}

                {(isCollapsed || expandedGroups[group.title]) && (
                  <div
                    className={cn(
                      "space-y-1",
                      !isCollapsed && "mt-1 ml-6 border-l pl-3"
                    )}
                  >
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
                          title={isCollapsed ? item.title : undefined}
                          className={cn(
                            "flex items-center rounded-2xl px-3 py-2 text-sm hover:bg-muted transition-colors",
                            isActive &&
                              "bg-primary/10 text-primary font-medium",
                            isCollapsed && "justify-center"
                          )}
                        >
                          {isCollapsed ? (
                            <Icon className="h-5 w-5" />
                          ) : (
                            <>
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
                            </>
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
            {isCollapsed ? (
              // Collapsed: Show settings items as icons
              <div className="space-y-1">
                {userSettingsItems.filter(hasAccess).map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={item.title}
                      className={cn(
                        "flex items-center justify-center rounded-2xl px-3 py-2 text-sm hover:bg-muted transition-colors",
                        isActive && "bg-primary/10 text-primary font-medium"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </Link>
                  );
                })}
              </div>
            ) : (
              // Expanded: Show settings dropdown
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
            )}

            {/* User Info & Logout */}
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              title={isCollapsed ? "Sign Out" : undefined}
              className={cn(
                "flex w-full items-center rounded-2xl px-3 py-2 text-sm font-medium hover:bg-muted transition-colors",
                isCollapsed && "justify-center"
              )}
            >
              {isCollapsed ? (
                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                  {organizationName.charAt(0).toUpperCase()}
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                      {organizationName.charAt(0).toUpperCase()}
                    </div>
                    <span>{isLoggingOut ? "Signing out..." : "Sign Out"}</span>
                  </div>
                  <Badge variant="outline" className="ml-auto capitalize">
                    {userRole}
                  </Badge>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
