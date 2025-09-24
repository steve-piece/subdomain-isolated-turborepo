import { describe, it, expect, vi, beforeEach } from "vitest";
import { createOrganizationRpc } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("createOrganizationRpc", () => {
  const supabaseMock = {
    auth: {
      getClaims: vi.fn(),
    },
    rpc: vi.fn(),
  } as unknown as ReturnType<typeof createClient>;

  beforeEach(() => {
    vi.resetAllMocks();
    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      supabaseMock
    );
  });

  it("validates input via shared schema", async () => {
    const result = await createOrganizationRpc({
      companyName: "",
      subdomain: "bad",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/organization name/i);
  });

  it("requires authenticated claims", async () => {
    supabaseMock.auth.getClaims = vi.fn().mockResolvedValue({
      data: null,
      error: new Error("No claims"),
    });

    const result = await createOrganizationRpc({
      companyName: "Valid Org",
      subdomain: "valid",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/authentication required/i);
  });

  it("requires confirmed email", async () => {
    supabaseMock.auth.getClaims = vi.fn().mockResolvedValue({
      data: { claims: { email_confirmed: false } },
      error: null,
    });

    const result = await createOrganizationRpc({
      companyName: "Valid Org",
      subdomain: "valid",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/confirm your email/i);
  });

  it("calls the RPC when claims valid", async () => {
    supabaseMock.auth.getClaims = vi.fn().mockResolvedValue({
      data: { claims: { email_confirmed: true } },
      error: null,
    });
    supabaseMock.rpc = vi.fn().mockResolvedValue({ error: null });

    const result = await createOrganizationRpc({
      companyName: "Valid Org",
      subdomain: "valid",
    });

    expect(supabaseMock.rpc).toHaveBeenCalledWith(
      "create_org_for_current_user",
      expect.objectContaining({
        p_company_name: "Valid Org",
        p_subdomain: "valid",
      })
    );
    expect(result.success).toBe(true);
  });
});
