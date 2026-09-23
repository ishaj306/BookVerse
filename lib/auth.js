import { auth } from '@clerk/nextjs/server';
import { createClerkSupabaseClient, createServiceRoleClient } from './supabase';

/**
 * Standard auth helper for API routes.
 * Returns the authenticated user's Clerk ID, a Supabase client with their JWT,
 * and a service-role client for shared writes.
 *
 * Throws a structured error if the user is not authenticated.
 *
 * @returns {Promise<{userId: string, supabase: import('@supabase/supabase-js').SupabaseClient, serviceClient: import('@supabase/supabase-js').SupabaseClient}>}
 */
export async function getAuthenticatedClients() {
  const { userId, getToken } = await auth();

  if (!userId) {
    throw new AuthError('Unauthorized');
  }

  const supabaseAccessToken = await getToken({ template: 'supabase' });

  if (!supabaseAccessToken) {
    throw new AuthError('Could not retrieve Supabase token from Clerk');
  }

  const supabase = createClerkSupabaseClient(supabaseAccessToken);
  const serviceClient = createServiceRoleClient();

  return { userId, supabase, serviceClient };
}

/**
 * Custom error class for auth failures.
 * API routes can catch this and return a 401.
 */
export class AuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Standard error response builder for API routes.
 *
 * @param {Error} error - The error that occurred
 * @returns {Response} - A NextResponse with appropriate status code
 */
export function handleApiError(error) {
  if (error instanceof AuthError) {
    return Response.json({ error: error.message }, { status: 401 });
  }

  console.error('API Error:', error);
  return Response.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
