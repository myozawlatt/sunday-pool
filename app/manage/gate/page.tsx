import type { Metadata } from 'next';
import { ConnectSupabase } from '@/components/manage/ConnectSupabase';
import { GateForm } from '@/components/manage/GateForm';
import { isSupabaseConfigured } from '@/lib/env';

export const metadata: Metadata = { title: 'Sign in' };

export default function GatePage() {
  return (
    <main className="gate">
      <div className="panel gate__card">
        <div className="gate__brand">
          <span className="brand">
            <img className="brand__logo" src="/logo.png" width={40} height={40} alt="" />
            <span>
              Sunday <em>Pool</em>
            </span>
          </span>
        </div>
        {isSupabaseConfigured ? <GateForm /> : <ConnectSupabase />}
      </div>
    </main>
  );
}
