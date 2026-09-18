import type { ReactNode } from 'react';
import { SiteFooter, SiteHeader } from '@/components/SiteHeader';

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="container">{children}</main>
      <SiteFooter />
    </>
  );
}
