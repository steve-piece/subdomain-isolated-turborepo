# Server Actions Organization

This directory contains all Next.js Server Actions organized by feature domain with a granular subdirectory structure for better maintainability, discoverability, and code organization.

## Directory Structure

```
app/actions/
├── index.ts                      # Root barrel export (optional convenience)
├── auth/
│   ├── index.ts                  # Barrel export
│   ├── login.ts                  # loginWithToast
│   ├── password.ts               # updatePassword
│   ├── email-verification.ts     # resendEmailVerification, confirmEmailAndBootstrap, handleAuthConfirmation
│   ├── magic-link.ts            # sendMagicLink
│   ├── reauthentication.ts      # verifyReauthentication
│   └── session.ts                # signOut
├── invitations/
│   ├── index.ts
│   ├── send.ts                   # inviteUserToOrganization
│   └── accept.ts                 # completeInvitation
├── mfa/
│   ├── index.ts
│   ├── enrollment.ts             # enrollMFA, verifyMFAEnrollment
│   ├── verification.ts           # challengeMFA, verifyMFA
│   └── management.ts             # unenrollMFA, getMFAFactors
├── profile/
│   ├── index.ts
│   ├── user.ts                   # updateUserProfile
│   └── notifications.ts          # updateNotificationPreferences
├── rbac/
│   ├── index.ts
│   ├── capabilities.ts           # grantCustomCapability, revokeCustomCapability
│   ├── roles.ts                  # resetRoleToDefaults
│   └── query.ts                  # canCustomizeRoles, getOrgCustomCapabilities, getAllCapabilities
├── onboarding/
│   ├── index.ts
│   ├── logo.ts                   # uploadOrganizationLogo, removeOrganizationLogo
│   └── setup.ts                  # completeOnboarding
└── organization/
    ├── index.ts
    └── settings.ts               # updateOrganizationIdentity
```

## Import Conventions

### Option 1: Import from Category (Recommended)

Use barrel exports for cleaner imports:

```typescript
// Import from category - uses barrel export
import { loginWithToast, updatePassword, signOut } from "@actions/auth";
import {
  inviteUserToOrganization,
  completeInvitation,
} from "@actions/invitations";
import { enrollMFA, verifyMFA, challengeMFA } from "@actions/mfa";
import {
  updateUserProfile,
  updateNotificationPreferences,
} from "@actions/profile";
import { grantCustomCapability, canCustomizeRoles } from "@actions/rbac";
import {
  uploadOrganizationLogo,
  completeOnboarding,
} from "@actions/onboarding";
import { updateOrganizationIdentity } from "@actions/organization";
```

### Option 2: Import from Specific File

For more explicit imports or when you want to be clear about where a function comes from:

```typescript
// Import from specific file
import { loginWithToast } from "@actions/auth/login";
import { updatePassword } from "@actions/auth/password";
import { sendMagicLink } from "@actions/auth/magic-link";
import { signOut } from "@actions/auth/session";

import { inviteUserToOrganization } from "@actions/invitations/send";
import { completeInvitation } from "@actions/invitations/accept";

import { enrollMFA, verifyMFAEnrollment } from "@actions/mfa/enrollment";
import { challengeMFA, verifyMFA } from "@actions/mfa/verification";
import { unenrollMFA, getMFAFactors } from "@actions/mfa/management";

import { updateUserProfile } from "@actions/profile/user";
import { updateNotificationPreferences } from "@actions/profile/notifications";

import {
  grantCustomCapability,
  revokeCustomCapability,
} from "@actions/rbac/capabilities";
import { resetRoleToDefaults } from "@actions/rbac/roles";
import { canCustomizeRoles, getAllCapabilities } from "@actions/rbac/query";

import {
  uploadOrganizationLogo,
  removeOrganizationLogo,
} from "@actions/onboarding/logo";
import { completeOnboarding } from "@actions/onboarding/setup";

import { updateOrganizationIdentity } from "@actions/organization/settings";
```

## Action Categories

### 🔐 Authentication (`auth/`)

**login.ts**

- `loginWithToast()` - Email/password login with toast feedback

**password.ts**

- `updatePassword()` - Update user password (supports recovery tokens)

**email-verification.ts**

- `resendEmailVerification()` - Resend signup verification email
- `confirmEmailAndBootstrap()` - Verify email OTP and bootstrap org
- `handleAuthConfirmation()` - Handle various auth confirmation flows

**magic-link.ts**

- `sendMagicLink()` - Send passwordless magic link

