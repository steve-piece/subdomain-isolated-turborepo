// apps/protected/tests/update-password-form.test.tsx
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";
import * as supabaseClient from "@/lib/supabase/client";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("UpdatePasswordForm", () => {
  const updateUser = vi.fn();
  const getSession = vi.fn();
  const getUser = vi.fn();

  beforeEach(() => {
    vi.spyOn(supabaseClient, "createClient").mockReturnValue({
      auth: {
        updateUser,
        getSession,
        getUser,
      },
    } as any);

    updateUser.mockResolvedValue({ error: null });
    getSession.mockResolvedValue({
      data: {
        session: {
          user: { id: "user-id", email: "test@example.com" },
          access_token: "token",
        },
      },
      error: null,
    });
    getUser.mockResolvedValue({
      data: { user: { id: "user-id" } },
      error: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders password reset form", () => {
    render(
      <UpdatePasswordForm isResetFlow={true} userEmail="test@example.com" />
    );

    expect(screen.getByText("Reset Your Password")).toBeDefined();
    expect(screen.getByLabelText("New password")).toBeDefined();
    expect(
      screen.getByRole("button", { name: /save new password/i })
    ).toBeDefined();
  });

  it("renders regular password update form", () => {
    render(<UpdatePasswordForm subdomain="acme" />);

    expect(screen.getByText("Update Your Password")).toBeDefined();
    expect(screen.getByText(/Update your password for acme/)).toBeDefined();
  });

  it("updates password successfully in reset flow", async () => {
    render(
      <UpdatePasswordForm isResetFlow={true} userEmail="test@example.com" />
    );

    const passwordInput = screen.getByLabelText("New password");
    const submitButton = screen.getByRole("button", {
      name: /save new password/i,
    });

    fireEvent.change(passwordInput, { target: { value: "newpassword123" } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(updateUser).toHaveBeenCalledWith({ password: "newpassword123" })
    );
    expect(mockPush).toHaveBeenCalledWith(
      "/auth/login?message=Password updated successfully! Please login with your new password."
    );
  });

  it("updates password successfully in regular flow", async () => {
    render(<UpdatePasswordForm subdomain="acme" />);

    const passwordInput = screen.getByLabelText("New password");
    const submitButton = screen.getByRole("button", {
      name: /save new password/i,
    });

    fireEvent.change(passwordInput, { target: { value: "newpassword123" } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(updateUser).toHaveBeenCalledWith({ password: "newpassword123" })
    );
    expect(mockPush).toHaveBeenCalledWith("/protected");
  });

  it("shows error when update fails", async () => {
    const errorMessage = "Password update failed";
    updateUser.mockResolvedValue({ error: new Error(errorMessage) });

    render(<UpdatePasswordForm />);

    const passwordInput = screen.getByLabelText("New password");
    const submitButton = screen.getByRole("button", {
      name: /save new password/i,
    });

    fireEvent.change(passwordInput, { target: { value: "newpassword123" } });
    fireEvent.click(submitButton);

    await waitFor(() => expect(screen.getByText(errorMessage)).toBeDefined());
  });

  it("shows appropriate error when no session in reset flow", async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: null });

    render(<UpdatePasswordForm isResetFlow={true} />);

    await waitFor(() =>
      expect(
        screen.getByText(
          "Reset session not established. Please try the reset link again."
        )
      ).toBeDefined()
    );
  });

  it("shows appropriate error when no session in regular flow", async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: null });

    render(<UpdatePasswordForm />);

    await waitFor(() =>
      expect(screen.getByText(/No active session found/)).toBeDefined()
    );
  });
});
