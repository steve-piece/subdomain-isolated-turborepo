# RBAC & Settings Documentation

This directory contains all documentation related to Role-Based Access Control (RBAC) and Settings management.

## 📚 Documentation Index

### Quick Start
- **[RBAC_QUICK_REFERENCE.md](./RBAC_QUICK_REFERENCE.md)** ⭐ **Start Here**
  - Complete capabilities matrix for all roles
  - Quick lookup for permissions
  - Code examples and common patterns

### Core Documentation
- **[DATABASE_RBAC_PROJECTS_PLAN.md](./DATABASE_RBAC_PROJECTS_PLAN.md)** - Authoritative RBAC Design
  - Complete architecture and design decisions
  - Helper functions and RLS policies
  - Implementation strategy

- **[SETTINGS_DATABASE_SCHEMA.sql](./SETTINGS_DATABASE_SCHEMA.sql)** - SQL Implementation
  - Complete database migration script
  - All tables, indexes, and policies
  - Triggers and helper functions

- **[SETTINGS_INTEGRATION.md](./SETTINGS_INTEGRATION.md)** - Integration Guide
  - How settings integrate with RBAC
  - TypeScript utilities usage
  - Testing and migration steps

- **[SETTINGS_ARCHITECTURE.md](./SETTINGS_ARCHITECTURE.md)** - UI Architecture
  - Modern settings pages design
  - Sidebar and navigation structure
  - Route group organization

### Advanced Topics
- **[CUSTOM_ROLE_CAPABILITIES.md](./CUSTOM_ROLE_CAPABILITIES.md)** - 🆕 Custom Permissions (Business+ Tiers)
  - How organizations can customize role capabilities
  - Admin UI for managing custom permissions
  - Database operations for overrides
  - Migration and audit trail

## 🎯 Quick Navigation

### I want to...

**Understand what permissions each role has**
→ [RBAC_QUICK_REFERENCE.md](./RBAC_QUICK_REFERENCE.md)

**Implement a new feature with permissions**
→ [DATABASE_RBAC_PROJECTS_PLAN.md](./DATABASE_RBAC_PROJECTS_PLAN.md)

**Apply the database schema**
→ [SETTINGS_DATABASE_SCHEMA.sql](./SETTINGS_DATABASE_SCHEMA.sql)

**Integrate settings with my app**
→ [SETTINGS_INTEGRATION.md](./SETTINGS_INTEGRATION.md)

**Allow custom role permissions for premium orgs**
→ [CUSTOM_ROLE_CAPABILITIES.md](./CUSTOM_ROLE_CAPABILITIES.md)

**Build the settings UI**
→ [SETTINGS_ARCHITECTURE.md](./SETTINGS_ARCHITECTURE.md)

## 🔑 Key Concepts

### Role Hierarchy
```
Owner > Superadmin > Admin > Member > View-Only
```

### Permission Layers
1. **Default Role Capabilities** - Standard permissions per role (`role_capabilities`)
2. **Custom Org Overrides** - Organization-specific customization (`org_role_capabilities`)
3. **Project-Level Permissions** - Per-project access control (`project_permissions`)

### Subscription Tiers
- **Free/Pro**: Standard role capabilities only
- **Business+**: Can customize role capabilities per organization
- **Enterprise**: Full customization + custom roles (future)

## 🚀 Implementation Status

- ✅ Database schema designed
- ✅ RLS policies created
- ✅ Helper functions implemented
- ✅ TypeScript utilities built
- ✅ UI components created
- ✅ Documentation complete
- ⏳ SQL migration (ready to apply)
- ⏳ Custom role admin UI
- ⏳ Audit log viewer

## 📖 Related Files

### Application Code
- `apps/protected/lib/rbac/permissions.ts` - Permission checking utilities
- `apps/protected/components/app-sidebar.tsx` - Navigation with RBAC filtering
- `apps/protected/app/s/[subdomain]/(protected)/layout.tsx` - RBAC enforcement
- `apps/protected/app/actions.ts` - Server actions for RBAC operations

### Database
- Supabase project → Tables:
  - `capabilities`
  - `role_capabilities`
  - `org_role_capabilities`
  - `project_permissions`
  - `user_profiles`
  - All settings tables

## 🔗 External Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Policies](https://www.postgresql.org/docs/current/sql-createpolicy.html)
- [RBAC Best Practices](https://auth0.com/docs/manage-users/access-control/rbac)

## 📝 Notes

- All documentation is kept in sync with implementation
- Changes to capabilities should update all relevant docs
- Database is the single source of truth
- Custom capabilities require Business+ subscription tier
- Permission resolution: Custom Overrides → Defaults
