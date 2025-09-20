import { NextResponse } from 'next/server';
import { appDomain, protocol } from '@/lib/utils';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const account = (searchParams.get('account') || '').toLowerCase().replace(/[^a-z0-9-]/g, '');

  if (!account) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const target = `${protocol}://${account}.${appDomain}/login`;
  return NextResponse.redirect(target);
}


