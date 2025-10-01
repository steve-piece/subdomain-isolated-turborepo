// apps/protected/tests/subdomain-auth-checker.test.tsx
import { render, waitFor } from "@testing-library/react";
import React from "react";
import { vi, describe, it, beforeEach } from "vitest";
import { SubdomainAuthChecker } from "@/components/shared/subdomain-auth-checker";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

describe("SubdomainAuthChecker", () => {
  const createClientMock = createClient as unknown as ReturnType<typeof vi.fn>;
  const useRouterMock = useRouter as unknown as ReturnType<typeof vi.fn>;
  const supabaseClientMock = {
    auth: {
      getClaims: vi.fn(),
    },
  } as unknown as ReturnType<typeof createClient>;

  beforeEach(() => {
    vi.resetAllMocks();
    createClientMock.mockReturnValue(supabaseClientMock);
    useRouterMock.mockReturnValue({ replace: vi.fn() });
  });

  it("redirects to login when claims missing", async () => {
    supabaseClientMock.auth.getClaims = vi
      .fn()
      .mockResolvedValue({ data: null, error: new Error("no session") });
    const replaceMock = vi.fn();
    useRouterMock.mockReturnValue({ replace: replaceMock });

    render(<SubdomainAuthChecker subdomain="acme" />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/auth/login");
    });
  });

  it("redirects when subdomain mismatch", async () => {
    supabaseClientMock.auth.getClaims = vi.fn().mockResolvedValue({
      data: { claims: { subdomain: "other", email_confirmed: true } },
      error: null,
    });
    const replaceMock = vi.fn();
    useRouterMock.mockReturnValue({ replace: replaceMock });

    render(<SubdomainAuthChecker subdomain="acme" />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith(
        "/auth/login?error=unauthorized"
      );
    });
  });
});
