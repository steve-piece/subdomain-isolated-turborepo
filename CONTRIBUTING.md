# 🤝 Contributing Guide

Thank you for considering contributing to this multi-tenant SaaS template! This guide will help you get started.

---

## 🌟 Ways to Contribute

### 1. 📝 Documentation

- **Fix typos or unclear instructions** in setup guides
- **Add missing explanations** for complex features
- **Improve troubleshooting** with solutions you've discovered
- **Translate documentation** to other languages
- **Create tutorials** or video guides

### 2. 🐛 Bug Reports

- **Report issues** you encounter during setup or development
- **Describe reproduction steps** clearly
- **Include environment details** (OS, Node version, etc.)
- **Share error messages** and logs

### 3. ✨ Feature Suggestions

- **Propose new features** that would benefit all users
- **Suggest improvements** to existing functionality
- **Share use cases** that aren't well-supported

### 4. 💻 Code Contributions

- **Fix bugs** reported in issues
- **Implement requested features**
- **Improve performance** or security
- **Add tests** for existing code
- **Refactor** to improve code quality

---

## 🚀 Getting Started

### Prerequisites

1. Read [Getting Started](./docs/GETTING_STARTED.md) to understand requirements and setup
2. Review [Architecture](./docs/ARCHITECTURE.md) for platform overview
3. Check `.cursor/rules/` for coding standards

### Fork & Clone

```bash
# Fork the repository on GitHub first

# Clone your fork
git clone https://github.com/YOUR_USERNAME/subdomain-isolated-turborepo.git
cd subdomain-isolated-turborepo

# Add upstream remote
git remote add upstream https://github.com/steve-piece/subdomain-isolated-turborepo.git

# Install dependencies
pnpm install

# Create a branch for your work
git checkout -b feature/your-feature-name
```

---

## 📋 Contribution Guidelines

### Code Standards

We follow strict coding standards enforced by rules in `.cursor/rules/`:

#### 1. Performance & Auth Architecture

**✅ DO:**

- Check auth once at layout level, share via context
- Use `getClaims()` for auth checks (faster than `getUser()`)
- Default to server components, extract client components for interactivity
- Use `revalidate` for caching (avoid `noStore()` unless critical)

**❌ DON'T:**

- Duplicate auth checks in page components
- Use `noStore()` without justification
- Make entire pages client-side
- Skip cache revalidation after updates

See [.cursor/rules/qauthContext.mdc](./.cursor/rules/qauthContext.mdc) for complete rules.

#### 2. Server Actions & Database Access

**✅ DO:**

- Validate user claims and tenant subdomain
- Use transactions for multi-table operations
- Include proper error handling
- Revalidate cache after mutations

**❌ DON'T:**

- Access database without auth validation
- Use service role key in client code
- Skip RLS policy checks

See [.cursor/rules/actions.mdc](./.cursor/rules/actions.mdc) for complete rules.

#### 3. Component Organization

**File Structure:**

```
components/
├── shared/              # Used across 2+ routes
├── [feature]/           # Feature-specific components
│   ├── [feature]-wrapper.tsx
│   ├── [feature]-form.tsx
│   └── actions.ts
```

**Naming Conventions:**

- Wrappers: `{route}-wrapper.tsx`
- Features: `{feature}-{type}.tsx`
- Actions: `actions.ts` (co-located with components)

### TypeScript

- **Use TypeScript** for all new code
- **Add types** for function parameters and return values
- **Avoid `any`** - use proper types
- **Export types** that are used in multiple files

### Testing

Before submitting:

```bash
# Run linting
pnpm lint

# Run type checking
pnpm type-check

# Run builds to ensure no errors
pnpm build
```

---

## 🔄 Pull Request Process

### 1. Prepare Your Changes

```bash
# Ensure you're on latest main
git checkout main
git pull upstream main

# Rebase your branch
git checkout feature/your-feature-name
git rebase main

# Run tests
pnpm lint
pnpm build
```

### 2. Commit Guidelines

We use conventional commits:

```bash
# Format: <type>(<scope>): <description>

# Examples:
git commit -m "feat(auth): add social login support"
git commit -m "fix(email): resolve template rendering issue"
git commit -m "docs(setup): clarify DNS configuration steps"
git commit -m "refactor(rbac): improve permission checking performance"
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Scopes:**

- `auth`, `email`, `billing`, `database`, `ui`, `docs`, etc.

### 3. Create Pull Request

1. **Push your branch**

   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create PR on GitHub**
   - Use a clear, descriptive title
   - Reference related issues (`Fixes #123`)
   - Describe what changed and why
   - Include screenshots for UI changes
   - List any breaking changes

3. **PR Template** (use this structure):

```markdown
## Description

Brief description of changes

## Motivation

Why is this change needed?

## Changes Made

- Added X
- Fixed Y
- Updated Z

## Testing

- [ ] Tested locally
- [ ] No console errors
- [ ] Builds successfully
- [ ] Follows coding standards

## Screenshots (if applicable)

[Add screenshots here]

## Related Issues

Fixes #123
```

