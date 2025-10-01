# Subdomain-Isolated Turborepo

A multi-tenant Turborepo built with Next.js 15, featuring custom subdomains for each tenant and a shared UI component library.

## Features

- ✅ Custom subdomain routing with Next.js middleware
- ✅ Tenant‑specific content and pages
- ✅ Shared UI components via workspace package
- ✅ Marketing site for tenant discovery
- ✅ Protected tenant applications
- ✅ Local development with subdomains
- ✅ TypeScript support across all packages
- ✅ ESLint configuration shared across packages
- ✅ Optional Cursor rules for consistent code standards and guardrails

## Turborepo Layout

```
apps/
  marketing/        # Public marketing site and tenant discovery
  protected/        # Tenant app with subdomain routing middleware
packages/
  ui/              # Shared UI components and utilities
  eslint-config/   # Shared ESLint configurations
  typescript-config/ # Shared TypeScript configurations
```

## Tech Stack

- [Next.js 15](https://nextjs.org/) with App Router
- [React 19](https://react.dev/)
- [Tailwind CSS 4](https://tailwindcss.com/) for styling
- shadcn-style components (Radix + CVA) via `@workspace/ui`
- [Radix UI](https://www.radix-ui.com/) for accessible components
- [Lucide React](https://lucide.dev/) for icons
- [TypeScript](https://www.typescriptlang.org/) for type safety
- [Supabase UI](https://supabase.com/ui/docs/getting-started/introduction) for authentication components

### Dependency Alignment

- Next.js `^15.4.7`, React/ReactDOM `^19.1.1`
- Supabase `@supabase/supabase-js ^2.57.4`, `@supabase/ssr ^0.7.0`
- Tailwind `^4.1.11` (+ `@tailwindcss/postcss ^4.1.11`)
- ESLint `^9.32.0`, TS-ESLint `^8.39.0`, Next ESLint plugin `^15.4.5`
- Prettier `^3.6.2`, TypeScript `^5.9.x`

## 🚀 Quick Start

### Prerequisites

- ✅ Node.js 20 or later
- ✅ pnpm (recommended package manager)
- ✅ Supabase account (for authentication)
- ✅ Vercel account (for deployment)

### Local Development

```bash
# Clone and install dependencies
git clone <your-repo-url>
cd subdomain-isolated-turborepo
pnpm install

# Set up environment variables (see detailed setup guide)
# Start development servers
pnpm dev
```

**Access Your Applications:**

- 🏠 **Marketing Site**: http://localhost:3002
- 🔒 **Protected App**: http://localhost:3003
- 🏢 **Tenant Subdomains**: http://[company].localhost:3003

## 📚 Documentation

### Setup & Configuration

- **[Local Development Setup](./docs/setup/LOCAL_DEVELOPMENT.md)** - Complete local development guide
- **[Authentication Setup](./docs/setup/AUTHENTICATION_SETUP.md)** - Supabase UI components and custom claims configuration

### Architecture & Database

- **[Multi-Tenant Architecture](./docs/architecture/MULTI_TENANT_ARCHITECTURE.md)** - Subdomain-based tenant isolation and clean URL routing
- **[Database Schema](./docs/database/DATABASE_SCHEMA.md)** - Complete database structure, RLS policies, and functions

### Deployment & Production

- **[Production Deployment](./docs/deployment/PRODUCTION_DEPLOYMENT.md)** - Vercel deployment with DNS configuration

### Settings & RBAC System

- **[RBAC Architecture](./docs/rbac-settings/RBAC_ARCHITECTURE.md)** - System overview and architecture
- **[User Settings](./docs/rbac-settings/USER_SETTINGS.md)** - Profile, security, and notification management
- **[Organization Settings](./docs/rbac-settings/ORGANIZATION_SETTINGS.md)** - Team, billing, and role management
- **[RBAC System](./docs/rbac-settings/RBAC_SYSTEM.md)** - Role hierarchy, capabilities, and custom permissions
- **[Database Schema](./docs/rbac-settings/DATABASE_SCHEMA.md)** - Complete database structure and relationships
- **[Security Features](./docs/rbac-settings/SECURITY_FEATURES.md)** - 2FA, sessions, audit logging
- **[Testing Guide](./docs/rbac-settings/TESTING_GUIDE.md)** - Comprehensive testing scenarios
- **[Quick Reference](./docs/rbac-settings/RBAC_QUICK_REFERENCE.md)** - Developer reference for implementation

## 🏗️ Built on Supabase UI Components

This project leverages the **Supabase UI component library** - a flexible, open-source, React-based UI component library built on shadcn/ui, designed to simplify Supabase-powered projects with pre-built Auth, Storage, and Realtime features.

### Authentication Foundation

```bash
npx shadcn@latest add https://supabase.com/ui/r/password-based-auth-nextjs.json
```

**Key Features:**

- 🔐 **Pre-built Auth Components**: Login, signup, password reset forms
- 🎨 **Consistent Design**: Built on shadcn/ui design system
- 🔧 **Extensible**: Modify and extend components as needed
- 🏗️ **Composable**: Modular structure for easy integration
- 🚀 **Production Ready**: Scaffolding for complex auth flows

## 🗄️ Database Structure

The project includes a complete multi-tenant database setup script (`database-setup.sql`) that creates:

**Core Tables:** (all RLS enabled)

- `organizations`, `tenants`, `user_profiles` - Multi-tenant org structure
- `subscriptions`, `subscription_tiers`, `feature_limits`, `usage_counters` - Billing & usage
- `projects`, `project_permissions` - Project management with granular access
- `capabilities`, `role_capabilities`, `org_role_capabilities` - RBAC system

**Key Features:**

- 🏢 **Organizations**: Company/group management
- 🌐 **Tenants**: Subdomain to organization mapping
- 👤 **User Profiles**: Extended user data with tenant relationships
- 🔐 **Role-Based Access**: `superadmin` → `admin` → `member` → `view-only`
- 🛡️ **Row Level Security**: Comprehensive RLS policies for tenant isolation

## Multi-Tenant Architecture

This application demonstrates a **subdomain‑based multi‑tenant architecture** with strict domain separation and **clean URL routing**:

### Domain Structure

- **Marketing Site**: `https://${NEXT_PUBLIC_MARKETING_DOMAIN}` - Landing page, signup, and tenant discovery
- **Tenant Apps**: `https://[company].${NEXT_PUBLIC_APP_DOMAIN}` - Individual workspace applications
- **Base App Domain**: `https://${NEXT_PUBLIC_APP_DOMAIN}` - Redirects to marketing site (no subdomain access)

### Key Features

- Each tenant gets their own subdomain (`company.${NEXT_PUBLIC_APP_DOMAIN}`)
- Users see clean URLs like `company.${NEXT_PUBLIC_APP_DOMAIN}/admin` instead of `${NEXT_PUBLIC_APP_DOMAIN}/s/company/admin`
- The middleware handles transparent routing between clean URLs and internal file structure
- Strict domain separation: marketing on `${NEXT_PUBLIC_MARKETING_DOMAIN}`, workspaces on `*.${NEXT_PUBLIC_APP_DOMAIN}`
- Session evaluation on protected app homepage redirects based on subdomain presence
- Subdomains are dynamically mapped to tenant-specific content with proper authentication
- Shared UI components are available across all apps via the workspace package

## 🎨 Settings & RBAC System

### Overview

The application features a comprehensive settings management system integrated with a powerful Role-Based Access Control (RBAC) framework that enables fine-grained permission management across organizations.

### Key Features

- **Multi-Tenant Architecture**: Subdomain-based tenant isolation
- **Role-Based Access Control**: 5 role levels with 41 granular capabilities
- **Custom Permissions**: Business+ tier organizations can customize role capabilities
- **Security Features**: 2FA, session management, audit logging
- **Settings Management**: User and organization settings with proper permissions
- **Navigation Filtering**: Automatic UI filtering based on user capabilities

### Quick Start

1. **Apply Database Migrations**: Run the database setup script
2. **Check User Permissions**: Use the RBAC utilities for permission checking
3. **Implement UI Components**: Use `RequireCapability` and `useCapability` for conditional rendering
4. **Customize Roles**: Business+ organizations can customize role capabilities

See the individual documentation files for detailed implementation guides.

## Available Scripts

- `pnpm dev` - Start all development servers
- `pnpm build` - Build all packages and apps
- `pnpm lint` - Run linting across all packages
- `pnpm format` - Format code with Prettier

## Code Standards & Cursor Rules (Optional)

This repo ships optional Cursor rules to standardize architecture and guardrails for AI/codegen.

### Where Rules Live

- `rules/global.mdc` (global standards: clean URLs, RLS, dependency alignment)
- `rules/db-actions.mdc` (server actions: claims, tenant checks, RLS)
- `rules/components.mdc` (wrappers, thin pages, clean links)
- `rules/middleware-routing.mdc` (rewrite/redirect behavior)
- `rules/auth-claims.mdc` (claims-first, tenant isolation)
- `rules/tests.mdc` (testing conventions)

### How to Use in Cursor

1. Open the repo in Cursor
2. Ensure `.mdc` files are present under `rules/`
3. Cursor will auto-apply global and scoped rules based on `appliesTo` globs
4. When adding new features, co-locate `actions.ts` and wrapper components and follow the rules prompts

### Wrapper-First Component Structure

Target structure for feature pages:

- `apps/marketing/components/auth/login/login-wrapper.tsx` (compose page)
- `apps/marketing/components/auth/login/login-form.tsx`
- `apps/marketing/components/auth/login/login-cta.tsx`
- `apps/marketing/components/auth/login/actions.ts`
- Thin `apps/marketing/app/login/page.tsx` imports `login-wrapper`

**Guidelines:**

- Keep page files minimal; move logic/UI into wrapper components
- Use clean URLs in links/navigation; never `/s/<subdomain>` in UI
- Server actions must validate claims and tenant subdomain

## 📁 Repository Structure

```
📦 subdomain-isolated-turborepo/
├── 📄 database-setup.sql          # Complete Supabase database setup
├── 📄 AGENTS.md                   # AI agent development guide
├── 📄 README.md                   # This documentation
├── 📁 docs/                       # Detailed documentation
│   ├── 📁 setup/                  # Setup guides
│   ├── 📁 architecture/            # Architecture documentation
│   ├── 📁 deployment/              # Deployment guides
│   ├── 📁 database/                # Database documentation
│   └── 📁 rbac-settings/           # RBAC system documentation
├── 📁 rules/                      # Optional Cursor rules (.mdc)
├── 📁 apps/
│   ├── 📁 marketing/              # Landing page & tenant discovery
│   └── 📁 protected/              # Multi-tenant workspaces
└── 📁 packages/
    ├── 📁 ui/                     # Shared component library
    ├── 📁 eslint-config/          # Linting configuration
    └── 📁 typescript-config/      # TypeScript configuration
```

---

**Ready to get started?** Check out the [Local Development Setup](./docs/setup/LOCAL_DEVELOPMENT.md) guide to begin building your multi-tenant application!
