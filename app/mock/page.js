import { notFound } from 'next/navigation';
import MockEnter from './MockEnter';

export const metadata = { title: 'Review mode', robots: { index: false, follow: false } };

/** Development only. In a production build this route does not exist. */
export default function MockPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <MockEnter />;
}
