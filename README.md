# Subdomain-Isolated Turborepo (B2B SaaS Template)

![Next.js](https://img.shields.io/badge/Next.js-16.1.5-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19.2.3-61DAFB?logo=react&logoColor=000000)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178C6?logo=typescript&logoColor=white)
![Node](https://img.shields.io/badge/Node-%3E%3D20-339933?logo=nodedotjs&logoColor=white)
![Turborepo](https://img.shields.io/badge/Turborepo-2.5.6-EF4444?logo=turborepo&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&logoColor=white)
![Resend](https://img.shields.io/badge/Resend-0A0A0A?logo=resend&logoColor=white)
![Stripe](https://img.shields.io/badge/Stripe-635BFF?logo=stripe&logoColor=white)

> **Ship faster. Build smarter.** A production-ready multi-tenant B2B SaaS starter that handles the hard parts—domain isolation, tenant routing, RBAC, and billing—so you can focus on what makes your product unique.

**🎯 Perfect for:** B2B SaaS founders, teams building client portals, and anyone creating "Notion/Figma-style workspaces" with proper tenant isolation.

**🚀 See it live:** [marketing-app.com](https://marketing-app.com)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fsteve-piece%2Fsubdomain-isolated-turborepo&env=NEXT_PUBLIC_MARKETING_DOMAIN%2CNEXT_PUBLIC_APP_DOMAIN%2CNEXT_PUBLIC_APP_ENV%2CNEXT_PUBLIC_APP_NAME%2CNEXT_PUBLIC_EMAIL_DOMAIN%2CNEXT_PUBLIC_SENDER_EMAIL%2CRESEND_API_KEY%2CNEXT_PUBLIC_SUPABASE_URL%2CNEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY%2CSUPABASE_SECRET_KEY&envDefaults=%7B%22NEXT_PUBLIC_APP_ENV%22%3A%22production%22%7D&envDescription=App+identity+and+database+variables.+Additional+variables+required+for+Resend%2C+Stripe%2C+and+monitoring+integrations.+&envLink=https%3A%2F%2Fgithub.com%2Fsteve-piece%2Fsubdomain-isolated-turborepo%2Fblob%2Fmain%2F.env.example&project-name=multi-tenant-saas-template&repository-name=subdomain-isolated-turborepo&demo-title=Enterprise+b2b+SaaS+Template&demo-description=Includes+subdomain+isolation+per+tenant%2C+seperate+domains+for+marketing+and+protected+apps%2C+RBAC%2C+and+built+with+Turborepo+monorepo.+Includes+integrations+with+Stripe%2C+Supabase%2C+Resend%2C+and+Sentry.&demo-url=marketing-app.com&demo-image=https%3A%2F%2Fwww.marketing-app.com%2Flogo_horizontal.png&integration-ids=oac_VqOgBHqhEoFTPzGkPd7L0iH6%2Coac_5lUsiANun1DEzgLg0NZx5Es3%2Coac_KfIFnjXqCl4YJCHnt1bDTBI1&skippable-integrations=1&teamSlug=steven-lights-projects)

## ✨ Why this template?

Building a multi-tenant B2B SaaS from scratch? You'll spend weeks (or months) on:
- ✅ Tenant isolation & subdomain routing
- ✅ Auth flows with proper session management
- ✅ Role-based access control (RBAC)
- ✅ Organization settings & branding
- ✅ Billing integration & tier management
- ✅ Email infrastructure

**This template gives you all of that, production-ready.** Start building features, not infrastructure.

## 🎁 What's included

### 🏗️ Architecture

**Turborepo monorepo** with two Next.js apps + shared packages:
- **Marketing app** - Public-facing site (SEO-friendly, cookie-simple)
- **Protected app** - Tenant workspace (hardened, tenant-aware)
- **Shared packages** - UI components, Supabase clients, configs

**Domain isolation** keeps your marketing and tenant apps completely separate, avoiding cross-app cookie/session headaches in production.

### 🔐 Authentication & Authorization

- **Supabase Auth** with custom JWT claims hook
- **Tenant-aware sessions** - JWTs enriched with subdomain/org/role/capabilities
- **RBAC with capabilities** - Fine-grained permissions beyond roles
  - Roles: `owner`, `superadmin`, `admin`, `member`, `view-only`
  - Capability-driven checks for UI + server actions
  - Per-org capability overrides (Business+ tier)
- **Row-Level Security (RLS)** - Database-level tenant isolation

### 🚀 Subdomain Routing

**Clean URLs, smart routing:**
- `tenant.yourdomain.com/foo` → internally rewrites to `/s/[subdomain]/foo`
- Server-side subdomain validation (tenant or active reservation)
- Non-subdomain traffic redirects to marketing site
- Users never see the internal routing structure

### 💾 Backend & Database

- **Supabase-first** - RLS-enabled schema with policies
- **Complete SQL schemas** - Tables, functions, RLS policies, views, seed data
- **Server Actions** - Type-safe CRUD with RLS enforcement
- **Org/tenant mapping** - Memberships, projects, invitations, and more

### 📧 Email Infrastructure

- **Resend integration** via Supabase Edge Functions
- **Email templates** for auth flows (verification, invitations, welcome)
- **Client hooks** to trigger emails from your app

### 🎨 Tenant Features

- **Organization branding** - Logo upload, custom settings
- **Onboarding flow** - Complete signup → verification → workspace setup
- **Org settings** - Profile management, member invitations

### 💳 Billing (Optional)

- **Stripe integration** - Webhooks, subscriptions, checkout
- **Tier-aware features** - Entitlements, limits, upgrade flows
- **UI gates** - "Requires tier" components

### 🔍 Observability & Testing

- **Sentry** - Error tracking wired in
- **Vitest** - Test setup ready to go

## 🛠️ Tech stack

| Category | Technology | Version |
|----------|-----------|---------|
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

## 📁 Project structure

```
apps/
  marketing/        # Public marketing site + tenant discovery + signup
  protected/        # Tenant app (subdomain routing + authenticated workspace)
packages/
  ui/               # Shared UI components + utilities
  supabase/         # Shared Supabase client helpers
  eslint-config/    # Shared ESLint config
  typescript-config/# Shared TypeScript config
supabase/
  schemas/          # SQL schema files (tables, functions, RLS, seed)
  functions/        # Edge functions (email hooks)
docs/               # Setup, architecture, DB, deployment guides
```

## 🚀 Quick start

### Prerequisites

- Node.js **20+**
- pnpm
- Supabase project
- Resend API key

### Get running

```bash
# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env.local

# Start dev servers
pnpm dev
```

### Local URLs

- **Marketing site**: `http://localhost:3002`
- **Protected app**: `http://localhost:3003`
- **Tenant subdomain**: `http://[company].localhost:3003`

> 💡 **New to this?** Check out the [Getting Started guide](./docs/GETTING_STARTED.md) for complete setup instructions (~15-30 minutes).

## 📚 Documentation

### 🎯 Start here

- **[Getting Started](./docs/GETTING_STARTED.md)** — Complete setup guide (Supabase, migrations, auth, email, deployment) — get running in ~15-30 minutes

### 📖 Deep dives

- **[Architecture](./docs/ARCHITECTURE.md)** - Multi-tenant routing, domain separation, RBAC patterns
- **[Database](./docs/DATABASE.md)** - Schema reference + RLS policies
- **[Vercel Deployment](./docs/VERCEL_DEPLOYMENT.md)** - Production setup (domains, DNS, env vars, edge functions)
- **[Stripe](./docs/STRIPE.md)** - Optional billing integration
- **[SETUP.md](./SETUP.md)** - Additional setup notes
- **[Contributing](./CONTRIBUTING.md)** - How to contribute

## 💡 Key concepts

### Database & migrations

SQL schema files in `supabase/schemas/` provide everything you need:
- Tables for orgs, members, projects, invitations
- RLS policies for tenant isolation
- Functions for auth, capabilities, and business logic
- Views for common queries
- Seed data for development

### Email system

Transactional emails via **Supabase Edge Functions** + **Resend**:
- Auth emails (verification, password reset)
- Invitations and welcome emails
- Custom email templates
- See `supabase/functions/send-email` for implementation

### Server Actions

Type-safe CRUD operations using Next.js Server Actions:
- Located in `apps/protected/app/actions/*` and `apps/marketing/app/actions.ts`
- Uses `@workspace/supabase/server` for RLS-enforced queries
- All database operations run server-side

### RBAC & capabilities

**Capabilities-first approach:**
- Permissions evaluated by capability keys (not just roles)
- Server actions check capabilities + RLS
- Per-org capability customization (Business+ tier)

---

## 📄 License

[MIT](./LICENSE) — Feel free to use this for your projects!
