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
import Link from "next/link";
import { useState, useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export function SubdomainLookupForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<TenantSearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Search organizations as user types
  useEffect(() => {
    const searchOrganizations = async () => {
      if (searchTerm.length < 2) {
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }

      setIsLoading(true);

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

        setShowDropdown(true);
        setHasSearched(true);
      } catch (error) {
        Sentry.captureException(error);
        Sentry.logger.error("subdomain_lookup_exception", {
          message: error instanceof Error ? error.message : "Unknown error",
        });
        setSearchResults([]);
        setShowDropdown(true);
        setHasSearched(true);
        setError("Failed to search organizations");
      } finally {
        setIsLoading(false);
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

    setSearchTerm(tenant.name); // Show the friendly name in the input
    setShowDropdown(false);

    // Redirect to the organization's base URL - middleware will check JWT and route accordingly
    // If user has valid JWT: routes to dashboard
    // If no valid JWT: routes to login page
    const isDevelopment = process.env.NODE_ENV === "development";
    const targetUrl = buildSubdomainUrl(
      tenant.subdomain,
      "/",
      isDevelopment,
      process.env.NEXT_PUBLIC_APP_DOMAIN
    );

    window.location.href = targetUrl;
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const searchValue = searchTerm.trim();

      if (!searchValue) {
        setError("Please enter an organization name");
        setIsLoading(false);
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
        setIsLoading(false);
        return;
      }

      const tenants = result.tenants;

      if (tenants.length > 0) {
        // Prioritize exact subdomain matches first, then name matches
        const exactSubdomainMatch = tenants.find(
          (tenant) =>
            tenant.subdomain.toLowerCase() === searchValue.toLowerCase()
        );

        const exactNameMatch = tenants.find(
          (tenant) => tenant.name.toLowerCase() === searchValue.toLowerCase()
        );

        const exactMatch = exactSubdomainMatch || exactNameMatch;

        if (exactMatch) {
          // Set the subdomain state and redirect
          handleSelectOrganization(exactMatch);
        } else {
          // Show results in dropdown for user selection
          setSearchResults(tenants);
          setShowDropdown(true);
          setHasSearched(true);
        }
      } else {
        // Show "no results"
        setSearchResults([]);
        setShowDropdown(true);
        setHasSearched(true);
        setError("No organizations found matching your search");
      }
    } catch (error: unknown) {
      Sentry.captureException(error);
      Sentry.logger.error("subdomain_lookup_exception", {
        message: error instanceof Error ? error.message : "An error occurred",
      });
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Find your team</CardTitle>
          <CardDescription>
            Enter your organization or company name
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLookup}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2 relative">
                <Label htmlFor="search">Organization or Company Name</Label>
                <Input
                  id="search"
                  type="text"
                  placeholder="Search for your organization..."
                  required
                  autoComplete="off"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() =>
                    setShowDropdown(searchResults.length > 0 || hasSearched)
                  }
                  className="w-full"
                />

                {/* Dropdown */}
                {showDropdown && (
                  <div
                    className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto z-50 text-gray-700
                  "
                  >
                    {searchResults.length > 0 ? (
                      <>
                        {searchResults.map((tenant) => (
                          <button
                            key={tenant.subdomain}
                            type="button"
                            onClick={() => handleSelectOrganization(tenant)}
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center justify-between"
                          >
                            <span className="font-medium">{tenant.name}</span>
                            <span className="text-sm text-gray-500">
                              {tenant.subdomain}.
                              {process.env.NEXT_PUBLIC_APP_DOMAIN ||
                                "yourapp.com"}
                            </span>
                          </button>
                        ))}
                      </>
                    ) : hasSearched ? (
                      <div className="px-4 py-2 text-gray-500 text-center">
                        No results found
                      </div>
                    ) : null}
                  </div>
                )}

                <p className="text-sm text-muted-foreground">
                  We&apos;ll find your organization and take you to the right
                  place
                </p>
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !searchTerm.trim()}
              >
                {isLoading ? "Searching..." : "Find my organization"}
              </Button>
            </div>

            <div className="mt-4 text-center text-sm">
              Don&apos;t have an organization yet?{" "}
              <Link href="/signup" className="underline underline-offset-4">
                Create one
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