**reauthentication.ts**

- `verifyReauthentication()` - Verify reauthentication token

**session.ts**

- `signOut()` - Sign out current user

### 👥 Invitations (`invitations/`)

**send.ts**

- `inviteUserToOrganization()` - Invite user with role assignment

**accept.ts**

- `completeInvitation()` - Complete invitation with password setup

### 🔒 Multi-Factor Authentication (`mfa/`)

**enrollment.ts**

- `enrollMFA()` - Start MFA enrollment
- `verifyMFAEnrollment()` - Verify MFA enrollment code

**verification.ts**

- `challengeMFA()` - Send MFA verification code
- `verifyMFA()` - Verify MFA code during login

**management.ts**

- `unenrollMFA()` - Disable 2FA
- `getMFAFactors()` - List user's MFA factors

### 👤 Profile (`profile/`)

**user.ts**

- `updateUserProfile()` - Update user profile information

**notifications.ts**

- `updateNotificationPreferences()` - Update notification settings

### 🛡️ RBAC (`rbac/`)

**capabilities.ts**

- `grantCustomCapability()` - Grant custom capability to role
- `revokeCustomCapability()` - Revoke custom capability from role

**roles.ts**

- `resetRoleToDefaults()` - Reset role to default capabilities

**query.ts**

- `canCustomizeRoles()` - Check if org can customize roles (Business+ tier)
- `getOrgCustomCapabilities()` - Get org's custom capabilities
- `getAllCapabilities()` - Get all available capabilities

### 🎨 Onboarding (`onboarding/`)

**logo.ts**

- `uploadOrganizationLogo()` - Upload org logo to Supabase Storage
- `removeOrganizationLogo()` - Remove org logo

**setup.ts**

- `completeOnboarding()` - Complete organization onboarding

### 🏢 Organization (`organization/`)

**settings.ts**

- `updateOrganizationIdentity()` - Update organization name and description

## Benefits of Granular Structure

1. **Single Responsibility** - Each file has one clear purpose (50-300 lines)
2. **Easier Navigation** - Find specific actions quickly by file name
3. **Better Git History** - Changes to one concern don't affect others
4. **Improved Testing** - Test individual concerns in isolation
5. **Clear Boundaries** - Each file exports related functionality only
6. **Flexible Imports** - Choose between barrel exports or specific files
7. **Reduced Merge Conflicts** - Team members work on different files
8. **Better Documentation** - File names are self-documenting

## Best Practices

1. **Keep actions focused** - Each file should contain actions for a single concern
2. **Use TypeScript** - All actions have proper return types and interfaces
3. **Error handling** - Use Sentry for logging and return user-friendly messages
4. **Authentication checks** - Always validate user claims and subdomain context
5. **Subdomain validation** - Use `isValidSubdomain()` from `@workspace/ui/lib/subdomains`
6. **Return typed results** - Use `{ success: boolean; message?: string; ... }` pattern
7. **Prefer barrel exports** - Import from category level for cleaner code

## Adding New Actions

1. Choose the appropriate category directory (or create a new one)
2. Create a new file with a descriptive name (e.g., `password-reset.ts`)
3. Add the action with proper types and error handling
4. Follow the "use server" directive pattern
5. Import from `@/lib/supabase/server` for RLS-protected operations
6. Use `@/lib/supabase/admin` only for admin operations (service role)
7. Export the action and add it to the category's `index.ts` barrel export
8. Update this README with the new action

## Migration Notes

### Evolution of Structure

1. **v1.0** - Monolithic `actions.ts` file (1,633 lines)
   - Single file for all actions
   - Hard to navigate and maintain

2. **v2.0** - Category-based flat files
   - Split into 7 category files (auth.ts, mfa.ts, etc.)
   - Better organization but still 150-600 lines per file

3. **v3.0** - Granular subdirectory structure (Current)
   - Each concern gets its own file (50-300 lines)
   - Maximum maintainability and discoverability

### Benefits Achieved

- **Maintainability** ⬆️ - Smaller, focused files are easier to update
- **Discoverability** ⬆️ - Clear organization makes actions easy to find
- **Code splitting** ⬆️ - Import only what you need
- **Testing** ⬆️ - Test concerns independently
- **Team collaboration** ⬆️ - Reduced merge conflicts
- **Onboarding** ⬆️ - New developers can find things quickly

---

**Configuration**: The `@actions/*` path alias is configured in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"],
      "@actions/*": ["./app/actions/*"]
    }
  }
}
```
