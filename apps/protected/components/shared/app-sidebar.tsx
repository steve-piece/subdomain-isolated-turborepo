"use client";

import * as React from "react";
import Link from "next/link";
import NextImage from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";
import { Badge } from "@workspace/ui/components/badge";
import { useToast } from "@workspace/ui/components/toast";
import { signOut } from "@actions/billing/auth";
import {
  Home,
  Users,
  Building2,
  CreditCard,
  Bell,
  User,
  Lock,
  LayoutDashboard,
  ShieldCheck,
  Search,
  Crown,
  Folder,
  LogOut,
  ChevronRight,
  MoreVertical,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@workspace/ui/components/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import type { AppRole } from "../../lib/types";
import { hasRoleAccess } from "../../lib/utils/role-hierarchy";

// Set to true to enable debug logging for sidebar access checks
const DEBUG_SIDEBAR_ACCESS = false;

// Default logo URL - used when organization doesn't have a custom logo
const DEFAULT_LOGO_URL =
  process.env.NEXT_PUBLIC_DEFAULT_LOGO_URL || "INSERT_DEFAULT_LOGO_URL";

/**
 * Validates that navigation hrefs are internal paths only (no external URLs or injections)
 * SECURITY: This prevents any potential URL injection even though all hrefs are static strings
 */
function isValidNavigationPath(href: string): boolean {
  // Must start with / and not contain any suspicious patterns
  return (
    href.startsWith("/") &&
    !href.includes("//") &&
    !href.includes("javascript:") &&
    !href.includes("data:") &&
    !href.includes("<") &&
    !href.includes(">")
  );
}

interface AppSidebarProps {
  organizationName: string;
  userRole?: AppRole;
  userCapabilities?: string[];
  logoUrl?: string | null;
  userName?: string | null;
  userAvatarUrl?: string | null;
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
// SECURITY NOTE: All href values in this array are static strings defined at build time.
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
        title: "Projects",
        href: "/projects",
        icon: Folder,
        description: "Manage your projects",
        requiredCapabilities: ["projects.view"],
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

// User settings items for the user menu dropdown
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
  userAvatarUrl,
  ...props
}: AppSidebarProps & React.ComponentProps<typeof Sidebar>) {
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
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { addToast } = useToast();
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const { isMobile } = useSidebar();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const result = await signOut();
      if (result.success) {
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
          if (DEBUG_SIDEBAR_ACCESS) {
            console.log(
              `⛔ Access denied to "${item.title}": role hierarchy check failed`,
              {
                userRole,
                requiredRoles: item.requiredRoles,
              }
            );
          }
          return false;
        }
      }

      // Check capability requirements
      if (item.requiredCapabilities && item.requiredCapabilities.length > 0) {
        const hasAllCapabilities = item.requiredCapabilities.every((cap) =>
          userCapabilities.includes(cap)
        );
        if (!hasAllCapabilities) {
          if (DEBUG_SIDEBAR_ACCESS) {
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
          }
          return false;
        }
      }

      if (DEBUG_SIDEBAR_ACCESS) {
        console.log(`✅ Access granted to "${item.title}"`);
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
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard" className="flex items-center gap-2">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 text-white overflow-hidden">
                  <NextImage
                    src={logoUrl || DEFAULT_LOGO_URL}
                    alt={`${organizationName} logo`}
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {organizationName}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {userName || "Welcome"}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Search - only show when expanded */}
        <div className="relative group-data-[collapsible=icon]:hidden px-2">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <SidebarInput
              ref={searchInputRef}
              type="search"
              placeholder="Search..."
              className="pl-9"
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => searchQuery && setShowSearchDropdown(true)}
            />
          </div>

          {/* Search Results Dropdown */}
          {showSearchDropdown && searchResults.length > 0 && (
            <div className="absolute left-2 right-2 mt-2 bg-popover border rounded-lg shadow-lg max-h-64 overflow-y-auto z-50">
              {searchResults.map((result, index) => {
                const Icon = result.icon;
                const isSelected = index === selectedSearchIndex;

                // SECURITY: Validate href is a safe internal path
                if (!isValidNavigationPath(result.href)) {
                  console.error(
                    "Invalid navigation path detected:",
                    result.href
                  );
                  return null;
                }

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
          {showSearchDropdown && searchQuery && searchResults.length === 0 && (
            <div className="absolute left-2 right-2 mt-2 bg-popover border rounded-lg shadow-lg p-3 z-50">
              <p className="text-sm text-muted-foreground text-center">
                No results found for &quot;{searchQuery}&quot;
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {filteredGroups.map((group) => (
          <Collapsible
            key={group.title}
            defaultOpen
            className="group/collapsible"
          >
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="flex w-full items-center justify-between">
                  {group.title}
                  <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
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

                      // SECURITY: Validate href is a safe internal path
                      if (!isValidNavigationPath(item.href)) {
                        console.error(
                          "Invalid navigation path detected:",
                          item.href
                        );
                        return null;
                      }

                      return (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton
                            asChild
                            isActive={isActive}
                            tooltip={item.title}
                          >
                            <Link href={item.href}>
                              <Icon />
                              <span>{item.title}</span>
                              {item.isPremium && (
                                <Badge
                                  variant="outline"
                                  className="ml-auto rounded-full h-5"
                                >
                                  <Crown className="h-3 w-3" />
                                </Badge>
                              )}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage
                      src={userAvatarUrl || undefined}
                      alt={userName || "User"}
                    />
                    <AvatarFallback className="rounded-lg">
                      {userName?.charAt(0)?.toUpperCase() ||
                        organizationName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {userName || "User"}
                    </span>
                    <span className="truncate text-xs capitalize">
                      {userRole}
                    </span>
                  </div>
                  <MoreVertical className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage
                        src={userAvatarUrl || undefined}
                        alt={userName || "User"}
                      />
                      <AvatarFallback className="rounded-lg">
                        {userName?.charAt(0)?.toUpperCase() ||
                          organizationName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {userName || "User"}
                      </span>
                      <span className="truncate text-xs capitalize">
                        {userRole}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {userSettingsItems.filter(hasAccess).map((item) => {
                    const Icon = item.icon;
                    return (
                      <DropdownMenuItem key={item.href} asChild>
                        <Link href={item.href}>
                          <Icon className="mr-2 h-4 w-4" />
                          {item.title}
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {isLoggingOut ? "Signing out..." : "Sign Out"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
