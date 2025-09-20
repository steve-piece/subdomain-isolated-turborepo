import { type NextRequest, NextResponse } from 'next/server';
import { marketingDomain, appDomain } from '@/lib/utils';

function extractSubdomain(request: NextRequest): string | null {
  const url = request.url;
  const host = request.headers.get('host') || '';
  const hostname = host.split(':')[0];

  // Local development environment
  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    // Try to extract subdomain from the full URL
    const fullUrlMatch = url.match(/http:\/\/([^.]+)\.localhost/);
    if (fullUrlMatch && fullUrlMatch[1]) {
      return fullUrlMatch[1];
    }

    // Fallback to host header approach
    if (hostname.includes('.localhost')) {
      return hostname.split('.')[0];
    }

    return null;
  }

  // Production environment
  const appRoot = appDomain.split(':')[0];
  const marketingRoot = marketingDomain.split(':')[0];

  // Handle preview deployment URLs (tenant---branch-name.vercel.app)
  if (hostname.includes('---') && hostname.endsWith('.vercel.app')) {
    const parts = hostname.split('---');
    return parts.length > 0 ? parts[0] : null;
  }

  // Regular subdomain detection — only treat subdomains under app domain as tenants
  const isSubdomain =
    hostname !== appRoot &&
    hostname !== `www.${appRoot}` &&
    hostname.endsWith(`.${appRoot}`);

  // Do not consider subdomains under marketing domain as tenants
  if (
    hostname !== marketingRoot &&
    hostname !== `www.${marketingRoot}` &&
    hostname.endsWith(`.${marketingRoot}`)
  ) {
    return null;
  }

  return isSubdomain ? hostname.replace(`.${appRoot}`, '') : null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const subdomain = extractSubdomain(request);
  const host = request.headers.get('host') || '';
  const hostname = host.split(':')[0];
  const appRoot = appDomain.split(':')[0];
  const marketingRoot = marketingDomain.split(':')[0];

  // If request is for the marketing domain, ensure admin is accessible and no tenant rewrite
  if (hostname === marketingRoot || hostname === `www.${marketingRoot}`) {
    // Marketing domain: never rewrite to tenant pages
    return NextResponse.next();
  }

  if (subdomain) {
    // Block access to admin page from subdomains
    if (pathname.startsWith('/admin')) {
      // Send them to marketing admin
      const protocol = request.nextUrl.protocol; // includes ':'
      return NextResponse.redirect(new URL('/admin', `${protocol}//${marketingRoot}`));
    }

    // Rewrite all tenant subdomain paths to /s/[subdomain]/...
    const targetPath = pathname === '/' ? `/s/${subdomain}` : `/s/${subdomain}${pathname}`;
    return NextResponse.rewrite(new URL(targetPath, request.url));
  }

  // On the app root or anywhere else, allow normal access
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. all root files inside /public (e.g. /favicon.ico)
     */
    '/((?!api|_next|[\\w-]+\\.\\w+).*)'
  ]
};
