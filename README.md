<h1 align="center">Enterprise B2B SaaS Template</h1>

<p align="center"><strong>Ship Faster. Build Smarter.</strong> A production-ready multi-tenant B2B SaaS starter that handles the hard parts—domain isolation, tenant routing, RBAC, and billing—so you can focus on what makes your product unique. Live demo available at <a href="https://marketing-app.com">marketing-app.com</a>.</p>

<table align="center">
<tr>
<td align="center" width="50%" border="0px">
<h3>📦 Marketing App</h3>
<p><em>Public-facing site for user acquisition</em></p>
<a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fsteve-piece%2Fsubdomain-isolated-turborepo&root-directory=apps%2Fmarketing&env=NEXT_PUBLIC_MARKETING_DOMAIN%2CNEXT_PUBLIC_APP_DOMAIN%2CNEXT_PUBLIC_APP_ENV%2CNEXT_PUBLIC_APP_NAME%2CNEXT_PUBLIC_EMAIL_DOMAIN%2CNEXT_PUBLIC_SENDER_EMAIL%2CRESEND_API_KEY%2CNEXT_PUBLIC_SUPABASE_URL%2CNEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY%2CSUPABASE_SECRET_KEY&envDefaults=%7B%22NEXT_PUBLIC_APP_ENV%22%3A%22production%22%7D&envDescription=App+identity+and+database+variables.+Additional+variables+required+for+Resend%2C+Stripe%2C+and+monitoring+integrations.+&envLink=https%3A%2F%2Fgithub.com%2Fsteve-piece%2Fsubdomain-isolated-turborepo%2Fblob%2Fmain%2F.env.example&project-name=multi-tenant-saas-template-marketing&repository-name=subdomain-isolated-turborepo&demo-title=Enterprise+B2B+SaaS+Template&demo-description=Includes+subdomain+isolation+per+tenant%2C+seperate+domains+for+marketing+and+protected+apps%2C+RBAC%2C+and+built+with+Turborepo+monorepo.+Includes+integrations+with+Stripe%2C+Supabase%2C+Resend%2C+and+Sentry.&demo-url=marketing-app.com&demo-image=https%3A%2F%2Fwww.marketing-app.com%2Flogo_horizontal.png&integration-ids=oac_VqOgBHqhEoFTPzGkPd7L0iH6%2Coac_5lUsiANun1DEzgLg0NZx5Es3%2Coac_KfIFnjXqCl4YJCHnt1bDTBI1&skippable-integrations=1&teamSlug=steven-lights-projects"><img src="https://vercel.com/button" alt="Deploy Marketing" /></a>
</td>
<td align="center" width="50%" border="0px">
<h3>🔐 Protected App</h3>
<p><em>Multi-tenant workspace with RBAC</em></p>
<a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fsteve-piece%2Fsubdomain-isolated-turborepo&root-directory=apps%2Fprotected&env=NEXT_PUBLIC_MARKETING_DOMAIN%2CNEXT_PUBLIC_APP_DOMAIN%2CNEXT_PUBLIC_APP_ENV%2CNEXT_PUBLIC_APP_NAME%2CNEXT_PUBLIC_EMAIL_DOMAIN%2CNEXT_PUBLIC_SENDER_EMAIL%2CRESEND_API_KEY%2CNEXT_PUBLIC_SUPABASE_URL%2CNEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY%2CSUPABASE_SECRET_KEY%2CSTRIPE_SECRET_KEY%2CNEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY%2CSTRIPE_WEBHOOK_SECRET%2CSTRIPE_FREE_MONTHLY_PRICE_ID%2CSTRIPE_FREE_YEARLY_PRICE_ID%2CSTRIPE_PRO_MONTHLY_PRICE_ID%2CSTRIPE_PRO_YEARLY_PRICE_ID%2CSTRIPE_BUSINESS_MONTHLY_PRICE_ID%2CSTRIPE_BUSINESS_YEARLY_PRICE_ID%2CSTRIPE_ENTERPRISE_MONTHLY_PRICE_ID%2CSTRIPE_ENTERPRISE_YEARLY_PRICE_ID&envDefaults=%7B%22NEXT_PUBLIC_APP_ENV%22%3A%22production%22%7D&envDescription=App+identity%2C+database%2C+and+billing+variables.+Includes+Stripe+integration+for+subscription+management.+&envLink=https%3A%2F%2Fgithub.com%2Fsteve-piece%2Fsubdomain-isolated-turborepo%2Fblob%2Fmain%2F.env.example&project-name=multi-tenant-saas-template-protected&repository-name=subdomain-isolated-turborepo&demo-title=Enterprise+B2B+SaaS+Template+-+Protected+App&demo-description=Multi-tenant+workspace+application+with+subdomain+routing%2C+RBAC%2C+and+Stripe+billing.+Deploy+this+after+the+marketing+app.+&demo-url=app.marketing-app.com&demo-image=https%3A%2F%2Fwww.marketing-app.com%2Flogo_horizontal.png&integration-ids=oac_VqOgBHqhEoFTPzGkPd7L0iH6%2Coac_5lUsiANun1DEzgLg0NZx5Es3%2Coac_KfIFnjXqCl4YJCHnt1bDTBI1&skippable-integrations=1&teamSlug=steven-lights-projects"><img src="https://vercel.com/button" alt="Deploy Protected" /></a>
</td>
</tr>
</table>

