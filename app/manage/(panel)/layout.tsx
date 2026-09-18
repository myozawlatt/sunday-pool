import Link from 'next/link';
import type { ReactNode } from 'react';
import { ManageNav } from '@/components/manage/ManageNav';
import { requireAdmin } from '@/lib/auth';
import { signOut } from '../actions';

export default async function PanelLayout({ children }: { children: ReactNode }) {
  await requireAdmin();

  return (
    <>
      <header className="manage-bar">
        <div className="container nav">
          <Link className="brand" href="/manage">
            <img className="brand__logo" src="/logo.png" width={40} height={40} alt="" />
            <span>
              Sunday <em>Pool</em>
            </span>
            <span className="manage-tag">Manage</span>
          </Link>
          <div className="manage-bar__right">
            <ManageNav />
            <form action={signOut}>
              <button className="btn btn--small btn--ghost" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="container manage-main">{children}</main>
    </>
  );
}
