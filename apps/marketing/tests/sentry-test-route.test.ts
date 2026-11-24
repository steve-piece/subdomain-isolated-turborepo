// apps/marketing/tests/sentry-test-route.test.ts
// Verifies the Sentry diagnostic endpoint exits before emitting test events outside development.
import { afterEach, expect, it, vi } from "vitest";
import { GET } from "../app/api/sentry-test/route";

vi.mock("@sentry/nextjs", () => ({}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

it.each(["production", "test"] as const)(
  "returns 404 without diagnostic output in %s",
  async (environment) => {
    vi.stubEnv("NODE_ENV", environment);
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    const response = await GET();

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("");
    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  },
);