<p align="center"><sub>💡 This monorepo deploys as two separate Vercel projects from the same repo. See <a href="./docs/VERCEL_DEPLOYMENT.md">deployment guide</a> for setup details.</sub></p>

## Why This Template?

Building a multi-tenant B2B SaaS from scratch means weeks (or months) implementing:

| Challenge | Solution |
|:----------|:---------|
| Tenant isolation & subdomain routing | Middleware-based rewriting with RLS |
| Auth flows with session management | Supabase Auth with custom JWT claims |
| Role-based access control (RBAC) | 5-tier hierarchy + 41 granular capabilities |
| Organization settings & branding | Complete org management with logo upload |
| Billing integration & tier management | Stripe subscriptions with usage enforcement |
| Email infrastructure | Resend + Edge Functions for transactional emails |

**This template gives you all of that, production-ready.** Start building features, not infrastructure.

## What's Included

<details>
<summary><strong>🏗️ Architecture</strong></summary>

**Turborepo monorepo** with two Next.js apps + shared packages:

| App/Package | Purpose |
|:------------|:--------|
| `apps/marketing` | Public-facing site (SEO-friendly, cookie-simple) |
| `apps/protected` | Tenant workspace (hardened, tenant-aware) |
| `packages/ui` | Shared UI components + utilities |
| `packages/supabase` | Shared Supabase client helpers |

Domain isolation keeps marketing and tenant apps completely separate, avoiding cross-app cookie/session headaches.
</details>

<details>
<summary><strong>🔐 Authentication & Authorization</strong></summary>

- **Supabase Auth** with custom JWT claims hook
- **Tenant-aware sessions** — JWTs enriched with subdomain/org/role/capabilities
- **RBAC with capabilities** — Fine-grained permissions beyond roles
  - Roles: `owner`, `superadmin`, `admin`, `member`, `view-only`
  - Capability-driven checks for UI + server actions
  - Per-org capability overrides (Business+ tier)
- **Row-Level Security (RLS)** — Database-level tenant isolation
</details>

<details>
<summary><strong>🚀 Subdomain Routing</strong></summary>

Clean URLs with smart routing:

```
tenant.yourdomain.com/dashboard  →  /s/[subdomain]/dashboard (internal)
```

- Server-side subdomain validation (tenant or active reservation)
- Non-subdomain traffic redirects to marketing site
- Users never see the internal routing structure
</details>

<details>
<summary><strong>💾 Backend & Database</strong></summary>

- **Supabase-first** — RLS-enabled schema with policies
- **Complete SQL schemas** — Tables, functions, RLS policies, views, seed data
- **Server Actions** — Type-safe CRUD with RLS enforcement
- **Org/tenant mapping** — Memberships, projects, invitations, and more
</details>

<details>
<summary><strong>📧 Email Infrastructure</strong></summary>

- **Resend integration** via Supabase Edge Functions
- **Email templates** for auth flows (verification, invitations, welcome)
- **Client hooks** to trigger emails from your app
</details>

<details>
<summary><strong>🎨 Tenant Features</strong></summary>

- **Organization branding** — Logo upload, custom settings
- **Onboarding flow** — Complete signup → verification → workspace setup
- **Org settings** — Profile management, member invitations
</details>

<details>
<summary><strong>💳 Billing (Optional)</strong></summary>