### 4. Code Review

- **Respond to feedback** promptly
- **Make requested changes** in new commits (don't force push during review)
- **Ask questions** if feedback is unclear
- **Be patient** - reviews may take time

### 5. After Approval

Once approved, a maintainer will merge your PR. Thank you for contributing!

---

## 📖 Documentation Contributions

### Documentation Standards

- **Use clear, simple language**
- **Include code examples** where helpful
- **Add command-line examples** for setup steps
- **Use consistent formatting**
- **Test all commands** before submitting

### Files to Update

- **[Getting Started](./docs/GETTING_STARTED.md)** - Complete setup guide
- **[Architecture](./docs/ARCHITECTURE.md)** - Platform architecture
- **[Database](./docs/DATABASE.md)** - Database schema reference
- **[README.md](./README.md)** - Project overview

### Suggesting Improvements

If documentation is unclear:

1. **Open an issue** describing the problem
2. **Suggest specific changes** if you have ideas
3. **Submit a PR** if you want to fix it yourself

---

## 🐛 Bug Report Guidelines

### Before Submitting

1. **Search existing issues** - your bug may already be reported
2. **Try latest version** - bug may be fixed in main branch
3. **Check troubleshooting** - see [Getting Started Troubleshooting](./docs/GETTING_STARTED.md#-troubleshooting)

### Bug Report Template

```markdown
## Bug Description

Clear description of the bug

## Steps to Reproduce

1. Go to...
2. Click on...
3. See error...

## Expected Behavior

What should happen?

## Actual Behavior

What actually happens?

## Environment

- OS: [e.g., macOS 14.0]
- Node Version: [e.g., v20.11.0]
- pnpm Version: [e.g., 9.15.0]
- Browser: [e.g., Chrome 120]

## Error Messages
```

Paste full error messages and stack traces

```

## Screenshots
[Add screenshots if applicable]

## Additional Context
Any other relevant information
```

---

## ✨ Feature Request Guidelines

### Before Requesting

1. **Search existing requests** - feature may already be proposed
2. **Check roadmap** - feature may be planned
3. **Consider scope** - should this be a template feature or app-specific?

### Feature Request Template

```markdown
## Feature Description

Clear description of the proposed feature

## Problem it Solves

What problem does this address?

## Proposed Solution

How should this work?

## Alternatives Considered

What other solutions did you consider?

## Use Cases

Who would benefit from this?

## Implementation Ideas

(Optional) Suggestions for how to implement
```

---

## 🎨 UI/UX Contributions

### Design Principles

- **Simplicity** - Keep interfaces clean and intuitive
- **Accessibility** - Follow WCAG guidelines
- **Consistency** - Match existing design patterns
- **Responsiveness** - Test on mobile, tablet, desktop

### Component Guidelines

- Use **shadcn/ui components** from `@workspace/ui`
- Follow **Radix UI** patterns for accessibility
- Use **Tailwind CSS** for styling (no inline styles)
- Add **proper ARIA labels** for screen readers

---

## 🧪 Testing Guidelines

### What to Test

- **Authentication flows** - signup, login, logout
- **RBAC permissions** - role-based access control
- **Subdomain routing** - tenant isolation
- **Email sending** - transactional emails
- **Database operations** - CRUD with RLS policies

### Manual Testing Checklist

Before submitting a PR:

- [ ] Works in Chrome, Firefox, and Safari
- [ ] Responsive on mobile and desktop
- [ ] No console errors or warnings
- [ ] Auth flows work correctly
- [ ] RLS policies prevent unauthorized access
- [ ] Email templates render properly

---

## 🔐 Security Considerations

### Security Best Practices

- **Never commit secrets** - use environment variables
- **Validate all inputs** - prevent injection attacks
- **Check authorization** - enforce RLS and RBAC
- **Use prepared statements** - prevent SQL injection
- **Sanitize user content** - prevent XSS attacks

### Reporting Security Issues

**DO NOT** open public issues for security vulnerabilities.

Instead:

1. Open a private security advisory on GitHub with details
2. Include reproduction steps
3. Suggest a fix if possible
4. Allow time for patch before public disclosure

---

## 📜 License

By contributing, you agree that your contributions will be licensed under the same license as the project (see [LICENSE](./LICENSE) file).

---

## 🙏 Recognition

Contributors will be:

- **Listed in CONTRIBUTORS.md**
- **Mentioned in release notes** for significant contributions
- **Credited in documentation** for major features

---

## ❓ Questions?

- **General Questions**: Open a [Discussion](https://github.com/steve-piece/subdomain-isolated-turborepo/discussions)
- **Contribution Help**: Tag maintainers in your PR or issue
- **Setup Issues**: See [Getting Started Troubleshooting](./docs/GETTING_STARTED.md#-troubleshooting)

---

Thank you for contributing! Every contribution, no matter how small, helps make this template better for everyone. 🚀
