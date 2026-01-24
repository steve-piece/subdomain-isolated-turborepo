# Subdomain-Isolated Turborepo

A multi-tenant Turborepo built with Next.js 15, featuring custom subdomains for each tenant and a shared UI component library.

**NOTE**: The marketing site domain and the domain for subdomain isolated accounts are listed below. These are just two domains I owned and wasn't using, but for production you might choose domains with somewhat similar naming conventions.

**Marketing Site Domain**: bask-app.com
**Isolated Domain for Customer Accounts**: ghostwrite.app

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

### New to this template?

Start here: **[Getting Started Guide](./docs/GETTING_STARTED.md)** - Complete setup instructions (15-30 min)

**Already configured?** Jump to [Local Development](#local-development) below

### Prerequisites

- ✅ Node.js 20 or later
- ✅ pnpm (recommended package manager)
- ✅ Supabase account (for authentication & database)
- ✅ Resend account (for transactional emails)
- ✅ Two domain names (or use localhost for testing)
- ✅ Vercel account (for deployment - optional)

### Local Development

```bash
# Clone and install dependencies
git clone <your-repo-url>
cd subdomain-isolated-turborepo
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase & Resend credentials

# Start development servers
pnpm dev
```

**Access Your Applications:**

- 🏠 **Marketing Site**: http://localhost:3002
- 🔒 **Protected App**: http://localhost:3003
- 🏢 **Tenant Subdomains**: http://[company].localhost:3003

**First Time Setup?** Follow the [Getting Started Guide](./docs/GETTING_STARTED.md) to configure Supabase, Resend, and deploy edge functions.

**Note**: See [Vercel Deployment Guide](./VERCEL_DEPLOYMENT.md) for complete production deployment instructions.

## 📚 Documentation

### Core Guides

| Guide                                               | Description                                                |
| --------------------------------------------------- | ---------------------------------------------------------- |
| **[🚀 Getting Started](./docs/GETTING_STARTED.md)** | Complete setup guide (database, email, auth, deployment)   |
| **[🏗️ Architecture](./docs/ARCHITECTURE.md)**       | How the platform works (multi-tenant, RBAC, auth patterns) |
| **[🗄️ Database](./docs/DATABASE.md)**               | Complete database schema reference                         |
| **[🚀 Vercel Deployment](./VERCEL_DEPLOYMENT.md)**  | Production deployment guide (Vercel, DNS, GitHub import)   |
| **[💳 Stripe](./docs/STRIPE.md)**                   | Billing and subscription setup (optional)                  |
| **[🤝 Contributing](./CONTRIBUTING.md)**            | How to contribute to this project                          |

### Settings & RBAC System

Production-ready Role-Based Access Control with 5 role levels and 41+ granular capabilities:

- **Built-in Permissions** - User and organization management out of the box
- **Security Features** - 2FA ready, session management, audit logging included

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

The project includes a complete multi-tenant database schema in `supabase/schemas/`:

**Core Tables:** (all RLS enabled)

- `organizations`, `tenants`, `user_profiles` - Multi-tenant org structure
- `subscriptions`, `subscription_tiers`, `feature_limits` - Billing & usage
- `projects`, `project_permissions` - Project management with granular access
- `capabilities`, `role_capabilities`, `org_role_capabilities` - RBAC system

**Key Features:**

- 🏢 **Organizations**: Company/group management
- 🌐 **Tenants**: Subdomain to organization mapping
- 👤 **User Profiles**: Extended user data with tenant relationships
- 🔐 **Role-Based Access**: `owner` → `superadmin` → `admin` → `member` → `view-only`
- 🛡️ **Row Level Security**: Comprehensive RLS policies for tenant isolation

See [Database Schema Reference](./docs/DATABASE.md) for complete details.

## Multi-Tenant Architecture

This application demonstrates a **subdomain‑based multi‑tenant architecture** with strict domain separation and **clean URL routing**:

- **Marketing Site**: `https://yourdomain.com` - Landing page, signup, and tenant discovery
- **Tenant Apps**: `https://[company].yourdomain.app` - Individual workspace applications
- Each tenant gets their own subdomain with clean URLs
- Middleware handles transparent routing between subdomains and internal structure
- Complete data isolation via Row Level Security (RLS) policies

See [Architecture Guide](./docs/ARCHITECTURE.md) for complete details on how the platform works.

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

1. **Apply Database Migrations**: Run the schema files in `supabase/schemas/`
2. **Check User Permissions**: Use the RBAC utilities for permission checking
3. **Implement UI Components**: Use `RequireCapability` and `useCapability` for conditional rendering
4. **Customize Roles**: Business+ tier organizations can customize role capabilities

See [Architecture Guide](./docs/ARCHITECTURE.md) for detailed implementation patterns.

## Available Scripts

- `pnpm dev` - Start all development servers
- `pnpm build` - Build all packages and apps
- `pnpm lint` - Run linting across all packages
- `pnpm format` - Format code with Prettier

## Code Standards & Cursor Rules (Optional)

This repo ships optional Cursor rules to standardize architecture and guardrails for AI/codegen.

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
├── 📄 README.md                   # This documentation
├── 📄 CONTRIBUTING.md             # Contribution guidelines
├── 📁 docs/                       # Documentation
│   ├── GETTING_STARTED.md         # Complete setup guide
│   ├── ARCHITECTURE.md            # Platform architecture
│   ├── DATABASE.md                # Database schema reference
│   ├── DEPLOYMENT.md              # Production deployment
│   └── STRIPE.md                  # Billing setup
├── 📁 supabase/
│   └── 📁 schemas/                # Database schema files
│       ├── 00_extensions.sql
│       ├── 01_enums.sql
│       ├── 02_tables.sql
│       ├── 03_functions.sql
│       ├── 04_views.sql
│       ├── 05_rls_policies.sql
│       └── seed_data.sql
├── 📁 .cursor/rules/               # Optional Cursor rules (.mdc)
├── 📁 apps/
│   ├── 📁 marketing/              # Landing page & tenant discovery
│   └── 📁 protected/              # Multi-tenant workspaces
└── 📁 packages/
    ├── 📁 ui/                     # Shared component library
    ├── 📁 eslint-config/          # Linting configuration
    └── 📁 typescript-config/      # TypeScript configuration
```

---

## 🎯 Ready to Build?

### For New Users

1. **[🚀 Getting Started](./docs/GETTING_STARTED.md)** - Complete setup guide
2. **[🏗️ Architecture](./docs/ARCHITECTURE.md)** - Understand how it works
3. **[🚀 Vercel Deployment](./VERCEL_DEPLOYMENT.md)** - Deploy to production

### For Developers

- **🏗️ Patterns** → Review `.cursor/rules/` for coding standards
- **🗄️ Database** → [Database Schema Reference](./docs/DATABASE.md)
- **💳 Billing** → [Stripe Setup](./docs/STRIPE.md) (optional)
- **🤝 Contribute** → [Contributing Guide](./CONTRIBUTING.md)

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for:

- 📝 Documentation improvements
- 🐛 Bug reports and fixes
- ✨ Feature suggestions
- 💻 Code contributions

---

## 🆘 Support

- **📖 Docs**: See [Getting Started](./docs/GETTING_STARTED.md) for setup and troubleshooting
- **🐛 Issues**: Report bugs at [GitHub Issues](https://github.com/your-repo/issues)
- **💬 Discussions**: Ask questions at [GitHub Discussions](https://github.com/your-repo/discussions)

---

## 📄 License

[Your License Here]

---

**Happy building!** 🚀
