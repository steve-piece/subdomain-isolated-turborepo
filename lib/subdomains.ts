import { createSupabaseServerClient } from '@/lib/supabase';

export function isValidIcon(str: string) {
  if (str.length > 10) {
    return false;
  }

  try {
    // Primary validation: Check if the string contains at least one emoji character
    // This regex pattern matches most emoji Unicode ranges
    const emojiPattern = /[\p{Emoji}]/u;
    if (emojiPattern.test(str)) {
      return true;
    }
  } catch (error) {
    // If the regex fails (e.g., in environments that don't support Unicode property escapes),
    // fall back to a simpler validation
    console.warn(
      'Emoji regex validation failed, using fallback validation',
      error
    );
  }

  // Fallback validation: Check if the string is within a reasonable length
  // This is less secure but better than no validation
  return str.length >= 1 && str.length <= 10;
}

type SubdomainData = {
  emoji: string;
  createdAt: number;
};

export async function getSubdomainData(subdomain: string) {
  const sanitizedSubdomain = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('tenants')
    .select('emoji, created_at')
    .eq('subdomain', sanitizedSubdomain)
    .maybeSingle();

  if (error || !data) return null;

  return {
    emoji: data.emoji as string,
    createdAt: new Date(data.created_at as string).getTime()
  } satisfies SubdomainData;
}

export async function getAllSubdomains() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('tenants')
    .select('subdomain, emoji, created_at')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map((row) => ({
    subdomain: row.subdomain as string,
    emoji: (row.emoji as string) || '❓',
    createdAt: new Date(row.created_at as string).getTime()
  }));
}
