# Testing Checklist - Settings & RBAC System

## ✅ Pre-Testing Setup

- [ ] Database migration applied successfully
- [ ] Dev server running without errors
- [ ] No linter errors in codebase

## 🧪 Manual Testing Guide

### 1. Authentication & Navigation

- [ ] Login as owner role user (steven@hormonefitness.com)
- [ ] Verify subdomain routing works (acme.localhost:3003)
- [ ] Check that AppSidebar renders correctly
- [ ] Verify navigation items visible based on owner role

### 2. User Settings Pages

#### Profile Settings (`/settings/profile`)

- [ ] Page loads without errors
- [ ] Can view/edit profile information
- [ ] Bio, phone number, timezone fields work
- [ ] Profile picture upload UI present

#### Security Settings (`/settings/security`)

- [ ] Security overview displays correctly
- [ ] Password change form works
- [ ] MFA setup component renders
- [ ] Active sessions list displays (if any)
- [ ] Security activity log shows events

#### Notification Settings (`/settings/notifications`)

- [ ] Email notification toggles work
- [ ] In-app notification settings work
- [ ] Digest frequency selector works
- [ ] Quiet hours configuration works

### 3. Organization Settings Pages

#### General Settings (`/org-settings`)

- [ ] Page loads without errors
- [ ] Organization name/description editable
- [ ] Logo upload UI present
- [ ] Website and support email fields work
- [ ] Company size dropdown works

#### Team Settings (`/org-settings/team`)

- [ ] Team member list displays
- [ ] Invite user dialog opens
- [ ] Can send invitation
- [ ] Role management works
- [ ] Remove member functionality works

#### Billing Settings (`/org-settings/billing`)

- [ ] Current plan displays
- [ ] Subscription tier shown correctly
- [ ] Usage statistics display
- [ ] Payment method section present

#### Roles Settings (`/org-settings/roles`)

- [ ] Page loads for owner role
- [ ] Role selector works (owner/superadmin/admin/member/view-only)
- [ ] Capabilities grouped by category
- [ ] Toggle switches work for granting/revoking
- [ ] Custom override indicators show
- [ ] Reset to defaults button works with confirmation
- [ ] Toast notifications show for actions

### 4. RBAC & Permissions

#### Owner Role

- [ ] Can access all settings pages
- [ ] Can access /org-settings/roles page
- [ ] Can modify all capabilities
- [ ] Can invite/remove team members
- [ ] Can delete organization (capability present)

#### Admin Role (if test user available)

- [ ] Cannot access /org-settings/roles (Business+ only for non-owners)
- [ ] Can manage team members
- [ ] Can edit org settings
- [ ] Cannot delete organization

#### Member Role (if test user available)

- [ ] Can only access own user settings
- [ ] Cannot access org settings
- [ ] Cannot invite team members
- [ ] Can view team list

#### View-Only Role (if test user available)

- [ ] Can only view own security settings
- [ ] Cannot edit anything
- [ ] Limited navigation items

### 5. Subscription Tier Features

#### Free Tier (if test org available)

- [ ] Shows upgrade prompt on /org-settings/roles
- [ ] Cannot customize role capabilities
- [ ] Basic features accessible

#### Business Tier (requires test org creation)

- [ ] Can access /org-settings/roles
- [ ] Can customize role capabilities
- [ ] Custom overrides save to database
- [ ] Reset to defaults removes overrides

### 6. Database Integration

#### User Settings Auto-Initialization

- [ ] User settings auto-initialize for new users
- [ ] **Verification:** Check `user_settings` table in Supabase dashboard
- [ ] **Query:** `SELECT * FROM user_settings WHERE user_id = '<new_user_id>'`
- [ ] **Expected:** Row created with default values (bio: null, phone: null, timezone: 'UTC', etc.)

#### Organization Settings Auto-Initialization

- [ ] Org settings auto-initialize for new orgs
- [ ] **Verification:** Check `organization_settings` table in Supabase dashboard
- [ ] **Query:** `SELECT * FROM organization_settings WHERE organization_id = '<new_org_id>'`
- [ ] **Expected:** Row created with default values (company_size: null, website: null, etc.)

#### Custom Capabilities Storage

- [ ] Custom capabilities save to org_role_capabilities table
- [ ] **Verification:** Check `org_role_capabilities` table after modifying role settings
- [ ] **Query:** `SELECT * FROM org_role_capabilities WHERE organization_id = '<org_id>' AND role = '<role_name>'`
- [ ] **Expected:** Custom overrides stored with capability_id and is_granted boolean

#### Security Audit Logging

- [ ] Security events log to security_audit_log
- [ ] **Verification:** Check `security_audit_log` table after security actions
- [ ] **Query:** `SELECT * FROM security_audit_log WHERE user_id = '<user_id>' ORDER BY created_at DESC LIMIT 10`
- [ ] **Expected:** Events like 'password_changed', 'mfa_enabled', 'session_created' with timestamps

#### RLS Policy Enforcement

- [ ] RLS policies enforce correct access
- [ ] **Verification:** Test with different user roles in Supabase SQL editor
- [ ] **Test Query:** `SELECT * FROM organization_settings WHERE organization_id = '<org_id>'`
- [ ] **Expected:** Only returns data if user has proper organization access
- [ ] **Tools:** Use Supabase dashboard SQL editor or database console for testing

### 7. UI/UX Components

- [ ] Sidebar collapsible functionality works
- [ ] Route group layouts render correctly
- [ ] Toast notifications appear and dismiss
- [ ] Switch components toggle correctly
- [ ] AlertDialog shows for destructive actions
- [ ] Loading states display during async operations
- [ ] Error states handled gracefully

### 8. Edge Cases

- [ ] Non-authenticated users redirected to login
- [ ] Wrong subdomain shows appropriate error
- [ ] Invalid role assignments rejected
- [ ] Expired sessions handled correctly
- [ ] Network errors show user-friendly messages

## 🐛 Known Issues / Adjustments Needed

<!-- Document any issues found during testing -->

---

## 📝 Test Results Summary

**Date:** [To be filled]
**Tester:** [To be filled]
**Overall Status:** [ ] Pass / [ ] Fail / [ ] Needs Adjustments

### Issues Found:

1.
2.
3.

### Adjustments Made:

1.
2.
3.
