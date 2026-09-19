import type { ReactNode } from 'react';
import { InstallBanner } from '@/components/InstallBanner';
import { SiteFooter, SiteHeader } from '@/components/SiteHeader';

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      {/* Everything the results image captures (DownloadResults): the page and footer, not the menus */}
      <div className="container page" data-capture-root>
        <main>{children}</main>
        <SiteFooter />
      </div>
      <InstallBanner />
    </>
  );
}
