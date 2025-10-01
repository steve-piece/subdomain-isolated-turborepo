# RBAC Architecture Overview

## System Architecture

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

## Key Features

- **Multi-Tenant Architecture**: Subdomain-based tenant isolation
- **Role-Based Access Control**: 5 role levels with 41 granular capabilities
- **Custom Permissions**: Business+ tier organizations can customize role capabilities
- **Security Features**: 2FA, session management, audit logging
- **Settings Management**: User and organization settings with proper permissions
- **Navigation Filtering**: Automatic UI filtering based on user capabilities

## Documentation Structure

- [User Settings](./USER_SETTINGS.md) - Profile, security, and notification management
- [Organization Settings](./ORGANIZATION_SETTINGS.md) - Team, billing, and role management
- [RBAC System](./RBAC_SYSTEM.md) - Role hierarchy, capabilities, and custom permissions
- [Database Schema](./DATABASE_SCHEMA.md) - Complete database structure and relationships
- [Security Features](./SECURITY_FEATURES.md) - 2FA, sessions, audit logging
- [Testing Guide](./TESTING_GUIDE.md) - Comprehensive testing scenarios
- [Quick Reference](./RBAC_QUICK_REFERENCE.md) - Developer reference for implementation

## Quick Start

1. **Apply Database Migrations**: Run the database setup script
2. **Check User Permissions**: Use the RBAC utilities for permission checking
3. **Implement UI Components**: Use `RequireCapability` and `useCapability` for conditional rendering
4. **Customize Roles**: Business+ organizations can customize role capabilities

See the individual documentation files for detailed implementation guides.
