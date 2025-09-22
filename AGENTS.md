# AI Agent Guide: Subdomain Multi-Tenant Architecture

This document explains the technical architecture of this subdomain-isolated turborepo for AI agents working with the codebase.

## 🏗️ Architecture Overview

This is a **multi-tenant SaaS application** with clean subdomain-based routing and strict domain separation. Each tenant gets their own subdomain while sharing the same codebase and infrastructure.

### Domain Structure

- **Marketing Domain**: `https://bask-app.com` - Public marketing site for signup and tenant discovery
- **App Domain**: `https://[company].ghostwrite.app` - Individual tenant applications
- **Root Domain**: `bask-app.com` - Primary domain for marketing and onboarding

### Key Concepts

- **Domain Separation**: Marketing site (`bask-app.com`) handles onboarding, tenant apps (`*.ghostwrite.app`) handle workspaces
- **Clean URLs**: Users see `company.ghostwrite.app/admin`, not `ghostwrite.app/s/company/admin`
- **Session Evaluation**: Protected app homepage evaluates subdomain presence and user session
- **Internal Routing**: Next.js file structure uses `/s/[subdomain]/` for organization
- **Middleware Translation**: Converts clean URLs to internal routing automatically
- **Tenant Isolation**: Each subdomain is a separate tenant with isolated authentication

## 📁 File Structure & URL Mapping

### Apps Structure

```
apps/
├── marketing/          # Public marketing site (bask-app.com)
│   ├── app/
│   │   ├── page.tsx           # Landing page
│   │   ├── auth/sign-up/      # Organization signup
│   │   └── signin/            # Tenant discovery & subdomain lookup
│   └── components/
└── protected/          # Multi-tenant app (*.ghostwrite.app)
    ├── app/
    │   ├── page.tsx            # Session evaluator (redirects based on subdomain)
    │   ├── s/[subdomain]/      # Internal routing structure
    │   │   ├── page.tsx              # Dashboard: company.ghostwrite.app/
    │   │   ├── admin/page.tsx        # Admin: company.ghostwrite.app/admin
    │   │   ├── auth/
    │   │   │   ├── login/page.tsx    # Login: company.ghostwrite.app/auth/login
    │   │   │   ├── confirm/route.ts  # Email confirmation
    │   │   │   └── error/page.tsx    # Auth errors
    │   │   ├── reset-password/page.tsx
    │   │   └── update-password/page.tsx
    ├── middleware.ts     # Core routing logic
    └── components/       # Tenant-specific components
```

### URL Translation Table

| User Sees (Clean URL)                   | Internal Next.js Route      | File Location                               |
| --------------------------------------- | --------------------------- | ------------------------------------------- |
| `company.ghostwrite.app/`               | `/s/company/`               | `app/s/[subdomain]/page.tsx`                |
| `company.ghostwrite.app/admin`          | `/s/company/admin`          | `app/s/[subdomain]/admin/page.tsx`          |
| `company.ghostwrite.app/auth/login`     | `/s/company/auth/login`     | `app/s/[subdomain]/auth/login/page.tsx`     |
| `company.ghostwrite.app/reset-password` | `/s/company/reset-password` | `app/s/[subdomain]/reset-password/page.tsx` |

## ⚙️ Middleware Routing Logic

**File**: `apps/protected/middleware.ts`

### How It Works

1. **Extract Subdomain**: Uses `extractSubdomainFromHostname()` utility
2. **Clean URL Rewrite**: Converts user URLs to internal routing
3. **Prevent Double Routing**: Redirects accidental `/s/` URLs back to clean format

```typescript
// Example flow:
// User visits: company.ghostwrite.app/auth/login
// Middleware extracts: subdomain = "company"
// Rewrites internally to: /s/company/auth/login
// Routes to file: app/s/[subdomain]/auth/login/page.tsx
// User still sees: company.ghostwrite.app/auth/login
```

### Key Middleware Functions

```typescript
if (subdomain && !url.pathname.startsWith("/s/")) {
  // Rewrite clean URL to internal structure
  rewriteUrl.pathname = `/s/${subdomain}${url.pathname}`;
  return NextResponse.rewrite(rewriteUrl);
}

if (url.pathname.startsWith(`/s/${subdomain}`)) {
  // Prevent exposure of internal routing
  const cleanPath = url.pathname.replace(`/s/${subdomain}`, "") || "/";
  return NextResponse.redirect(redirectUrl);
}
```

## 🔐 Authentication System

**Technology**: Supabase Auth with Row Level Security (RLS)

### Authentication Flow

1. **Marketing Site**: Tenant discovery at `bask-app.com/signin`
2. **No Subdomain Access**: Users visiting `ghostwrite.app` (no subdomain) are redirected to `bask-app.com`
3. **Subdomain Login**: User redirected to `company.ghostwrite.app/auth/login`
4. **Session Management**: Handled by Supabase client/server
5. **Route Protection**: Middleware + component-level checks
6. **Clean Redirects**: All auth URLs are clean (no `/s/` paths)

### Key Auth Components

- **`SessionEvaluator`**: Evaluates subdomain presence and redirects appropriately (on protected app homepage)
- **`SubdomainAuthChecker`**: Main auth validation component for authenticated routes
- **`LoginForm`**: Handles authentication with clean URL redirects
- **`LogoutButton`**: Signs out and redirects to clean auth URLs
- **Auth Routes**: Email confirmation, password reset, etc.

### Auth URL Patterns (All Clean)

