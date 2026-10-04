import { SignUp } from '@clerk/nextjs';
import AuthShell from '@/components/AuthShell';

export const metadata = { title: 'Begin your manuscript — BookVerse' };

export default function SignUpPage() {
  return (
    <AuthShell heading={<>Begin your <em className="accent">manuscript.</em></>}>
      <SignUp appearance={{ elements: { rootBox: 'bv-clerk-root', cardBox: 'bv-clerk-card', card: 'bv-clerk-inner' } }} />
    </AuthShell>
  );
}
