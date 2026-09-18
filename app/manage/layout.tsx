import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './manage.css';

export const metadata: Metadata = {
  title: 'Manage',
  robots: { index: false, follow: false },
};

export default function ManageLayout({ children }: { children: ReactNode }) {
  return <div className="manage">{children}</div>;
}
