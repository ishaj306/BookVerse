import { SignIn } from '@clerk/nextjs';
import AuthShell from '@/components/AuthShell';

export const metadata = { title: 'Sign in — BookVerse' };

export default function SignInPage() {
  return (
    <AuthShell heading={<>Welcome back to <em className="accent">your shelves.</em></>}>
      <SignIn appearance={{ elements: { rootBox: 'bv-clerk-root', cardBox: 'bv-clerk-card', card: 'bv-clerk-inner' } }} />
    </AuthShell>
  );
}
