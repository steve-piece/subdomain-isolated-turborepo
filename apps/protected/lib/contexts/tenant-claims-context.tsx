// lib/contexts/tenant-claims-context.tsx
"use client";

import { createContext, useContext } from "react";

/**
 * Minimal JWT Claims Interface
 *
 * Contains ONLY identity, organization context, and authorization data.
 * All other user preferences and settings should be fetched via database
 * queries using the helper functions in supabase/migrations/20250101000001_helper_functions.sql
 *
 * Rationale:
 * - JWTs are immutable until refresh (~1 hour)
 * - Stale data in JWT causes inconsistencies
 * - Database queries with proper indexes are fast (<1ms)
 * - Complies with enterprise JWT best practices
 */
export interface TenantClaims {
  // ===== Identity =====
  user_id: string;
  email: string;
  full_name?: string;

  // ===== Organization Context =====
  org_id: string;
  subdomain: string;
  company_name?: string;
  organization_logo_url?: string; // Note: Updates on next login

  // ===== Authorization =====
  user_role: "owner" | "superadmin" | "admin" | "member" | "view-only";
  capabilities: string[]; // Note: Updates on next login
}

const TenantClaimsContext = createContext<TenantClaims | null>(null);

export function TenantClaimsProvider({
  children,
  claims,
}: {
  children: React.ReactNode;
  claims: TenantClaims;
}) {
  return (
    <TenantClaimsContext.Provider value={claims}>
      {children}
    </TenantClaimsContext.Provider>
  );
}

export function useTenantClaims() {
  const context = useContext(TenantClaimsContext);
  if (!context) {
    throw new Error("useTenantClaims must be used within TenantClaimsProvider");
  }
  return context;
}
