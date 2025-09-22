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
- [shadcn/ui](https://ui.shadcn.com/) for the design system
- [Radix UI](https://www.radix-ui.com/) for accessible components
- [Lucide React](https://lucide.dev/) for icons
- [TypeScript](https://www.typescriptlang.org/) for type safety

## Getting Started

### Prerequisites

- Node.js 20 or later
- pnpm (recommended package manager)

### Installation

1. Clone your repository and cd into it.

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Start the development server(s):

   You can run all apps at once or individually:
   - Run all apps:

     ```bash
     pnpm dev
     ```

   - Run individual apps:

     ```bash
     # Marketing app (port 3000)
     pnpm --filter marketing dev

     # Protected app (port 3001)
     pnpm --filter protected dev
     ```

4. Access the application:
   - Marketing site: http://localhost:3000
   - Protected app: http://localhost:3001
   - Tenant subdomains: http://[tenant].localhost:3001

## Multi‑Tenant Architecture

This application demonstrates a subdomain‑based multi‑tenant architecture where:

- Each tenant gets their own subdomain (`tenant.yourdomain.com`)
- The middleware handles routing requests to the correct tenant
- The main domain hosts the marketing site and tenant discovery
- Subdomains are dynamically mapped to tenant-specific content
- Shared UI components are available across all apps via the workspace package

The middleware (`apps/protected/middleware.ts`) intelligently detects subdomains across various environments (local development, production, and Vercel preview deployments) and rewrites requests to `apps/protected/app/s/[subdomain]/*`.

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
  Redirect-->>User: 302 to https://<subdomain>.<APP_DOMAIN>/login
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
  Action-->>Browser: redirect https://<subdomain>.<APP_DOMAIN>
```

## Deployment

This repository deploys two Next.js apps to Vercel from the same GitHub repo using Turborepo and pnpm workspaces.

- Project A (Marketing):
  - Root Directory: `apps/marketing`
  - Install Command: `corepack enable pnpm && pnpm install --frozen-lockfile`
  - Build Command: `next build`
  - Node.js: 20
  - Domains: attach your marketing domain(s)

- Project B (Protected / Tenants):
  - Root Directory: `apps/protected`
  - Install Command: `corepack enable pnpm && pnpm install --frozen-lockfile`
  - Build Command: `next build`
  - Node.js: 20
  - Domains: attach your app domain and wildcard `*.yourdomain.com` (DNS CNAME to Vercel)

### Environment Variables

Set these in both Vercel projects (and locally via `.env.local`):

- `NEXT_PUBLIC_APP_DOMAIN=yourdomain.com` (for the protected app)

After connecting both projects to the same repo with the Root Directory settings above, push to `main` to trigger builds.
