<h1 align="left">Enterprise B2B SaaS Template</h1>

<p align="left"><strong>Ship Faster. Build Smarter.</strong> A production-ready multi-tenant B2B SaaS starter that handles the hard parts—domain isolation, tenant routing, RBAC, and billing—so you can focus on what makes your product unique.</br> Live demo available at <a href="https://marketing-app.com">marketing-app.com</a>.</p>

## Quick Start

### Step 1: Deploy to Vercel

**Click the button below** to clone the repo and create the Marketing App project. Enter your app identity values when prompted.

<a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fsteve-piece%2Fsubdomain-isolated-turborepo&root-directory=apps%2Fmarketing&env=NEXT_PUBLIC_MARKETING_DOMAIN%2CNEXT_PUBLIC_APP_DOMAIN%2CNEXT_PUBLIC_APP_NAME&envDefaults=%7B%22NEXT_PUBLIC_APP_ENV%22%3A%22production%22%7D&envDescription=Your+app+domains+and+name.+Additional+env+vars+added+after+Supabase+setup.&envLink=https%3A%2F%2Fgithub.com%2Fsteve-piece%2Fsubdomain-isolated-turborepo%2Fblob%2Fmain%2F.env.example&project-name=multi-tenant-saas-template-marketing&repository-name=subdomain-isolated-turborepo&demo-title=Enterprise+B2B+SaaS+Template+-+Marketing+App&demo-description=Multi-tenant+B2B+SaaS+with+subdomain+isolation%2C+RBAC%2C+and+Turborepo+monorepo.&demo-url=marketing-app.com&demo-image=https%3A%2F%2Fwww.marketing-app.com%2Flogo_horizontal.png" target="_blank"><img src="https://vercel.com/button" alt="Deploy Marketing" /></a>

> **Note**: The deploy will succeed, but the app will show a "Server Error" when opened — this is expected since Supabase isn't configured yet. The repo is now cloned to your GitHub.

### Step 2: Create Protected App Project

1. In [Vercel Dashboard](https://vercel.com/new), click **Add New** → **Project**
2. Import the **same cloned repo** from Step 1
3. Set **Root Directory** to `apps/protected`
4. Add the same app identity env vars as the Marketing App
5. Click **Deploy** (app will show "Server Error" until Supabase is configured)

### Step 3: Set Up Supabase

1. **Create a Supabase project** at [supabase.com](https://supabase.com)
2. **Run the migrations** in order from `supabase/schemas/` (see [Getting Started Guide](./docs/GETTING_STARTED.md#database-setup))
3. **Copy your credentials** from Settings → API

### Step 4: Add Environment Variables

Add the remaining env vars to **both** Vercel projects (Settings → Environment Variables):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=eyJ...
SUPABASE_SECRET_KEY=eyJ...

# Email (Resend)
RESEND_API_KEY=re_...
NEXT_PUBLIC_SENDER_EMAIL=noreply@yourdomain.com
NEXT_PUBLIC_EMAIL_DOMAIN=yourdomain.com

# Environment
NEXT_PUBLIC_APP_ENV=production
```

Then **redeploy both apps** from the Vercel dashboard.

### Step 5: Configure Custom Domain (Required for Protected App)

> **⚠️ Critical**: The protected app **requires a custom domain with wildcard DNS**. Vercel's auto-generated URLs won't work for tenant subdomains.

1. In Vercel, go to Protected App → **Settings** → **Domains**
2. Add your domain: `protecteddomain.com`
3. Add wildcard: `*.protecteddomain.com`
4. **Easiest setup**: Point your domain's nameservers to Vercel at your registrar:
   - `ns1.vercel-dns.com`
   - `ns2.vercel-dns.com`

See [Vercel Deployment Guide](./docs/VERCEL_DEPLOYMENT.md) for complete setup including Stripe webhooks.


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