```
company.ghostwrite.app/auth/login      # Login page
company.ghostwrite.app/reset-password  # Password reset
company.ghostwrite.app/update-password # Update password (from email)
company.ghostwrite.app/auth/confirm    # Email confirmation
company.ghostwrite.app/auth/error      # Auth error handling
```

## 🎯 Component Architecture

### Key Components & Props

All components that need tenant context receive `subdomain` prop:

```typescript
interface Props {
  subdomain: string; // Always passed from route params
  // ... other props
}
```

### Component Hierarchy

```
[subdomain]/page.tsx
└── SubdomainAuthChecker { subdomain }
    └── OrganizationDashboard { subdomain, userEmail }
        └── LogoutButton { subdomain }
```

### URL Patterns in Components

**✅ CORRECT - Clean URLs**

```typescript
<Link href="/admin">Admin Panel</Link>
<Link href="/auth/login">Sign In</Link>
router.push('/auth/reset-password')
```

**❌ WRONG - Internal routing exposed**

```typescript
<Link href={`/s/${subdomain}/admin`}>Admin Panel</Link>
router.push(`/s/${subdomain}/auth/login`)
```

## 🛠️ Development Guidelines

### When Working with URLs

1. **Always use clean URLs** in components and redirects
2. **Keep `/s/[subdomain]/` file structure** - it's for internal routing only
3. **Let middleware handle the translation** between clean and internal URLs
4. **Test both URL formats** to ensure redirects work properly

### When Adding New Routes

1. **Create file**: `app/s/[subdomain]/new-route/page.tsx`
2. **Use clean links**: `href="/new-route"` in components
3. **Test middleware**: Verify `company.domain.com/new-route` works
4. **Handle auth**: Add protection if needed

### Common Patterns

**Page Component with Auth**:

```typescript
export default async function MyPage({
  params,
}: {
  params: Promise<{ subdomain: string }>
}) {
  const { subdomain } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login') // Clean URL redirect
  }

  return <MyComponent subdomain={subdomain} />
}
```

**Client Component with Navigation**:

```typescript
export function MyComponent({ subdomain }: { subdomain: string }) {
  const router = useRouter()

  const handleAction = () => {
    router.push('/dashboard') // Clean URL navigation
  }

  return (
    <Link href="/admin">Admin</Link> {/* Clean URL links */}
  )
}
```

## 🚀 Deployment & Environment

### Vercel Setup

- **Marketing App**: `apps/marketing/` → `bask-app.com`
- **Protected App**: `apps/protected/` → `*.ghostwrite.app` (wildcard)

### Environment Variables

```bash
NEXT_PUBLIC_APP_DOMAIN='ghostwrite.app'
NEXT_PUBLIC_MARKETING_DOMAIN='bask-app.com'
# Supabase vars...
```

### DNS Configuration

```
CNAME *.ghostwrite.app → vercel-deployment.vercel.app
A     bask-app.com     → Vercel IP
CNAME ghostwrite.app   → vercel-deployment.vercel.app (base domain redirects to marketing)
```

## 🔍 Debugging & Troubleshooting

### Common Issues

1. **URLs showing `/s/` paths**: Check middleware logic
2. **Infinite redirects**: Verify clean URL patterns in components
3. **Auth not working**: Check subdomain context in auth components
4. **404 on subdomains**: Verify file structure matches URL patterns

### Debug Tools

- **Browser Network tab**: Check rewrite vs redirect behavior
- **Middleware logs**: Add console.log to middleware for debugging
- **Next.js routing**: Use Next.js router debugger
- **Subdomain extraction**: Test `extractSubdomainFromHostname()` utility

## 📚 Key Files Reference

| File                                                   | Purpose                      |
| ------------------------------------------------------ | ---------------------------- |
| `apps/protected/middleware.ts`                         | Core routing logic           |
| `packages/ui/src/lib/subdomains.ts`                    | Subdomain extraction utility |
| `apps/protected/components/subdomain-auth-checker.tsx` | Main auth component          |
| `apps/protected/app/s/[subdomain]/page.tsx`            | Tenant dashboard             |
| `apps/marketing/components/subdomain-lookup-form.tsx`  | Tenant discovery             |

---

## 🔄 Session Evaluation Pattern

The **SessionEvaluator** component (`apps/protected/components/session-evaluator.tsx`) implements a critical pattern for the homepage of the protected app:

### Purpose

- Handles users visiting the base domain `ghostwrite.app` (no subdomain)
- Redirects them to the marketing site `bask-app.com`
- Shows a loading UI while evaluation happens
- Prevents users from accessing the protected app without a subdomain

### Implementation

```typescript
// Component on apps/protected/app/page.tsx
export default function ProtectedHomePage() {
  return <SessionEvaluator />
}
```

### Evaluation Logic

1. **Extract subdomain** from `window.location.hostname`
2. **No subdomain detected** → Redirect to marketing site
3. **Subdomain exists** → This shouldn't happen (middleware handles it)
4. **Show loading UI** during evaluation

### Why This Pattern?

- **Security**: Prevents direct access to protected app without tenant context
- **User Experience**: Seamless redirects with loading state
- **Architecture Integrity**: Maintains strict domain separation
- **Edge Case Handling**: Gracefully handles unexpected scenarios

## 💡 Remember

This architecture provides **clean, professional URLs** while maintaining **internal routing flexibility** and **strict domain separation**. The middleware handles routing magic, while the SessionEvaluator ensures proper access patterns. Always think "clean URLs for users, internal structure for Next.js routing, marketing for onboarding."
