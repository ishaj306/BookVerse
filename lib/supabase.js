import { createClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client authenticated with the user's Clerk JWT.
 * Use this in API routes for user-scoped queries (RLS enforced).
 *
 * @param {string} supabaseAccessToken - The Clerk session token (JWT)
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function createClerkSupabaseClient(supabaseAccessToken) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${supabaseAccessToken}`,
        },
      },
    }
  );
}

/**
 * Creates a Supabase client with the service role key.
 * Use this ONLY for operations that bypass RLS — e.g. writing to book_cache.
 * NEVER expose this client to the browser.
 *
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function createServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
