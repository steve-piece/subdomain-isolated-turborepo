<!-- README.md -->

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

## Turborepo layout

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

### Dependency alignment (pinned ranges)

- Next.js `^15.4.7`, React/ReactDOM `^19.1.1`
- Supabase `@supabase/supabase-js ^2.57.4`, `@supabase/ssr ^0.7.0`
- Tailwind `^4.1.11` (+ `@tailwindcss/postcss ^4.1.11`)
- ESLint `^9.32.0`, TS-ESLint `^8.39.0`, Next ESLint plugin `^15.4.5`
- Prettier `^3.6.2`, TypeScript `^5.9.x`

## 🏗️ Built on Supabase UI Components

This project leverages the **Supabase UI component library** - a flexible, open-source, React-based UI component library built on shadcn/ui, designed to simplify Supabase-powered projects with pre-built Auth, Storage, and Realtime features.

### Authentication Foundation

The authentication system is built using Supabase's password-based auth registry:

```bash
npx shadcn@latest add https://supabase.com/ui/r/password-based-auth-nextjs.json
```

#### Email Verification Setup

For email verification with subdomain routing to work properly, you need to configure your Supabase Dashboard. See [EMAIL_VERIFICATION_SETUP.md](./EMAIL_VERIFICATION_SETUP.md) for detailed configuration steps.

#### Custom Claims Configuration

For multi-tenant JWT claims to work properly, you need to configure custom claims in your Supabase Dashboard. See:

- [SUPABASE_CLAIMS_SETUP.md](./SUPABASE_CLAIMS_SETUP.md) - Complete setup guide

This provides:

- 🔐 **Pre-built Auth Components**: Login, signup, password reset forms
- 🎨 **Consistent Design**: Built on shadcn/ui design system
- 🔧 **Extensible**: Modify and extend components as needed
- 🏗️ **Composable**: Modular structure for easy integration
- 🚀 **Production Ready**: Scaffolding for complex auth flows

