# Turborepo Setup Guide

This guide explains how to use and configure Turborepo features in this monorepo.

## ✅ Already Configured

Your Turborepo setup includes:

- ✅ Basic task pipeline (`build`, `lint`, `dev`)
- ✅ Type checking task (`check-types`)
- ✅ Test task configuration (`test`, `test:watch`)
- ✅ Remote caching enabled
- ✅ Task dependencies and outputs configured
- ✅ Environment variable tracking

## 🚀 Key Features

### 1. Remote Caching

Remote caching allows you to share build artifacts across machines and CI/CD pipelines, dramatically speeding up builds.

#### Setup Options

**Option A: Turborepo Remote Cache (Recommended)**

1. Sign up at [vercel.com](https://vercel.com) (free tier available)
2. Link your repository:
   ```bash
   npx turbo login
   npx turbo link
   ```
3. Get your team token from [vercel.com/teams](https://vercel.com/teams)
4. Set environment variables:
   ```bash
   # For local development
   export TURBO_TOKEN=your_token_here
   export TURBO_TEAM=your_team_slug
   ```

**Option B: Vercel Remote Cache**

If you're already using Vercel for deployment, remote caching is automatically enabled when you:
- Deploy to Vercel
- Use `vercel link` in your project

#### Verify Remote Caching

```bash
# Run a build and check cache hits
pnpm run build

# You should see cache hits like:
# ✓ marketing:build (cache hit, duration=123ms)
# ✓ protected:build (cache hit, duration=456ms)
```

### 2. Turbo Daemon

The Turbo daemon runs in the background to speed up local development by maintaining a persistent cache.

#### Start the Daemon

```bash
# Start daemon (runs automatically on first turbo command)
pnpm run turbo:daemon

# Or manually
npx turbo daemon start
```

#### Check Daemon Status

```bash
npx turbo daemon status
```

#### Stop the Daemon

```bash
npx turbo daemon stop
```

### 3. Task Pipeline

Your `turbo.json` defines the following tasks:

| Task | Description | Cache Enabled |
|------|-------------|---------------|
| `build` | Build all apps and packages | ✅ Yes |
| `lint` | Lint all code | ✅ Yes |
| `test` | Run tests | ✅ Yes |
| `test:watch` | Run tests in watch mode | ❌ No (persistent) |
| `check-types` | TypeScript type checking | ✅ Yes |
| `dev` | Start development servers | ❌ No (persistent) |
| `clean` | Clean build artifacts | ❌ No |

### 4. Available Commands

```bash
# Build all packages and apps
pnpm run build

# Run development servers
pnpm run dev

# Lint all code
pnpm run lint

# Run tests
pnpm run test

# Run tests in watch mode
pnpm run test:watch

# Type check all TypeScript
pnpm run type-check

# Clean all build artifacts
pnpm run clean

# Visualize task graph
pnpm run turbo:graph

# Manage Turbo daemon
pnpm run turbo:daemon
```

### 5. Task Graph Visualization

Visualize your task dependencies:

```bash
pnpm run turbo:graph
```

This generates a visual representation of your task pipeline showing:
- Task dependencies
- Execution order
- Parallel execution opportunities

### 6. Filtering Tasks

Run tasks for specific packages:

```bash
# Build only the marketing app
pnpm run build --filter=marketing

# Build only the protected app
pnpm run build --filter=protected

# Build a specific package
pnpm run build --filter=@workspace/ui

# Build marketing and its dependencies
pnpm run build --filter=marketing...

# Build everything that depends on a package
pnpm run build --filter=...@workspace/ui
```

### 7. Cache Management

#### View Cache Statistics

```bash
npx turbo run build --dry-run=json
```

#### Clear Local Cache

```bash
# Clear all local cache
rm -rf .turbo

# Or use the clean task
pnpm run clean
```

#### Force Rebuild (Skip Cache)

```bash
# Force rebuild without using cache
pnpm run build --force
```

### 8. Environment Variables

Your `turbo.json` tracks environment variables that affect builds. These are automatically included in cache keys, so changes to these variables will invalidate the cache.

To add new environment variables:

1. Edit `turbo.json`
2. Add the variable name to the `env` array in the relevant task
3. Rebuild to pick up changes

### 9. CI/CD Integration

Your GitHub Actions workflow is already configured with:

```yaml
env:
  TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  TURBO_TEAM: ${{ vars.TURBO_TEAM }}
```

Make sure to set these secrets in your GitHub repository settings:
- `TURBO_TOKEN`: Your Turborepo authentication token
- `TURBO_TEAM`: Your team slug (as a repository variable)

### 10. Performance Tips

1. **Use Remote Caching**: Share cache across team members and CI
2. **Enable Daemon**: Keep the daemon running for faster local builds
3. **Filter Tasks**: Only run tasks for packages you're working on
4. **Monitor Cache Hits**: Check cache hit rates to optimize task configuration
5. **Parallel Execution**: Turborepo automatically runs independent tasks in parallel

## 🔧 Troubleshooting

### Cache Not Working

1. Check remote cache is enabled: `"remoteCache": { "enabled": true }` in `turbo.json`
2. Verify authentication: `npx turbo login`
3. Check team link: `npx turbo link`
4. Verify environment variables are set

### Daemon Issues

```bash
# Restart daemon
npx turbo daemon stop
npx turbo daemon start

# Check daemon logs
npx turbo daemon status
```

### Build Failures

```bash
# Clear cache and rebuild
pnpm run clean
pnpm run build

# Run with verbose output
pnpm run build --verbose
```

## 📚 Additional Resources

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [Turborepo Remote Caching](https://turbo.build/repo/docs/core-concepts/remote-caching)
- [Task Configuration](https://turbo.build/repo/docs/reference/configuration)
- [Filtering](https://turbo.build/repo/docs/core-concepts/filtering)
