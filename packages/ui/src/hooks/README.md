<!-- packages/ui/src/hooks/README.md -->
# Hooks

## `useTenantAccess`

Shared client-side guard that verifies Supabase claims before rendering tenant UI.
It centralizes the previous per-component logic into one API and returns structured
status/failure data so UI layers can respond consistently.

### Responsibilities

- Fetch authenticated claims with `supabase.auth.getClaims()`
- Validate subdomain match and optional role allowlist
- Expose status (`checking`, `allowed`, `denied`) and validated claims
- Provide structured failure info (`GuardFailure`) for custom handling
- Optional UX hooks: toast messages, redirects, `onDenied` callback

### Usage

```tsx
import {
  useTenantAccess,
  type GuardFailure,
  type GuardMessageOverrides,
} from "@workspace/ui/hooks";
import { createClient } from "@/lib/supabase/client";

const guard = useTenantAccess({
  subdomain,
  allowedRoles: ["owner", "admin"], // optional role allowlist
  redirectTo: "/auth/login", // optional redirect target when blocked
  navigate: (path) => window.location.replace(path), // custom navigation helper (e.g. Next.js router)
  showToast: false, // skip default messaging (we handle it ourselves)
  createClient, // app-specific Supabase client factory
  messages: {
    no_session: "Please sign in",
    insufficient_role: (failure) =>
      `Requires ${failure.allowed.join(" or ")} role. Your role: ${
        failure.actual ?? "unknown"
      }`,
  } satisfies GuardMessageOverrides,
  onDenied: (failure: GuardFailure) => {
    // Example toast logic
    switch (failure.reason) {
      case "no_session":
        toast.warning("Please sign in");
        break;
      case "insufficient_role":
        toast.error(
          `Requires ${failure.allowed.join(" or ")} role. Your role: ${failure.actual ?? "unknown"}`
        );
        break;
    }
  },
});

if (guard.state === "checking") {
  return <Loading />;
}

if (guard.state === "denied") {
  return <AccessDenied reason={guard.failure} />;
}

return <Dashboard claims={guard.claims} />;
```

See `apps/protected/components/*` for concrete implementations (guarded actions, role-based wrappers, dashboard gate).
