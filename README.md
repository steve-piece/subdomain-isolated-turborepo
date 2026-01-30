# Subdomain-Isolated Turborepo (B2B SaaS Template)

An open-source **multi-tenant** starter built for B2B products that want a fast, modern stack and a clean separation between:

- a public **marketing site** (SEO + acquisition), and
- a **tenant-protected app** served from customer subdomains (security + isolation).

If you’re building “Notion/Figma-style workspaces” for companies—with auth, onboarding, RBAC, org settings, subscriptions, and transactional email—this template is the scaffolding.

Demo: [marketing-app.com](https://marketing-app.com)

## What this template is for

- **B2B SaaS founders** who want to ship a multi-tenant MVP without reinventing auth + RBAC + tenant routing.
- **Teams** that want a production-minded baseline: domain separation, RLS, clean URLs, and tier-gated features.
- **Agencies** building client portals/workspaces with tenant branding and organization settings.

## What you get (high level)

- **Turborepo monorepo** with two Next.js apps + shared packages.
- **Next.js 16 + React 19.2** (App Router) + TypeScript.
- **Domain isolation** between marketing and protected apps:
  - marketing stays SEO-friendly and cookie-simple
  - protected app is hardened and tenant-aware
  - helps avoid cross-app cookie/session headaches in production
- **Subdomain → tenant routing** with internal rewrites (users stay on clean URLs):
  - requests to `tenant.protecteddomain.com/foo` rewrite internally to `/s/[subdomain]/foo`
  - protected app redirects non-subdomain traffic back to the marketing site
  - subdomain existence is validated server-side (tenant or active reservation)
- **Supabase-first backend**:
  - RLS-enabled schema and policies
  - org/tenant mapping, memberships, projects, invitations, etc.
  - SQL schema files included for quick setup
  - auth **custom claims hook** that enriches Supabase JWTs with tenant context (subdomain/org/role/capabilities + selected branding fields), then rotates/refetches JWTs via SSR session refresh
- **RBAC with capabilities**:
  - roles (`owner`, `superadmin`, `admin`, `member`, `view-only`)
  - capability-driven checks for UI + server actions
  - **custom per-tenant/per-org capability overrides** available when the org’s subscription tier allows it (Business+)
- **Transactional email plumbing**:
  - Supabase Edge Function email hooks and templates
  - Resend integration for sending auth and notification emails
  - a client hook to call email edge functions from the app
- **Tenant branding + org settings**:
  - organization profile settings (including branding)
  - onboarding flow supports uploading an organization logo
- **Billing scaffolding (optional)**:
  - Stripe integration (including webhook route)
  - tier-aware entitlements/limits, upgrade flows, “requires tier” UI gates
- **Observability (optional)**: Sentry is wired in for Next.js.
- **Tests**: Vitest setup in the apps.

## Tech stack (actual versions used here)

- **Monorepo**: Turborepo (`turbo`)
- **Framework**: Next.js `^16.1.4` (App Router)
- **UI**: React/ReactDOM `^19.2.3`, Tailwind CSS `^4.1.18`, shadcn-style components via `@workspace/ui`
- **Backend**: Supabase (`@supabase/supabase-js`, `@supabase/ssr`)
- **Email**: Resend (`resend`) + Supabase Edge Functions
- **Billing (optional)**: Stripe (`stripe`, `@stripe/stripe-js`)
- **Monitoring (optional)**: Sentry (`@sentry/nextjs`)

## What’s inside (repo layout)

```text
apps/
  marketing/        # Public marketing site + tenant discovery + signup
  protected/        # Tenant app (subdomain routing + authenticated workspace)
packages/
  ui/               # Shared UI + utilities (including subdomain helpers + email helper)
  supabase/          # Shared Supabase client helpers
  eslint-config/     # Shared ESLint config
  typescript-config/ # Shared TS config
supabase/
  schemas/           # Ordered SQL schema files (tables, functions, RLS, seed, etc.)
  functions/         # Edge functions (email hooks + custom email)
docs/                # Setup + architecture + DB + deployment guides
```

## Quick start (local dev)

### Prereqs

- Node.js **20+**
- pnpm
- Supabase project
- Resend API key (for transactional email)

### Run it

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

### Local URLs

- **Marketing**: `http://localhost:3002`
- **Protected app**: `http://localhost:3003`
- **Tenant subdomain**: `http://[company].localhost:3003`

If you haven’t set up Supabase + migrations + edge functions yet, jump straight to the Getting Started guide below.

## Documentation

Start here:

- **[Getting Started](./docs/GETTING_STARTED.md)**: end-to-end setup (Supabase, migrations, auth, email, local dev, deployment) — designed to get you running in ~15–30 minutes

More:

- **[Architecture](./docs/ARCHITECTURE.md)**: multi-tenant routing, domain separation, RBAC patterns
- **[Database](./docs/DATABASE.md)**: schema + RLS reference
- **[Vercel Deployment](./docs/VERCEL_DEPLOYMENT.md)**: production setup (domains/DNS, env vars, edge functions)
- **[Stripe](./docs/STRIPE.md)**: optional billing setup
- **[SETUP.md](./SETUP.md)**: additional setup notes
- **[Contributing](./CONTRIBUTING.md)**: how to contribute

## Database + migrations (Supabase)

The repo includes **SQL schema files** under `supabase/schemas/` intended to be applied to a Supabase Postgres database to get the baseline multi-tenant system running quickly (tables, functions, RLS policies, views, and seed data).

## Email (auth + notifications)

Transactional email is handled through **Supabase Edge Functions** in `supabase/functions/`, with Resend used as the delivery provider. This template includes an auth email hook function (see `supabase/functions/send-email`) with templates for common auth flows.

## Server Actions (CRUD)

Database reads/writes are implemented primarily with **Next.js Server Actions** (e.g. `apps/protected/app/actions/*` and `apps/marketing/app/actions.ts`) using `@workspace/supabase/server`, so CRUD runs server-side with RLS enforced by Supabase.

## RBAC + tiers (how it’s intended to work)

- **Capabilities-first**: permissions are evaluated as capability keys (not just roles).
- **Server-safe**: server actions can check capabilities in addition to RLS.
- **Tier-gated customization**: when the org’s subscription tier allows it, capabilities can be customized per org (Business+).

## Scripts

- `pnpm dev`: run all apps in dev mode
- `pnpm build`: build all apps/packages
- `pnpm lint`: lint across the monorepo
- `pnpm test`: run tests across the monorepo
- `pnpm type`: typecheck across the monorepo

## License

[MIT](./LICENSE)
