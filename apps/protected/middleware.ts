import { type NextRequest, NextResponse } from 'next/server';

function extractSubdomain(request: NextRequest): string | null {
  const url = request.url;
  const host = request.headers.get('host') || '';
  const hostname = host.split(':')[0];

  // Local development environment
  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    const fullUrlMatch = url.match(/http:\/\/([^.]+)\.localhost/);
    if (fullUrlMatch && fullUrlMatch[1]) {
      return fullUrlMatch[1];
    }
    if (hostname.includes('.localhost')) {
      return hostname.split('.')[0];
    }
    return null;
  }

  // Production: trust DNS and host; this app sits on app domain with wildcard
  const parts = hostname.split('.');
  if (parts.length > 2) {
    return parts[0];
  }
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const subdomain = extractSubdomain(request);

  if (subdomain) {
    // If already under /s, pass through
    if (pathname === '/s' || pathname.startsWith('/s/')) {
      return NextResponse.next();
    }

    // Redirect root to show visible /s
    if (pathname === '/') {
      const url = new URL(`/s`, request.url);
      return NextResponse.redirect(url);
    }

    // Rewrite other paths under /s
    const targetPath = `/s${pathname}`;
    return NextResponse.rewrite(new URL(targetPath, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next|[\\w-]+\\.\\w+).*)']
};


