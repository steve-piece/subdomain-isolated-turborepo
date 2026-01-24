// apps/marketing/tests/organization-signup-form.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { vi, describe, it, beforeEach, afterEach, expect } from "vitest";
import { OrganizationSignUpForm } from "@/components/organization-signup-form";
import type { VerifyTenantResponse } from "@/app/actions";

const routerMock = { push: vi.fn(), replace: vi.fn() };

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

const signUpMock = vi.fn();
const getSessionMock = vi.fn();

type VerifyTenantFn = (subdomain: string) => Promise<VerifyTenantResponse>;

vi.mock("@workspace/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signUp: signUpMock,
      getSession: getSessionMock,
    },
  }),
}));

describe("OrganizationSignUpForm", () => {
  const verifyTenantMock = vi
    .fn<VerifyTenantFn>()
    .mockResolvedValue({ exists: false, tenant: null });

  function setup() {
    render(
      <OrganizationSignUpForm
        verifyTenantAction={verifyTenantMock}
      />,
    );
  }

  beforeEach(() => {
    routerMock.push.mockReset();
    routerMock.replace.mockReset();
    verifyTenantMock
      .mockClear()
      .mockResolvedValue({ exists: false, tenant: null });
    signUpMock.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    getSessionMock.mockResolvedValue({ data: { session: {} } });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the form fields", () => {
    setup();

    expect(screen.getByLabelText(/organization name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/your full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/your email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it("calls signUp when signup succeeds with session", async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
    });

    setup();

    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/organization name/i), "Acme Inc");
    await user.type(screen.getByLabelText(/your full name/i), "Jane Founder");
    await user.type(screen.getByLabelText(/your email/i), "jane@acme.com");
    await user.type(screen.getByLabelText(/^password$/i), "password123");
    await user.type(screen.getByLabelText(/confirm password/i), "password123");
    await user.clear(screen.getByLabelText(/subdomain/i));
    await user.type(screen.getByLabelText(/subdomain/i), "acme");

    await waitFor(() => {
      expect(verifyTenantMock).toHaveBeenCalledWith("acme");
    });

    await user.click(
      screen.getByRole("button", { name: /create organization/i }),
    );

    await waitFor(() => {
      expect(signUpMock).toHaveBeenCalled();
    });

    await waitFor(
      () => {
        expect(routerMock.push).toHaveBeenCalled();
      },
      { timeout: 2000 },
    );
  });

  it("shows an error when passwords do not match", async () => {
    setup();

    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/organization name/i), "Acme Inc");
    await user.type(screen.getByLabelText(/your full name/i), "Jane Founder");
    await user.type(screen.getByLabelText(/your email/i), "jane@acme.com");
    await user.type(screen.getByLabelText(/^password$/i), "password123");
    await user.type(screen.getByLabelText(/confirm password/i), "different");
    await user.clear(screen.getByLabelText(/subdomain/i));
    await user.type(screen.getByLabelText(/subdomain/i), "acme");

    await waitFor(() => {
      expect(verifyTenantMock).toHaveBeenCalledWith("acme");
    });

    await user.click(
      screen.getByRole("button", { name: /create organization/i }),
    );

    const errorMessages = screen.getAllByText(/passwords do not match/i);
    expect(errorMessages.length).toBeGreaterThan(0);
    expect(signUpMock).not.toHaveBeenCalled();
    expect(routerMock.push).not.toHaveBeenCalled();
  });
});
