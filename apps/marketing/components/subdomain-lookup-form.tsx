// apps/marketing/components/subdomain-lookup-form.tsx
// Marketing entry form that searches/redirects users to their tenant workspace.
"use client";

import { cn } from "@workspace/ui/lib/utils";
import {
  isValidSubdomain,
  buildSubdomainUrl,
} from "@workspace/ui/lib/subdomains";
import {
  searchTenants,
  verifyTenant,
  type TenantSearchResult,
} from "@/app/actions";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Spinner } from "@workspace/ui/components/spinner";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@workspace/ui/components/avatar";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import * as Sentry from "@sentry/nextjs";
import { ChevronRight, Building2, Sparkles } from "lucide-react";

export function SubdomainLookupForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<TenantSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Search organizations as user types
  useEffect(() => {
    const searchOrganizations = async () => {
      if (searchTerm.length < 2) {
        setSearchResults([]);
        setHasSearched(false);
        return;
      }

      setIsSearching(true);

      try {
        const result = await searchTenants(searchTerm);

        if (result.error) {
          Sentry.logger.error("subdomain_lookup_error", {
            message: result.error,
            query: searchTerm,
          });
          setSearchResults([]);
          setError(result.error);
        } else {
          setSearchResults(result.tenants);
          setError(null);
        }

        setHasSearched(true);
      } catch (error) {
        Sentry.captureException(error);
        Sentry.logger.error("subdomain_lookup_exception", {
          message: error instanceof Error ? error.message : "Unknown error",
        });
        setSearchResults([]);
        setHasSearched(true);
        setError("Failed to search organizations");
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchOrganizations, 300); // Debounce
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleSelectOrganization = (tenant: TenantSearchResult) => {
    // Security: Validate subdomain before redirecting to prevent open redirect attacks
    if (!isValidSubdomain(tenant.subdomain)) {
      Sentry.logger.error("invalid_subdomain_redirect_attempt", {
        subdomain: tenant.subdomain,
        tenantName: tenant.name,
      });
      setError("Invalid organization subdomain");
      return;
    }

    // Security: Additional validation - ensure tenant data is trustworthy
    // Only allow alphanumeric subdomains with hyphens (no special chars)
    const subdomainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
    if (!subdomainRegex.test(tenant.subdomain)) {
      Sentry.logger.error("invalid_subdomain_format", {
        subdomain: tenant.subdomain,
        tenantName: tenant.name,
      });
      setError("Invalid organization subdomain format");
      return;
    }

    setSearchTerm(tenant.name); // Show the friendly name in the input

    // Redirect to the organization's base URL - middleware will check JWT and route accordingly
    // If user has valid JWT: routes to dashboard
    // If no valid JWT: routes to login page
    const isDevelopment = process.env.NODE_ENV === "development";
    const targetUrl = buildSubdomainUrl(
      tenant.subdomain,
      "/",
      isDevelopment,
      process.env.NEXT_PUBLIC_APP_DOMAIN,
    );

    // Security: Validate the final URL before redirecting
    try {
      const url = new URL(targetUrl);
      const expectedDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || "";

      // Ensure URL is for our domain only (prevent external redirects)
      if (isDevelopment) {
        // In dev, allow localhost
        if (!url.hostname.includes("localhost")) {
          throw new Error("Invalid redirect domain in development");
        }
      } else {
        // In production, must be our app domain
        if (!url.hostname.endsWith(expectedDomain)) {
          throw new Error("Invalid redirect domain");
        }
      }

      window.location.href = targetUrl;
    } catch (error) {
      Sentry.captureException(error);
      setError("Invalid redirect URL");
    }
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const searchValue = searchTerm.trim();

      if (!searchValue) {
        setError("Please enter an organization name");
        return;
      }

      // If the input looks like a valid subdomain format, try to verify it directly first
      if (isValidSubdomain(searchValue)) {
        const verifyResult = await verifyTenant(searchValue);

        if (verifyResult.exists && verifyResult.tenant) {
          // Direct subdomain match found - redirect immediately
          handleSelectOrganization(verifyResult.tenant);
          return;
        }
      }

      // Search for organizations via Server Action (broader search)
      const result = await searchTenants(searchValue);

      if (result.error) {
        Sentry.logger.error("subdomain_lookup_error", {
          message: result.error,
          query: searchValue,
        });
        setError(result.error);
        return;
      }

      const tenants = result.tenants;

      if (tenants.length > 0) {
        // Prioritize exact subdomain matches first, then name matches
        const exactSubdomainMatch = tenants.find(
          (tenant) =>
            tenant.subdomain.toLowerCase() === searchValue.toLowerCase(),
        );

        const exactNameMatch = tenants.find(
          (tenant) => tenant.name.toLowerCase() === searchValue.toLowerCase(),
        );

        const exactMatch = exactSubdomainMatch || exactNameMatch;

        if (exactMatch) {
          // Set the subdomain state and redirect
          handleSelectOrganization(exactMatch);
        } else {
          // Show results in popover for user selection
          setSearchResults(tenants);
          setHasSearched(true);
        }
      } else {
        // Show "no results"
        setSearchResults([]);
        setHasSearched(true);
        setError("No organizations found matching your search");
      }
    } catch (error: unknown) {
      Sentry.captureException(error);
      Sentry.logger.error("subdomain_lookup_exception", {
        message: error instanceof Error ? error.message : "An error occurred",
      });
      setError(error instanceof Error ? error.message : "An error occurred");
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="relative overflow-hidden border-primary/10 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />

        <CardHeader className="relative">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-2xl font-semibold">
                Find your team
              </CardTitle>
              <Sparkles className="h-4 w-4 text-primary/60" />
            </div>
            <CardDescription className="text-sm">
              Start typing to search your organization
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="relative">
          <form onSubmit={handleLookup}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="search" className="text-sm font-semibold">
                  Organization or Company Name
                </Label>
                <div className="relative z-40">
                  <Input
                    ref={inputRef}
                    id="search"
                    type="text"
                    placeholder="Search for your organization..."
                    required
                    autoComplete="off"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pr-10 h-11 transition-all hover:border-primary/20 focus:border-primary/30 focus:ring-1 focus:ring-primary/10"
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Spinner className="size-4 text-primary" />
                    </div>
                  )}

                  {/* Search results - rendered as floating dropdown */}
                  {(searchResults.length > 0 ||
                    (hasSearched && searchResults.length === 0)) && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-background border border-border rounded-lg shadow-lg z-50">
                      <div className="max-h-64 overflow-y-auto">
                        {searchResults.length > 0 ? (
                          <div className="p-2">
                            {searchResults.map((tenant, index) => (
                              <button
                                key={tenant.subdomain}
                                type="button"
                                onClick={() => handleSelectOrganization(tenant)}
                                className={cn(
                                  "w-full px-3 py-2.5 text-left rounded-md transition-all duration-200",
                                  "hover:bg-primary/10 hover:shadow-sm",
                                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                                  "group relative",
                                  index > 0 && "mt-1",
                                )}
                              >
                                <div className="flex items-center justify-between gap-2.5">
                                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                    <Avatar className="h-8 w-8 shrink-0 rounded-md">
                                      <AvatarImage
                                        src={tenant.logo_url || undefined}
                                        alt={tenant.name}
                                        className="object-cover"
                                      />
                                      <AvatarFallback className="rounded-md bg-primary/10 group-hover:bg-primary/20 transition-colors">
                                        <Building2 className="h-3.5 w-3.5 text-primary" />
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                      <span className="font-semibold text-[13px] text-foreground truncate">
                                        {tenant.name}
                                      </span>
                                      <span className="text-[11px] text-muted-foreground truncate">
                                        {tenant.subdomain}.
                                        {process.env.NEXT_PUBLIC_APP_DOMAIN ||
                                          "protecteddomain.com"}
                                      </span>
                                    </div>
                                  </div>
                                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="px-4 py-6 text-sm text-muted-foreground text-center">
                            No organizations found
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-sm text-destructive font-medium">
                      {error}
                    </p>
                  </div>
                )}
              </div>

              {/* Separator with gradient */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-3 text-muted-foreground font-medium">
                    Or
                  </span>
                </div>
              </div>

              {/* Create organization section */}
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  Don&apos;t have an organization yet?
                </p>
                <Link href="/signup">
                  <Button
                    variant="outline"
                    className="w-full h-12 relative transition-all duration-200 hover:bg-primary/2 hover:border-primary/30 hover:shadow-md hover:ring-1 hover:ring-primary/10"
                    type="button"
                  >
                    <Sparkles className="h-4 w-4 mr-2 text-primary" />
                    Create your organization
                  </Button>
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
