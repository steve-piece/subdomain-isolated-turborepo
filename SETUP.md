# ⚙️ Setup Guide

Quick reference for configuring your application.

## 📧 Email Configuration

### App Name Configuration

The app name appears in email templates (e.g., "Welcome to {appName}!"). Configure it using one of these methods:

**Option 1: Set directly in code (Recommended for quick setup)**

1. Open `supabase/functions/send-email/index.ts`
2. Find the `configuredAppName` variable (around line 36)
3. Replace the empty string with your app name:
   ```typescript
   const configuredAppName = "Your App Name";
   ```
4. Redeploy the function:
   ```bash
   cd supabase
   npx supabase functions deploy send-email
   ```

**Option 2: Set via environment variable**

```bash
npx supabase secrets set APP_NAME="Your App Name"
```

**Default:** If neither is set, emails will use "our platform" as a fallback.

### Priority Order

The app name is resolved in this order:

1. `configuredAppName` variable in `supabase/functions/send-email/index.ts`
2. `APP_NAME` environment variable (Supabase secret)
3. Fallback: `"our platform"`

## 🔧 Other Configuration

See `docs/GETTING_STARTED.md` for complete setup instructions.
