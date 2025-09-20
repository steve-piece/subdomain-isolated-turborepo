import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient as createBrowserClient } from '@supabase/supabase-js';
import { appDomain, marketingDomain } from '../lib/domains';

export function getCookieDomainForHost(hostname: string): string | undefined {
  if (hostname.endsWith('.localhost') || hostname === 'localhost') return undefined;

  const marketingRoot = marketingDomain.split(':')[0];
  const appRoot = appDomain.split(':')[0];

  if (hostname === marketingRoot || hostname.endsWith(`.${marketingRoot}`)) {
    return marketingRoot;
  }

  if (hostname === appRoot || hostname.endsWith(`.${appRoot}`)) {
    return appRoot;
  }

  return undefined;
}

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}


