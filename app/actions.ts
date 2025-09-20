'use server';

import { isValidIcon } from '@/lib/subdomains';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { appDomain, protocol } from '@/lib/utils';
import { createSupabaseServerClient } from '@/lib/supabase';

export async function createSubdomainAction(
  prevState: any,
  formData: FormData
) {
  const subdomain = formData.get('subdomain') as string;
  const icon = formData.get('icon') as string;

  if (!subdomain || !icon) {
    return { success: false, error: 'Subdomain and icon are required' };
  }

  if (!isValidIcon(icon)) {
    return {
      subdomain,
      icon,
      success: false,
      error: 'Please enter a valid emoji (maximum 10 characters)'
    };
  }

  const sanitizedSubdomain = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');

  if (sanitizedSubdomain !== subdomain) {
    return {
      subdomain,
      icon,
      success: false,
      error:
        'Subdomain can only have lowercase letters, numbers, and hyphens. Please try again.'
    };
  }

  const supabase = createSupabaseServerClient();
  const { data: exists } = await supabase
    .from('tenants')
    .select('id')
    .eq('subdomain', sanitizedSubdomain)
    .maybeSingle();
  if (exists) {
    return {
      subdomain,
      icon,
      success: false,
      error: 'This subdomain is already taken'
    };
  }

  const { error } = await supabase
    .from('tenants')
    .insert({ subdomain: sanitizedSubdomain, emoji: icon });
  if (error) {
    return {
      subdomain,
      icon,
      success: false,
      error: 'Unable to create subdomain'
    };
  }

  redirect(`${protocol}://${sanitizedSubdomain}.${appDomain}`);
}

export async function deleteSubdomainAction(
  prevState: any,
  formData: FormData
) {
  const subdomain = formData.get('subdomain');
  const supabase = createSupabaseServerClient();
  await supabase.from('tenants').delete().eq('subdomain', subdomain);
  revalidatePath('/admin');
  return { success: 'Domain deleted successfully' };
}