- **Stripe integration** — Webhooks, subscriptions, checkout
- **Tier-aware features** — Entitlements, limits, upgrade flows
- **UI gates** — "Requires tier" components
</details>

<details>
<summary><strong>🔍 Observability & Testing</strong></summary>

- **Sentry** — Error tracking wired in
- **Vitest** — Test setup ready to go
</details>

## Tech Stack

| Category | Technology | Version |
|:---------|:-----------|:--------|
| **Monorepo** | Turborepo | `^2.5.6` |
| **Framework** | Next.js | `^16.1.5` (App Router) |
| **UI** | React/ReactDOM | `^19.2.3` |
| **Styling** | Tailwind CSS | `^4.1.18` |
| **Components** | shadcn-style | via `@workspace/ui` |
| **Backend** | Supabase | `^2.92.0` |
| **Email** | Resend | `^4.0.0` |
| **Billing** | Stripe | `^20.0.0` |
| **Monitoring** | Sentry | `^10.36.0` |
| **Testing** | Vitest | `^3.2.4` |

## Project Structure

```
├── apps/
│   ├── marketing/           # Public marketing site + tenant discovery + signup
│   └── protected/           # Tenant app (subdomain routing + authenticated workspace)
├── packages/
│   ├── ui/                  # Shared UI components + utilities
│   ├── supabase/            # Shared Supabase client helpers
│   ├── eslint-config/       # Shared ESLint config
│   └── typescript-config/   # Shared TypeScript config
├── supabase/
│   ├── schemas/             # SQL schema files (tables, functions, RLS, seed)
│   └── functions/           # Edge functions (email hooks)
└── docs/                    # Setup, architecture, DB, deployment guides
```

## Quick Start

### Prerequisites

| Requirement | Description |
|:------------|:------------|
| Node.js 20+ | [Download](https://nodejs.org/) |
| pnpm | `npm install -g pnpm` |
| Supabase | [Sign up](https://supabase.com) (free tier) |
| Resend | [Sign up](https://resend.com) (free tier) |

### Get Running

```bash
pnpm install              # Install dependencies
cp .env.example .env.local # Copy environment template
pnpm dev                  # Start dev servers
```

### Local URLs

| Application | URL |
|:------------|:----|
| Marketing site | `http://localhost:3002` |
| Protected app | `http://localhost:3003` |
| Tenant subdomain | `http://[company].localhost:3003` |

> 💡 Check the [Getting Started guide](./docs/GETTING_STARTED.md) for complete setup instructions (~15-30 min).

## Documentation

| Guide | Description |
|:------|:------------|
| **[Getting Started](./docs/GETTING_STARTED.md)** | Complete setup guide — get running in ~15-30 min |
| **[Architecture](./docs/ARCHITECTURE.md)** | Multi-tenant routing, domain separation, RBAC patterns |
| **[Database](./docs/DATABASE.md)** | Schema reference + RLS policies |
| **[Vercel Deployment](./docs/VERCEL_DEPLOYMENT.md)** | Production setup (domains, DNS, env vars) |
| **[Stripe](./docs/STRIPE.md)** | Optional billing integration |
| **[Contributing](./CONTRIBUTING.md)** | How to contribute |

## Key Concepts

<details>
<summary><strong>Database & Migrations</strong></summary>

SQL schema files in `supabase/schemas/` provide:
- Tables for orgs, members, projects, invitations
- RLS policies for tenant isolation
- Functions for auth, capabilities, and business logic
- Views for common queries
- Seed data for development
</details>

<details>
<summary><strong>Email System</strong></summary>

Transactional emails via **Supabase Edge Functions** + **Resend**:
- Auth emails (verification, password reset)
- Invitations and welcome emails
- Custom email templates

See `supabase/functions/send-email` for implementation.
</details>

<details>
<summary><strong>Server Actions</strong></summary>

Type-safe CRUD using Next.js Server Actions:
- Located in `apps/protected/app/actions/*` and `apps/marketing/app/actions.ts`
- Uses `@workspace/supabase/server` for RLS-enforced queries
- All database operations run server-side
</details>

<details>
<summary><strong>RBAC & Capabilities</strong></summary>

Capabilities-first approach:
- Permissions evaluated by capability keys (not just roles)
- Server actions check capabilities + RLS
- Per-org capability customization (Business+ tier)
</details>

---

## License

[MIT](./LICENSE) — Feel free to use this for your projects!
