# Invitation & Login Flow Fixes

## Issues Fixed

### 1. ✅ Login Form Autocomplete

**Problem**: Email and password fields missing autocomplete attributes  
**Fix**: Added `autoComplete="email"` and `autoComplete="current-password"` to login form inputs  
**File**: `apps/protected/components/auth/login-form.tsx`

### 2. ✅ Invitation Email Subject Line

**Problem**: Missing app name in invitation email subject  
**Fix**: Changed subject from `You're invited to join ${organizationName}` to `[${appName}] You're invited to join ${organizationName}`  
**File**: `supabase/functions/send-email/index.ts` (line 338)

### 3. ✅ Invitation Login Flow Failure (CRITICAL)

**Problem**: After accepting invitation and setting password, users were redirected to login page instead of dashboard because:

- No `user_profiles` row existed after password set
- Custom claims hook (`custom_claims_hook`) couldn't find user data
- Protected layout checked `claims.claims.subdomain !== subdomain` → failed (subdomain was NULL)
- User got redirected back to login

**Root Cause**: The invitation flow was:

1. User invited → metadata saved to `user_metadata` in Supabase Auth
2. Password set via `updateUser({ password })`
3. Redirect to `/dashboard`
4. **BUT** custom claims are pulled from `user_profiles` table, not `user_metadata`
5. Without a `user_profiles` row, claims were NULL → auth failed

**Fix**: Updated `completeInvitation()` function to:

1. Extract invitation metadata (org_id, subdomain, user_role) from `user_metadata`
2. **Create `user_profiles` row** before setting password
3. Set password
4. **Refresh session** to get new JWT with custom claims populated
5. Redirect to dashboard (now works because claims exist)

**File**: `apps/protected/app/actions/invitations/accept.ts`

## Complete Invitation Flow (Fixed)

```
1. Admin sends invitation
   └─> inviteUserByEmail() with metadata { org_id, subdomain, user_role }

2. User receives email: "[AppName] You're invited to join Org"

3. User clicks invitation link
   └─> verifyOtp({ type: "invite" }) → session created

4. User sets password
   └─> completeInvitation() NOW:
       ├─> Extract metadata from user_metadata
       ├─> Create user_profiles row ✨ NEW
       ├─> Set password via updateUser()
       ├─> Refresh session (JWT now has claims) ✨ NEW
       └─> Redirect to /dashboard

5. Dashboard loads
   └─> Protected layout reads claims.subdomain ✅ WORKS
       └─> User sees dashboard

6. User can now login normally
   └─> Custom claims hook finds user_profiles row
   └─> Login succeeds
```

## Testing Checklist

- [ ] Send invitation email → verify subject contains `[AppName]`
- [ ] Accept invitation → set password
- [ ] Verify redirect to dashboard (NOT login page)
- [ ] Verify no errors in console
- [ ] Logout and login again → verify login works
- [ ] Test with autocomplete → verify browser suggests email/password

## Related Files Modified

1. `apps/protected/components/auth/login-form.tsx` - Added autocomplete
2. `supabase/functions/send-email/index.ts` - Updated email subject
3. `apps/protected/app/actions/invitations/accept.ts` - Fixed invitation completion flow
