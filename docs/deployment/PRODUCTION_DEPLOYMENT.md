# Production Deployment

Complete guide for deploying the subdomain-isolated Turborepo to production using Vercel.

## Deployment Architecture

```mermaid
graph TB
    subgraph "🌍 DNS Configuration"
        D1[${NEXT_PUBLIC_MARKETING_DOMAIN}]
        D2[*.${NEXT_PUBLIC_APP_DOMAIN}]
        D3[${NEXT_PUBLIC_APP_DOMAIN}]
    end

    subgraph "☁️ Vercel Projects"
        V1[📱 Marketing Project<br/>apps/marketing]
        V2[🔒 Protected Project<br/>apps/protected]
    end

    subgraph "📁 GitHub Repository"
        R1[turborepo-main]
    end

    D1 --> V1
    D2 --> V2
    D3 --> V2
    R1 --> V1
    R1 --> V2

    style V1 fill:#e1f5fe
    style V2 fill:#f3e5f5
    style R1 fill:#e8f5e8
```

## Step 1: Supabase Integration with Vercel

### Option A: Vercel Integration (Recommended)

1. **Connect Supabase to Vercel**:
   - Go to your Vercel dashboard
   - Navigate to your project → **Integrations**
   - Install the **Supabase integration**
   - This automatically syncs environment variables

### Option B: Manual Environment Setup

1. **Copy Environment Variables**:
   - Go to your Supabase dashboard
   - Navigate to Project Settings → API
   - Copy the following variables:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY` (server-side only)

2. **Add to Vercel Projects**:
   - Go to each Vercel project
   - Navigate to Settings → Environment Variables
   - Add the Supabase variables

## Step 2: Create Two Vercel Projects

```mermaid
flowchart LR
    A[📁 Same GitHub Repo] --> B[📱 Marketing Project]
    A --> C[🔒 Protected Project]

    B --> D[Root Directory:<br/>apps/marketing]
    C --> E[Root Directory:<br/>apps/protected]

    D --> F[Domain:<br/>${NEXT_PUBLIC_MARKETING_DOMAIN}]
    E --> G[Domains:<br/>${NEXT_PUBLIC_APP_DOMAIN}<br/>*.${NEXT_PUBLIC_APP_DOMAIN}]
```

### Project A (Marketing)

- **Root Directory**: `apps/marketing`
- **Install Command**: `corepack enable pnpm && pnpm install --frozen-lockfile`
- **Build Command**: `next build`
- **Node.js**: 20
- **Domains**: `${NEXT_PUBLIC_MARKETING_DOMAIN}`

### Project B (Protected / Tenants)

- **Root Directory**: `apps/protected`
- **Install Command**: `corepack enable pnpm && pnpm install --frozen-lockfile`
- **Build Command**: `next build`
- **Node.js**: 20
- **Domains**: `${NEXT_PUBLIC_APP_DOMAIN}` and wildcard `*.${NEXT_PUBLIC_APP_DOMAIN}`

## Step 3: Environment Variables Configuration

Set these in **both** Vercel projects:

```bash
# Core Domain Configuration
NEXT_PUBLIC_APP_DOMAIN=yourdomain.com
NEXT_PUBLIC_MARKETING_DOMAIN=yourdomain.com

# Supabase Configuration (auto-synced if using Vercel integration)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=your_supabase_anon_key

# Optional: Server-side only (for admin operations)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Step 4: DNS Configuration

```mermaid
graph LR
    subgraph "🌐 DNS Records"
        A[A Record<br/>${NEXT_PUBLIC_MARKETING_DOMAIN}] --> D[Vercel IP]
        B[CNAME<br/>*.${NEXT_PUBLIC_APP_DOMAIN}] --> E[vercel-deployment.vercel.app]
        C[CNAME<br/>${NEXT_PUBLIC_APP_DOMAIN}] --> E
    end

    subgraph "☁️ Vercel Projects"
        V1[Marketing Project]
        V2[Protected Project]
    end

    D --> V1
    E --> V2
```

### DNS Records Setup

