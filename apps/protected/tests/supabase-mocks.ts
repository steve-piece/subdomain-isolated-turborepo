// apps/protected/tests/supabase-mocks.ts
import { vi } from "vitest";

export function setupSupabaseRouterMocks() {
  const replaceMock = vi.fn();
  const useRouter = vi.fn().mockReturnValue({ replace: replaceMock });

  vi.mock("next/navigation", () => ({
    useRouter,
  }));

  return { replaceMock, useRouter };
}
