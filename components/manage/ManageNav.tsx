'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/manage', label: 'Days', active: (path: string) => path === '/manage' || path.startsWith('/manage/days') },
  { href: '/manage/players', label: 'Players', active: (path: string) => path.startsWith('/manage/players') },
];

export function ManageNav() {
  const pathname = usePathname();

  return (
    <nav className="nav__links" aria-label="Manage">
      {LINKS.map((link) => {
        const active = link.active(pathname);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`nav__link${active ? ' is-active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            {link.label}
          </Link>
        );
      })}
      <Link className="nav__link nav__link--site" href="/">
        View site
      </Link>
    </nav>
  );
}