1. **Marketing Domain**:
   - Type: `A`
   - Name: `@` (or your domain)
   - Value: Vercel IP address

2. **App Domain with Wildcard**:
   - Type: `CNAME`
   - Name: `*`
   - Value: `cname.vercel-dns.com`

3. **Base App Domain**:
   - Type: `CNAME`
   - Name: `@`
   - Value: `cname.vercel-dns.com`

## Step 5: GitHub Actions Setup (Optional)

For optimal CI/CD performance with Turborepo remote caching:

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Add these repository secrets:
   - `TURBO_TEAM` - Your Turbo team ID
   - `TURBO_TOKEN` - Your Turbo API token

🚀 **Benefits**: Remote caching across CI/CD runs, significantly speeding up builds and deployments.

## Step 6: Deploy

After completing the above setup, push to `main` to trigger automatic deployments to both Vercel projects.

## Post-Deployment Configuration

### 1. Verify Deployments

- Check that both projects are deployed successfully
- Verify domain configuration
- Test subdomain routing

### 2. Configure Supabase

- Update Site URL in Supabase Dashboard
- Add production redirect URLs
- Configure email templates for production

### 3. Set up Monitoring

- Configure error tracking (Sentry)
- Set up performance monitoring
- Configure uptime monitoring

## Environment-Specific Configuration

### Development

```bash
NEXT_PUBLIC_APP_DOMAIN=localhost:3003
NEXT_PUBLIC_MARKETING_DOMAIN=localhost:3002
```

### Staging

```bash
NEXT_PUBLIC_APP_DOMAIN=staging.yourdomain.com
NEXT_PUBLIC_MARKETING_DOMAIN=staging.yourdomain.com
```

### Production

```bash
NEXT_PUBLIC_APP_DOMAIN=yourdomain.com
NEXT_PUBLIC_MARKETING_DOMAIN=yourdomain.com
```

## Security Considerations

### Environment Variables

- Never expose `SUPABASE_SERVICE_ROLE_KEY` to client-side code
- Use Vercel's environment variable scoping
- Rotate keys regularly
- Monitor for exposed secrets

### Domain Security

- Configure proper CORS settings
- Set up security headers
- Enable HTTPS only
- Configure CSP policies

### Database Security

- Enable RLS on all tables
- Configure proper database permissions
- Set up database backups
- Monitor for suspicious activity

## Troubleshooting

### Common Issues

1. **Build Failures**: Check Node.js version and dependencies
2. **Domain Not Resolving**: Verify DNS configuration
3. **Environment Variables**: Check variable names and values
4. **Subdomain Routing**: Verify middleware configuration

### Debug Steps

1. Check Vercel deployment logs
2. Verify environment variables
3. Test domain configuration
4. Check Supabase connection

### Support Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

## Performance Optimization

### Build Optimization

- Use Turborepo remote caching
- Optimize bundle size
- Configure proper caching headers
- Use CDN for static assets

### Runtime Optimization

- Configure proper caching strategies
- Optimize database queries
- Use connection pooling
- Monitor performance metrics

## Monitoring and Alerting

### Key Metrics

- Deployment success rate
- Build time
- Runtime performance
- Error rates

### Alerting

- Set up error rate alerts
- Configure performance thresholds
- Monitor deployment status
- Track user experience metrics

## Backup and Recovery

### Database Backups

- Configure automated backups
- Test backup restoration
- Document recovery procedures
- Monitor backup health

### Code Backups

- Use Git for version control
- Configure branch protection
- Set up automated testing
- Document deployment procedures

## Scaling Considerations

### Horizontal Scaling

- Use Vercel's automatic scaling
- Configure load balancing
- Monitor resource usage
- Plan for traffic spikes

### Database Scaling

- Configure read replicas
- Optimize query performance
- Monitor database metrics
- Plan for data growth

## Next Steps

1. **Configure Monitoring**: Set up error tracking and performance monitoring
2. **Set up CI/CD**: Configure automated testing and deployment
3. **Optimize Performance**: Implement caching and optimization strategies
4. **Plan for Scaling**: Prepare for increased traffic and usage
