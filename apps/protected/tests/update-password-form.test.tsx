import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { UpdatePasswordForm } from "@/components/update-password-form";
import * as supabaseClient from "@/lib/supabase/client";

const mockPush = vi.fn();
const mockSearchParams = {
  get: vi.fn().mockReturnValue(null),
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
}));

describe("UpdatePasswordForm", () => {
  const updateUser = vi.fn();
  const getSession = vi.fn();
  const getUser = vi.fn();
  const verifyOtp = vi.fn();

  beforeEach(() => {
    vi.spyOn(supabaseClient, "createClient").mockReturnValue({
      auth: {
        updateUser,
        getSession,
        getUser,
        verifyOtp,
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
    verifyOtp.mockResolvedValue({
      data: { user: { id: "user-id", email: "test@example.com" } },
      error: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders password form", () => {
    render(<UpdatePasswordForm />);

    expect(screen.getByText("Reset Your Password")).toBeDefined();
    expect(screen.getByLabelText("New password")).toBeDefined();
    expect(
      screen.getByRole("button", { name: /save new password/i })
    ).toBeDefined();
  });

  it("updates password successfully", async () => {
    render(<UpdatePasswordForm />);

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

  it("handles password reset flow with OTP verification", async () => {
    // Mock URL parameters for password reset
    mockSearchParams.get.mockImplementation((key: string) => {
      if (key === "token_hash") return "test-token-hash";
      if (key === "type") return "recovery";
      return null;
    });

    render(<UpdatePasswordForm />);

    // Should verify OTP automatically
    await waitFor(() =>
      expect(verifyOtp).toHaveBeenCalledWith({
        token_hash: "test-token-hash",
        type: "recovery",
      })
    );

    // Should show success message after OTP verification
    await waitFor(() =>
      expect(screen.getByText(/Reset token verified for/)).toBeDefined()
    );

    // Should allow password update
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

  it("shows error when OTP verification fails", async () => {
    // Mock URL parameters for password reset
    mockSearchParams.get.mockImplementation((key: string) => {
      if (key === "token_hash") return "invalid-token";
      if (key === "type") return "recovery";
      return null;
    });

    const otpError = new Error("Invalid or expired token");
    verifyOtp.mockResolvedValue({ data: null, error: otpError });

    render(<UpdatePasswordForm />);

    // Should attempt OTP verification
    await waitFor(() =>
      expect(verifyOtp).toHaveBeenCalledWith({
        token_hash: "invalid-token",
        type: "recovery",
      })
    );

    // Should show error message
    await waitFor(() =>
      expect(screen.getByText(/Reset Token Invalid/)).toBeDefined()
    );
  });
});
