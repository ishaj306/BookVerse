import { auth } from '@clerk/nextjs/server';
import { createClerkSupabaseClient, createServiceRoleClient } from './supabase';
import { ApiError } from './http';

/**
 * Custom error class for auth failures (HTTP 401).
 */
export class AuthError extends ApiError {
  constructor(message) {
    super(401, message);
    this.name = 'AuthError';
  }
}

/**
 * Standard auth helper for API routes.
 * Returns the authenticated user's Clerk ID, a Supabase client with their JWT,
 * and a service-role client for shared writes.
 *
 * Token source: with Clerk's Supabase third-party auth integration the plain
 * session token is used. Set CLERK_SUPABASE_JWT_TEMPLATE only if you still use
 * the older JWT-template approach.
 *
 * @returns {Promise<{userId: string, supabase: import('@supabase/supabase-js').SupabaseClient, serviceClient: import('@supabase/supabase-js').SupabaseClient}>}
 */
export async function getAuthenticatedClients() {
  const { userId, getToken } = await auth();

  if (!userId) {
    throw new AuthError('Unauthorized');
  }

  const template = process.env.CLERK_SUPABASE_JWT_TEMPLATE;
  const supabaseAccessToken = await getToken(template ? { template } : undefined);

  if (!supabaseAccessToken) {
    throw new AuthError('Could not retrieve Supabase token from Clerk');
  }

  const supabase = createClerkSupabaseClient(supabaseAccessToken);
  const serviceClient = createServiceRoleClient();

  return { userId, supabase, serviceClient };
}

const knownUsers = new Set();

/**
 * Make sure a `users` row exists for this Clerk user. Every user-owned table
 * has a foreign key to users(id), so first writes would otherwise fail.
 * Cheap after the first call per server instance.
 */
export async function ensureUser(userId, supabase) {
  if (knownUsers.has(userId)) return;

  const { error } = await supabase
    .from('users')
    .upsert({ id: userId }, { onConflict: 'id', ignoreDuplicates: true });

  if (error) throw error;
  knownUsers.add(userId);
}

/**
 * Standard error response builder for API routes.
 * Maps known error types and Postgres codes to sensible status codes without
 * leaking internals.
 *
 * @param {Error} error - The error that occurred
 * @returns {Response}
 */
export function handleApiError(error) {
  if (error instanceof ApiError) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  switch (error?.code) {
    case 'PGRST301':
    case 'PGRST302':
    case 'PGRST303':
      console.error(
        'Supabase rejected the Clerk token. Add Clerk as a third-party auth provider in Supabase ' +
          '(Authentication > Sign In / Up > Third-Party Auth) and activate the Supabase integration in Clerk.'
      );
      return Response.json(
        { error: 'Your session was not accepted by the database. The Clerk and Supabase link needs setting up.' },
        { status: 401 }
      );
    case 'PGRST116':
      return Response.json({ error: 'Not found' }, { status: 404 });
    case '23505':
      return Response.json({ error: 'That already exists' }, { status: 409 });
    case '23503':
      return Response.json({ error: 'A referenced record does not exist' }, { status: 400 });
    case '23514':
    case '22P02':
    case '22007':
    case '22008':
      return Response.json({ error: 'One or more values are invalid' }, { status: 400 });
    default:
      break;
  }

  console.error('API Error:', error);
  return Response.json({ error: 'Internal server error' }, { status: 500 });
}
