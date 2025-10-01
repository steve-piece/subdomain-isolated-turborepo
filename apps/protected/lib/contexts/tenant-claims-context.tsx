// lib/contexts/tenant-claims-context.tsx
"use client";

import { createContext, useContext } from "react";

export interface TenantClaims {
  user_id: string;
  email: string;
  subdomain: string;
  org_id: string;
  company_name?: string;
  full_name?: string;
  user_role: string;
  capabilities: string[];
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
