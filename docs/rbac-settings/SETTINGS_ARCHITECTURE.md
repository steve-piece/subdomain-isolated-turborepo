# Modern Settings Architecture

## Overview

This document describes the new modern settings architecture implemented for the protected app, featuring a collapsible sidebar, route group organization, and beautiful tabbed settings pages.

## Architecture

### Route Groups

The app now uses Next.js route groups to organize pages:

1. **`(dashboard)`** - Main dashboard and admin pages
   - `/dashboard` - User dashboard with stats and quick actions
   - `/admin` - Admin dashboard for organization management

2. **`(user-settings)`** - User-specific settings with tabs
   - `/settings/profile` - Personal information and profile picture
   - `/settings/security` - Password, 2FA, and security settings
   - `/settings/notifications` - Email and notification preferences

3. **`(org-settings)`** - Organization settings with tabs (admin/owner only)
   - `/org-settings` - Organization identity and branding
   - `/org-settings/team` - Team management and invitations
   - `/org-settings/billing` - Plans, payment, and usage

### Sidebar Navigation

The `AppSidebar` component provides:

- **Collapsible design** - Expands/collapses with animation
- **Role-based navigation** - Shows/hides items based on user role
- **Active route highlighting** - Visual feedback for current page
- **Organized groups** - Main, User Settings, Organization sections

### Layouts

#### Protected Layout (`(protected)/layout.tsx`)

- Wraps all authenticated pages
- Includes the sidebar for consistent navigation
- Handles tenant authentication

#### Settings Layouts

Both user and org settings have dedicated layouts with:

- Sticky tab navigation at the top
- Breadcrumb-style titles
- Consistent spacing and styling

## Features

### User Settings

**Profile** (`/settings/profile`)

- Profile picture upload
- Personal information editing
- Account context display
- Danger zone for account deletion

**Security** (`/settings/security`)

- Security overview dashboard
- Password management
- Two-Factor Authentication (2FA) setup
- Active sessions monitoring
- Recent security activity log

**Notifications** (`/settings/notifications`)

- Email notification preferences
- In-app notification settings
- Communication preferences
- Quiet hours configuration

### Organization Settings

**General** (`/org-settings`)

- Organization identity and branding
- Logo upload
- Contact information
- Organization metadata
- Danger zone (transfer ownership, delete org)

**Team** (`/org-settings/team`)

- Team members list with roles
- Invite user functionality
- Pending invitations
- Roles & permissions guide
- Team collaboration settings

**Billing** (`/org-settings/billing`)

- Current plan overview with usage stats
- Available plans comparison
- Payment method management
- Billing history
- Usage statistics

## Design Principles

1. **Modern Aesthetics**
   - Gradient backgrounds
   - Smooth transitions and hover effects
   - Consistent spacing and typography
   - Icon-rich interfaces

2. **Clear Information Hierarchy**
   - Card-based layouts
   - Section grouping
   - Visual separation of content
   - Descriptive labels and helper text

3. **Responsive Design**
   - Mobile-friendly layouts
   - Collapsible sidebar for smaller screens
   - Grid layouts that adapt to screen size

4. **Security-First**
   - Role-based access control
   - Clear danger zones
   - Security status indicators
   - Action confirmations

5. **User Experience**
   - Tab navigation for related settings
   - Quick actions and shortcuts
   - Progress indicators
   - Helpful descriptions and tooltips

## Navigation Structure

```
├── Dashboard (/)
├── Admin Panel (/admin) [owner/admin/superadmin]
├── User Settings
│   ├── Profile (/settings/profile)
│   ├── Security (/settings/security)
│   └── Notifications (/settings/notifications)
└── Organization [owner/admin/superadmin]
    ├── General (/org-settings)
    ├── Team (/org-settings/team)
    └── Billing (/org-settings/billing) [owner/admin]
```

## Components

### AppSidebar

- Location: `components/app-sidebar.tsx`
- Props: `subdomain`, `organizationName`, `userRole`
- Features: Collapsible, role-based filtering, active state

### MFASetup

- Location: `components/mfa-setup.tsx`
- Integrated into Security settings
- Handles 2FA enrollment and verification

## Future Enhancements

- [ ] Profile picture upload functionality
- [ ] Organization logo upload
- [ ] Real-time team member list from database
- [ ] Billing integration with payment provider
- [ ] Usage analytics dashboard
- [ ] Email notification settings backend
- [ ] Quiet hours enforcement
- [ ] Session management (revoke sessions)
- [ ] Security audit logs
- [ ] Team role customization

## Migration Notes

- Old security page removed from `(protected)/security`
- Dashboard page redesigned for sidebar integration
- Admin page streamlined (header removed, sidebar handles navigation)
- Organization dashboard component no longer includes header navigation
