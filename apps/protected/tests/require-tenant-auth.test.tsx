// apps/protected/tests/require-tenant-auth.test.tsx
import React from "react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import RequireTenantAuth from "@/components/shared/require-tenant-auth";
import { createClient } from "@workspace/supabase/server";

vi.mock("@workspace/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("RequireTenantAuth", () => {
  const createClientMock = createClient as unknown as ReturnType<typeof vi.fn>;
  const supabaseMock = {
    auth: {
      getClaims: vi.fn(),
    },
  } as unknown as Awaited<ReturnType<typeof createClient>>;

  beforeEach(() => {
    vi.resetAllMocks();
    createClientMock.mockResolvedValue(supabaseMock);
  });

  it("redirects when no session", async () => {
    supabaseMock.auth.getClaims = vi.fn().mockResolvedValue({
      data: null,
      error: new Error("No session"),
    });

    await expect(
      RequireTenantAuth({
        subdomain: "acme",
        children: () => null,
      }),
    ).rejects.toThrowError(/NEXT_REDIRECT/);
  });

  it("redirects when email not confirmed", async () => {
    supabaseMock.auth.getClaims = vi.fn().mockResolvedValue({
      data: { claims: { subdomain: "acme", email_confirmed: false } },
      error: null,
    });

    await expect(
      RequireTenantAuth({
        subdomain: "acme",
        children: () => null,
      }),
    ).rejects.toThrowError(/NEXT_REDIRECT/);
  });

  it("redirects on subdomain mismatch", async () => {
    supabaseMock.auth.getClaims = vi.fn().mockResolvedValue({
      data: { claims: { subdomain: "other", email_confirmed: true } },
      error: null,
    });

    await expect(
      RequireTenantAuth({
        subdomain: "acme",
        children: () => null,
      }),
    ).rejects.toThrowError(/NEXT_REDIRECT/);
  });

  it("returns children when claims valid", async () => {
    supabaseMock.auth.getClaims = vi.fn().mockResolvedValue({
      data: {
        claims: {
          subdomain: "acme",
          email_confirmed: true,
          org_id: "org-1",
        },
      },
      error: null,
    });

    const result = await RequireTenantAuth({
      subdomain: "acme",
      children: () => "ok",
    });

    expect(result).toEqual(<React.Fragment>ok</React.Fragment>);
  });
});