Learn more about the Supabase UI component library at [supabase.com/ui](https://supabase.com/ui/docs/getting-started/introduction).

### 🗄️ Database Structure

The project includes a complete multi-tenant database setup script (`database-setup.sql`) that creates:

```mermaid
erDiagram
    ORGANIZATIONS {
        uuid id PK
        text name
        text description
        text website
        text logo_url
        jsonb settings
        timestamptz created_at
        timestamptz updated_at
    }

    TENANTS {
        uuid id PK
        text subdomain UK
        text name
        uuid org_id FK
        timestamptz created_at
    }

    USER_PROFILES {
        uuid id PK
        uuid user_id UK,FK
        uuid tenant_id FK
        text email
        text name
        user_role role
        timestamptz created_at
        timestamptz updated_at
    }

    AUTH_USERS {
        uuid id PK
        text email
        text encrypted_password
    }

    ORGANIZATIONS ||--o{ TENANTS : "org_id"
    TENANTS ||--o{ USER_PROFILES : "tenant_id"
    AUTH_USERS ||--|| USER_PROFILES : "user_id"
```

**Key Features:**

- 🏢 **Organizations**: Company/group management
- 🌐 **Tenants**: Subdomain to organization mapping
- 👤 **User Profiles**: Extended user data with tenant relationships
- 🔐 **Role-Based Access**: `superadmin` → `admin` → `member` → `view-only`
- 🛡️ **Row Level Security**: Comprehensive RLS policies for tenant isolation

Verified schema (via Supabase MCP):

**Core Tables:** (all RLS enabled)

- `organizations`, `tenants`, `user_profiles` - Multi-tenant org structure
- `subscriptions`, `subscription_tiers`, `feature_limits`, `usage_counters` - Billing & usage
- `projects`, `project_permissions` - Project management with granular access
- `capabilities`, `role_capabilities`, `org_role_capabilities` - RBAC system

**Views:**

- `tenants_public` - Public subdomain lookup
- `org_entitlements` - Subscription tier & feature aggregation

**Key Functions:**

- `bootstrap_organization()` - Initialize new org after signup
- `custom_access_token_hook()` - Enrich JWT with role/org claims
- `feature_increment_if_within_limit()` - Usage quota enforcement
- `user_org_access()` - Check org membership & role
- `user_org_capability()` - Check RBAC capability permissions
- `user_project_access()` - Check project-level permissions
- `handle_new_project()` - Auto-grant creator admin access
- Trigger functions: `set_updated_at()`, `sync_user_email()`, `prevent_user_id_change()`

## 🚀 Complete Setup Guide

### Prerequisites

- ✅ Node.js 20 or later
- ✅ pnpm (recommended package manager)
- ✅ Vercel account (for deployment) - Seperate Projects per app
- ✅ Supabase account (for authentication)

### 📋 Local Development Setup

#### Step 1: Repository Setup

```bash
# Clone and navigate to your repository
git clone <your-repo-url>
cd subdomain-isolated-turborepo

# Install all dependencies
pnpm install
```

#### Step 2: Supabase Project Setup

```mermaid
flowchart LR
    A[Create Supabase Project] --> B[Run Database Setup Script]
    B --> C[Copy Project URL & Keys]
    C --> D[Configure Authentication]
    D --> E[Ready for Integration]
```

1. **Create Supabase Project**: Go to [supabase.com](https://supabase.com) and create a new project
2. **Set up Database Structure**:
   - Open the SQL Editor in your Supabase dashboard
   - Copy and run the complete `database-setup.sql` script (located in repository root)
   - This creates all necessary tables, RLS policies, and functions for multi-tenant architecture
3. **Copy Credentials**: Navigate to Project Settings → API to get:
   - Project URL
   - Anon/Public Key
   - Service Role Key (for server-side operations)

#### Step 3: Environment Variables Setup

Create `.env.local` files in both apps with your Supabase credentials:

**📁 `apps/marketing/.env.local`**

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=your_supabase_anon_key

# Domain Configuration
NEXT_PUBLIC_APP_DOMAIN=yourdomain.com
NEXT_PUBLIC_MARKETING_DOMAIN=yourdomain.com
```

**📁 `apps/protected/.env.local`**

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=your_supabase_anon_key

# Domain Configuration
NEXT_PUBLIC_APP_DOMAIN=yourdomain.com
NEXT_PUBLIC_MARKETING_DOMAIN=yourdomain.com
```

Notes:

- Do not expose `SUPABASE_SERVICE_ROLE_KEY` to clients. If needed for admin tasks, use server-only utilities and environment scoping.

#### Step 4: Start Development Servers

```bash
# Option 1: Run both apps simultaneously
pnpm dev

# Option 2: Run individual apps
pnpm --filter marketing dev    # Port 3002
pnpm --filter protected dev    # Port 3003
```

#### Step 5: Access Your Applications

- 🏠 **Marketing Site**: http://localhost:3002
- 🔒 **Protected App**: http://localhost:3003
- 🏢 **Tenant Subdomains**: http://[company].localhost:3003

```mermaid
graph TD
    A[localhost:3002<br/>Marketing Site] --> B[Sign Up New Organization]
    A --> C[Find Existing Team]
    C --> D[company.localhost:3003<br/>Tenant Workspace]
    B --> E[Create Subdomain]
    E --> D
    D --> F[Dashboard]
    D --> G[Admin Panel]
    D --> H[Auth Pages]
```

## Multi‑Tenant Architecture

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

### 🎯 Clean URL Routing System

The middleware (`apps/protected/middleware.ts`) provides a **clean URL façade** that works as follows:

```mermaid
flowchart TB
    A["🌐 User visits:<br/>company.${NEXT_PUBLIC_APP_DOMAIN}/auth/login"]
    B["🔍 Middleware extracts:<br/>subdomain = 'company'"]
    C["🔄 Internal rewrite:<br/>/s/company/auth/login"]
    D["📁 Routes to file:<br/>app/s/[subdomain]/auth/login/page.tsx"]
    E["✨ User still sees:<br/>company.${NEXT_PUBLIC_APP_DOMAIN}/auth/login"]

    A --> B
    B --> C
    C --> D
    D --> E

    style A fill:#e1f5fe
    style E fill:#e8f5e8
    style C fill:#fff3e0
```

#### Benefits:

- ✨ **Professional URLs** that don't expose internal routing structure
- 🔒 **Proper subdomain isolation** for multi-tenant security
- 🔍 **SEO-friendly URLs** for each tenant
- 🔖 **Clean bookmarkable links**

### 🔐 Authentication Flow

```mermaid
sequenceDiagram
    participant U as 👤 User
    participant M as 🏠 Marketing Site<br/>${NEXT_PUBLIC_MARKETING_DOMAIN}
    participant P as 🔒 Protected App<br/>${NEXT_PUBLIC_APP_DOMAIN}
    participant T as 🏢 Tenant App<br/>company.${NEXT_PUBLIC_APP_DOMAIN}
    participant S as 🗄️ Supabase Auth

    U->>P: Visit base domain
    P->>M: Redirect (no subdomain)
    U->>M: Sign in / Find tenant
    M->>T: Redirect to subdomain
    T->>S: Authenticate user
    S->>T: Return session
    T->>U: Show dashboard
```

#### Key Features:

- 🏠 **Domain-Based Flow**: Users start at `${NEXT_PUBLIC_MARKETING_DOMAIN}` for tenant discovery
- 🔍 **Session Evaluation**: Protected app homepage evaluates subdomain presence and user session
- ↩️ **No Subdomain Redirect**: `${NEXT_PUBLIC_APP_DOMAIN}` (base domain) → `${NEXT_PUBLIC_MARKETING_DOMAIN}`
- 🔐 **Supabase Integration**: Row-level security and user authentication
- 🏢 **Tenant Isolation**: Each subdomain has its own authentication context
- 🔄 **Session Management**: Automatic redirects and session validation
- ✨ **Clean URLs**: All auth flows use clean URLs (`/auth/login`, `/reset-password`)
- 🛡️ **Middleware Protection**: Unauthenticated users are redirected appropriately

#### Auth patterns

- Prefer `supabase.auth.getClaims()` for tenant checks; `getUser()` is deprecated.
- Validate `claims.claims.subdomain === params.subdomain`; otherwise redirect to `/auth/login`.

## Available Scripts

- `pnpm dev` - Start all development servers
- `pnpm build` - Build all packages and apps
- `pnpm lint` - Run linting across all packages
- `pnpm format` - Format code with Prettier

## Mermaid diagrams

Tenant routing decision (marketing vs app domains):

```mermaid
flowchart TD
    A[Incoming Request] --> B{Host header}
    B -->|marketing domain| C[Pass through]
    B -->|app domain with tenant subdomain| D[Extract subdomain]
    D --> E{Path}
    E -->|/admin| F[Redirect to marketing /admin]
    E -->|/| G[Rewrite to /s/<tenant>]
    E -->|other| H[Rewrite to /s/<tenant><path>]
    C --> I[NextResponse.next]
    F --> I
    G --> J[NextResponse.rewrite]
    H --> J
```

Marketing login flow (account picker to tenant login):

```mermaid
sequenceDiagram
  participant User
  participant Marketing as Marketing /login
  participant Redirect as Marketing /login/redirect
  participant Tenant as Tenant /login
  User->>Marketing: Enter account subdomain
  Marketing->>Redirect: GET /login/redirect?account=<subdomain>
  Redirect-->>User: 302 to https://<subdomain>.${NEXT_PUBLIC_APP_DOMAIN}/auth/login
  User->>Tenant: Open tenant login
  Tenant-->>User: Sign in, then redirect to next
```

Create tenant flow (emoji + subdomain):

```mermaid
sequenceDiagram
  participant User
  participant Page as Home Page
  participant Action as Server Action
  participant DB as Supabase (tenants)
  participant Browser as Browser
  User->>Page: Fill SubdomainForm
  Page->>Action: submit(formData)
  Action->>DB: insert { subdomain, emoji }
  DB-->>Action: ok
  Action-->>Browser: redirect https://<subdomain>.${NEXT_PUBLIC_APP_DOMAIN}
```

## 🚀 Production Deployment

### 📊 Deployment Architecture

```mermaid
graph TB
    subgraph "🌍 DNS Configuration"
        D1[${NEXT_PUBLIC_MARKETING_DOMAIN}]
        D2[*.${NEXT_PUBLIC_APP_DOMAIN}]
        D3[${NEXT_PUBLIC_APP_DOMAIN}]
    end

    subgraph "☁️ Vercel Projects"
        V1[📱 Marketing Project<br/>apps/marketing]
        V2[🔒 Protected Project<br/>apps/protected]
    end

    subgraph "📁 GitHub Repository"
        R1[turborepo-main]
    end

    D1 --> V1
    D2 --> V2
    D3 --> V2
    R1 --> V1
    R1 --> V2

    style V1 fill:#e1f5fe
    style V2 fill:#f3e5f5
    style R1 fill:#e8f5e8
```

### Step 1: Supabase Integration with Vercel

1. **Connect Supabase to Vercel** (Recommended):
   - Go to your Vercel dashboard
   - Navigate to your project → **Integrations**
   - Install the **Supabase integration**
   - This automatically syncs environment variables

2. **Manual Environment Setup** (Alternative):
   - Copy environment variables from Supabase dashboard
   - Add them to both Vercel projects

### Step 2: Create Two Vercel Projects

```mermaid
flowchart LR
    A[📁 Same GitHub Repo] --> B[📱 Marketing Project]
    A --> C[🔒 Protected Project]

    B --> D[Root Directory:<br/>apps/marketing]
    C --> E[Root Directory:<br/>apps/protected]

    D --> F[Domain:<br/>${NEXT_PUBLIC_MARKETING_DOMAIN}]
    E --> G[Domains:<br/>${NEXT_PUBLIC_APP_DOMAIN}<br/>*.${NEXT_PUBLIC_APP_DOMAIN}]
```

#### Project A (Marketing):

- **Root Directory**: `apps/marketing`
- **Install Command**: `corepack enable pnpm && pnpm install --frozen-lockfile`
- **Build Command**: `next build`
- **Node.js**: 20
- **Domains**: `${NEXT_PUBLIC_MARKETING_DOMAIN}`

#### Project B (Protected / Tenants):

- **Root Directory**: `apps/protected`
- **Install Command**: `corepack enable pnpm && pnpm install --frozen-lockfile`
- **Build Command**: `next build`
- **Node.js**: 20
- **Domains**: `${NEXT_PUBLIC_APP_DOMAIN}` and wildcard `*.${NEXT_PUBLIC_APP_DOMAIN}`

### Step 3: Environment Variables Configuration

Set these in **both** Vercel projects:

```bash
# Core Domain Configuration
NEXT_PUBLIC_APP_DOMAIN=yourdomain.com
NEXT_PUBLIC_MARKETING_DOMAIN=yourdomain.com

# Supabase Configuration (auto-synced if using Vercel integration)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=your_supabase_anon_key
```

### Step 4: DNS Configuration

```mermaid
graph LR
    subgraph "🌐 DNS Records"
        A[A Record<br/>${NEXT_PUBLIC_MARKETING_DOMAIN}] --> D[Vercel IP]
        B[CNAME<br/>*.${NEXT_PUBLIC_APP_DOMAIN}] --> E[vercel-deployment.vercel.app]
        C[CNAME<br/>${NEXT_PUBLIC_APP_DOMAIN}] --> E
    end

    subgraph "☁️ Vercel Projects"
        V1[Marketing Project]
        V2[Protected Project]
    end

    D --> V1
    E --> V2
```

### Step 5: GitHub Actions Setup (Optional)

For optimal CI/CD performance with Turborepo remote caching:

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Add these repository secrets:
   - `TURBO_TEAM` - Your Turbo team ID
   - `TURBO_TOKEN` - Your Turbo API token

🚀 **Benefits**: Remote caching across CI/CD runs, significantly speeding up builds and deployments.

### Step 6: Deploy

After completing the above setup, push to `main` to trigger automatic deployments to both Vercel projects.

## 📁 Repository Files

```
📦 subdomain-isolated-turborepo/
├── 📄 database-setup.sql          # Complete Supabase database setup
├── 📄 AGENTS.md                   # AI agent development guide
├── 📄 README.md                   # This documentation
├── 📁 rules/                      # Optional Cursor rules (.mdc)
├── 📁 apps/
│   ├── 📁 marketing/              # Landing page & tenant discovery
│   └── 📁 protected/              # Multi-tenant workspaces
└── 📁 packages/
    ├── 📁 ui/                     # Shared component library
    ├── 📁 eslint-config/          # Linting configuration
    └── 📁 typescript-config/      # TypeScript configuration
```

## Code Standards & Cursor Rules (optional)

This repo ships optional Cursor rules to standardize architecture and guardrails for AI/codegen.

### Where rules live

- `rules/global.mdc` (global standards: clean URLs, RLS, dependency alignment)
- `rules/db-actions.mdc` (server actions: claims, tenant checks, RLS)
- `rules/components.mdc` (wrappers, thin pages, clean links)
- `rules/middleware-routing.mdc` (rewrite/redirect behavior)
- `rules/auth-claims.mdc` (claims-first, tenant isolation)
- `rules/tests.mdc` (testing conventions)

### How to use in Cursor

1. Open the repo in Cursor
2. Ensure `.mdc` files are present under `rules/`
3. Cursor will auto-apply global and scoped rules based on `appliesTo` globs
4. When adding new features, co-locate `actions.ts` and wrapper components and follow the rules prompts

### Wrapper-first component structure

Target structure for feature pages:

- `apps/marketing/components/auth/login/login-wrapper.tsx` (compose page)
- `apps/marketing/components/auth/login/login-form.tsx`
- `apps/marketing/components/auth/login/login-cta.tsx`
- `apps/marketing/components/auth/login/actions.ts`
- Thin `apps/marketing/app/login/page.tsx` imports `login-wrapper`

Guidelines:

- Keep page files minimal; move logic/UI into wrapper components
- Use clean URLs in links/navigation; never `/s/<subdomain>` in UI
- Server actions must validate claims and tenant subdomain

---

## 🎨 Settings & RBAC System

### Overview

The application features a comprehensive settings management system integrated with a powerful Role-Based Access Control (RBAC) framework that enables fine-grained permission management across organizations.

### Architecture

```mermaid
graph TB
    subgraph "👤 User Settings"
        US1[Profile Settings]
        US2[Security Settings]
        US3[Notification Preferences]
    end

    subgraph "🏢 Organization Settings"
        OS1[General Settings]
        OS2[Team Management]
        OS3[Billing & Plans]
        OS4[Custom Role Capabilities]
    end

    subgraph "🔐 RBAC System"
        R1[41 Capabilities]
        R2[5 Role Levels]
        R3[Custom Overrides]
        R4[Tier-Based Access]
    end

    subgraph "🗄️ Database Layer"
        D1[user_profiles]
        D2[user_notification_preferences]
        D3[user_security_settings]
        D4[organizations]
        D5[organization_team_settings]
        D6[capabilities]
        D7[role_capabilities]
        D8[org_role_capabilities]
        D9[security_audit_log]
    end

    US1 --> D1
    US2 --> D3
    US3 --> D2
    OS1 --> D4
    OS2 --> D5
    OS4 --> R3
    R1 --> D6
    R2 --> D7
    R3 --> D8
    US2 --> D9
```

### User Settings

**Profile Settings** (`/settings/profile`)

- Personal information management (name, email, bio, timezone)
- Profile picture upload
- Account context display (organization, role, subdomain)
- Account deletion (danger zone)

**Security Settings** (`/settings/security`)

- Security overview dashboard
- Password management with reset functionality
- Two-Factor Authentication (2FA) setup via email
- Active session management
- Security audit log viewer
- Real-time security activity feed

**Notification Settings** (`/settings/notifications`)

- Email notification toggles (account activity, team updates, projects, marketing)
- In-app notification preferences
- Email digest frequency (realtime, daily, weekly, never)
- Quiet hours configuration with timezone support

### Organization Settings

**General Settings** (`/org-settings`)

- Organization identity (name, description, subdomain)
- Logo upload and management
- Contact information (website, support email, business address)
- Organization details (ID, creation date, current plan)
- Danger zone (ownership transfer, organization deletion)

**Team Management** (`/org-settings/team`)

- Team member list with role badges
- User invitation system
- Role assignment and management
- Member removal functionality

**Billing** (`/org-settings/billing`)

- Current plan display
- Subscription tier management
- Usage statistics and quotas
- Payment method management

**Custom Role Capabilities** (`/org-settings/roles`) - **Business+ Tier**

- Role-based capability customization
- Grant/revoke permissions per role
- Visual indicators for custom overrides
- Reset to defaults functionality
- Real-time permission updates
- Comprehensive audit trail

### RBAC (Role-Based Access Control)

#### Role Hierarchy

```
owner > superadmin > admin > member > view-only
```

#### Roles & Default Capabilities

**Owner (41 permissions)**

- Full system access
- Organization deletion rights
- Custom permission configuration (Business+ tier)
- Ownership transfer capability

**Superadmin (40 permissions)**

- All capabilities except organization deletion
- Full administrative access
- Team and project management

**Admin (32 permissions)**

- Project creation, viewing, editing, deletion, archiving
- Team invitation, removal, viewing, role management
- Billing viewing and management
- Organization settings editing
- Security audit log access
- Analytics access

**Member (9 permissions)**

- Project creation and editing (own projects)
- Team viewing
- Profile and security settings management
- Notification preferences

**View-Only (4 permissions)**

- View own projects
- View team members
- View own security settings
- View analytics

#### Capability Categories

1. **Projects** (7 capabilities)
   - Create, view (all/own), edit (all/own), delete, archive

2. **Team Management** (4 capabilities)
   - Invite, remove, view, manage roles

3. **Billing** (3 capabilities)
   - View, manage, upgrade subscription

4. **Organization** (9 capabilities)
   - View/edit general settings, team settings, delete org, logo upload

5. **Profile** (3 capabilities)
   - Edit own/others profiles, upload picture

6. **Security** (4 capabilities)
   - View/edit own security, view org audit log, manage sessions

7. **Notifications** (1 capability)
   - Edit own notification preferences

8. **Analytics** (3 capabilities)
   - View, generate reports, export data

### Custom Role Capabilities (Business+ Feature)

Organizations on Business or Enterprise tiers can customize role capabilities:

**Features:**

- Grant additional capabilities to lower roles
- Revoke default capabilities from any role
- Create custom permission workflows
- Full audit trail of all permission changes
- Real-time permission updates
- Visual indicators for customized roles

**Implementation:**

```typescript
// Server actions for managing custom capabilities
await grantCustomCapability(role, capabilityKey);
await revokeCustomCapability(role, capabilityKey);
await resetRoleToDefaults(role);
```

**Tier Verification:**

```typescript
// Automatic tier checking
const canCustomize = await canCustomizeRoles(); // Business+ only
```

**UI Components:**

- `RoleCapabilitiesManager`: Interactive permission toggle grid
- `UpgradePrompt`: Tier upgrade call-to-action for free/pro users
- Role selector with capability grouping by category
- Reset confirmation dialog for destructive actions

### Database Schema Extensions

**New Tables:**

```sql
-- User settings
user_notification_preferences
user_security_settings
user_active_sessions

-- Organization settings
organization_team_settings
settings_usage_tracking

-- Security
security_audit_log

-- RBAC
capabilities (41 entries)
role_capabilities (130+ mappings)
org_role_capabilities (custom overrides)
```

**Automatic Initialization:**

- Triggers auto-create settings for new users
- Triggers auto-create team settings for new organizations
- Default notification preferences applied on signup
- Security settings initialized with password timestamp

**Row-Level Security:**

- All settings tables have RLS enabled
- Users can only access their own settings
- Organization settings require role verification
- Service role has full access for backend operations

### Navigation System

**Collapsible Sidebar** (`AppSidebar`)

- Persistent navigation across all protected routes
- Role-based menu filtering
- Premium feature indicators (💎)
- Real-time permission count display
- Organized sections:
  - **Main**: Dashboard, Admin Panel
  - **User Settings**: Profile, Security, Notifications
  - **Organization**: General, Team, Billing, Roles

**Route Groups:**

```
apps/protected/app/s/[subdomain]/(protected)/
├── (dashboard)/        # Main application routes
│   ├── dashboard/
│   └── admin/
├── (user-settings)/    # User personal settings
│   └── settings/
│       ├── profile/
│       ├── security/
│       └── notifications/
└── (org-settings)/     # Organization settings
    └── org-settings/
        ├── page.tsx    # General
        ├── team/
        ├── billing/
        └── roles/      # Business+ only
```

### Security Features

**Multi-Factor Authentication (2FA)**

- Email-based 6-digit code authentication
- MFA setup UI with clear onboarding
- Challenge-response verification flow
- Factor management (enroll, verify, unenroll, list)

**Session Management:**

- Active session tracking across devices
- Session revocation capability
- "Current Device" indicator
- Last active timestamps
- IP address logging

**Security Audit Log:**

- Real-time security event logging
- Event categorization (login, logout, password_change, mfa_enabled)
- Severity levels (info, warning, critical)
- Action states (success, failure, attempted)
- IP address and user agent tracking
- Dedicated viewer at `/settings/security/audit-log`

**Helper Functions:**

```typescript
// RBAC permission checks
const permissions = getUserPermissions(role, orgId);
const hasAccess = userHasCapability(userId, orgId, "projects.create");

// Usage limit enforcement
const withinLimit = await checkUsageLimit(orgId, "api_calls");

// Security logging
await logSecurityEvent(userId, orgId, "login", "success");
```

### Testing

A comprehensive test suite ensures all functionality works correctly:

**Testing Checklist:**

- ✅ Login and authentication flows
- ✅ Dashboard and navigation
- ✅ User settings (profile, security, notifications)
- ✅ Organization settings (general, team, billing, roles)
- ✅ RBAC permission enforcement
- ✅ Tier-based feature gating
- ✅ Sidebar navigation and role display
- ✅ 2FA setup and verification
- ✅ Security audit log recording

See `TESTING_CHECKLIST.md` for detailed test scenarios.

### Documentation

Complete documentation is available in `/docs/rbac-settings/`:

- `README.md` - Documentation index
- `RBAC_QUICK_REFERENCE.md` - Developer reference for RBAC
- `CUSTOM_ROLE_CAPABILITIES.md` - Custom permissions guide
- `SETTINGS_ARCHITECTURE.md` - System architecture overview
- `SETTINGS_INTEGRATION.md` - Database integration details
- `SETTINGS_DATABASE_SCHEMA.sql` - Complete schema migration
- `SEED_CAPABILITIES.sql` - Initial data seeding
- `MIGRATION_GUIDE.md` - Step-by-step migration instructions

### Quick Start

**Apply Database Migrations:**

```bash
# Using Supabase CLI
supabase db push

# Or run SQL directly
psql "postgresql://postgres:[PASSWORD]@db.your-project.supabase.co:5432/postgres" \
  -f docs/rbac-settings/SETTINGS_DATABASE_SCHEMA.sql

# Seed capabilities
psql "postgresql://postgres:[PASSWORD]@db.your-project.supabase.co:5432/postgres" \
  -f docs/rbac-settings/SEED_CAPABILITIES.sql
```

**Check User Permissions:**

```typescript
import { getUserPermissions, userHasCapability } from "@/lib/rbac/permissions";

// Get all permissions for a user
const permissions = await getUserPermissions(user.role, orgId);

// Check specific capability
if (userHasCapability(permissions, "projects.create")) {
  // User can create projects
}
```

**Filter Navigation by Permissions:**

```typescript
import { filterNavigationByPermissions } from "@/lib/rbac/permissions";

const visibleRoutes = filterNavigationByPermissions(routes, permissions);
```

---
