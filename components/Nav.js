'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useApi } from '@/lib/client-api';
import Avatar from './Avatar';
import { Bow } from './ornaments';

const LINKS = [
  { href: '/dashboard', label: 'Home', short: 'Home', icon: 'M4 11l8-7 8 7v9H4z' },
  { href: '/library', label: 'Library', short: 'Library', icon: 'M5 4h4v16H5zM11 4h4v16h-4zM17 6l3 .8-3.6 13.2-3-.8z' },
  { href: '/discover', label: 'Discover', short: 'Discover', icon: 'M20 20l-4-4M11 5a6 6 0 100 12 6 6 0 000-12z' },
  { href: '/constellation', label: 'Constellation', short: 'Stars', icon: 'M8 7l7-1M7 9l4 6M16 8l-3 7M6 5a2 2 0 100 4 2 2 0 000-4zM17 4a2 2 0 100 4 2 2 0 000-4zM12 14.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z' },
  { href: '/insights', label: 'Insights', short: 'Insights', icon: 'M5 20V11M12 20V5M19 20v-7' },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const { data } = useApi('/api/user');
  const user = data?.data;

  const isOn = (href) => pathname === href || (href === '/library' && pathname.startsWith('/book'));

  function search(event) {
    event.preventDefault();
    const q = query.trim();
    if (q) router.push(`/discover?q=${encodeURIComponent(q)}`);
  }

  return (
    <>
      <header className="nav">
        <Link className="logo" href="/dashboard">
          <Bow width={40} />
          BookVerse
        </Link>
        <nav className="navlinks" aria-label="Main">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={isOn(l.href) ? 'on' : ''} aria-current={isOn(l.href) ? 'page' : undefined}>
              {l.label}
            </Link>
          ))}
        </nav>
        <form className="search" onSubmit={search} role="search">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6E4E58" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4-4" />
          </svg>
          <input aria-label="Search for a book" placeholder="Search books, authors" value={query} onChange={(e) => setQuery(e.target.value)} />
        </form>
        <Link className="btn btn-primary btn-sm nav-cta" href="/journal/new">Inscribe</Link>
        <Link href="/profile" aria-label="Your profile"><Avatar user={user} /></Link>
      </header>

      <nav className="mtabs" aria-label="Main">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={isOn(l.href) ? 'on' : ''} aria-current={isOn(l.href) ? 'page' : undefined}>
            <span className="ic">
              <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d={l.icon} />
              </svg>
            </span>
            {l.short}
          </Link>
        ))}
      </nav>
    </>
  );
}
