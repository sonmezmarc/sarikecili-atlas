import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * Verify that the current request is from an authenticated user.
 * Returns null if auth is OK, or a 401 NextResponse if not.
 *
 * Usage in API route handlers:
 *   const authError = await requireAuth();
 *   if (authError) return authError;
 */
export async function requireAuth(): Promise<NextResponse | null> {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized — authentication required' },
      { status: 401 },
    );
  }

  return null;
}
