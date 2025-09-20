import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient as createBrowserClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { cookies, headers } from 'next/headers';
import { appDomain, marketingDomain } from '@/lib/utils';

export function getCookieDomainForHost(hostname: string): string | undefined {
  if (hostname.endsWith('.localhost') || hostname === 'localhost') return undefined;

  const marketingRoot = marketingDomain.split(':')[0];
  const appRoot = appDomain.split(':')[0];

  if (hostname === marketingRoot || hostname.endsWith(`.${marketingRoot}`)) {
    return marketingRoot; // marketing cookies scoped to marketing domain
  }

  if (hostname === appRoot || hostname.endsWith(`.${appRoot}`)) {
    return appRoot; // share across app subdomains
  }

  return undefined;
}

export function createSupabaseServerClientFromRequest(request: NextRequest) {
  const url = new URL(request.url);
  const hostname = (request.headers.get('host') || '').split(':')[0];
  const cookieDomain = getCookieDomainForHost(hostname);

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set() {},
        remove() {}
      },
      cookieOptions: {
        domain: cookieDomain,
        secure: url.protocol === 'https:',
        sameSite: 'lax',
        path: '/',
        httpOnly: true
      }
    }
  );
}

export function createSupabaseServerClient() {
  const hdrs = headers();
  const schemeHeader = hdrs.get('x-forwarded-proto');
  const protocol = schemeHeader ? `${schemeHeader}:` : 'http:';
  const hostname = (hdrs.get('host') || '').split(':')[0];
  const cookieStore = cookies();
  const cookieDomain = getCookieDomainForHost(hostname);

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', expires: new Date(0), ...options });
        }
      },
      cookieOptions: {
        domain: cookieDomain,
        secure: protocol === 'https:',
        sameSite: 'lax',
        path: '/',
        httpOnly: true
      }
    }
  );
}

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}


