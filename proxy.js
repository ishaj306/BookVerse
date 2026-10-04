import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',              // Landing page
  '/sign-in(.*)',   // Sign in
  '/sign-up(.*)',   // Sign up
  '/api/health',    // Health check
  '/mock(.*)',      // Development review mode (404s in production)
]);

export default clerkMiddleware(async (auth, request) => {
  // Development only: review mode (see /mock) lets the signed-in screens render
  // with sample data. Never active in a production build, and API routes still
  // check the user themselves.
  if (process.env.NODE_ENV !== 'production' && request.cookies.get('bv_mock')?.value === '1') {
    return;
  }

  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
