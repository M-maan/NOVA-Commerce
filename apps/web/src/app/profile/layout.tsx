import { ReactNode } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { SessionExpiredModal } from '@/components/auth/session-expired-modal';
import { AccountNavigation } from '@/components/profile/account-navigation';

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <SessionExpiredModal />
      <main className="account-shell">
        <header className="account-hero">
          <p className="overline"><span />NOVA ACCOUNT</p>
          <h1>Your world,<br /><em>in one place.</em></h1>
          <p>Orders, saved pieces and personal details—kept simple.</p>
        </header>
        <div className="account-layout">
          <AccountNavigation />
          <section className="account-content">{children}</section>
        </div>
      </main>
    </ProtectedRoute>
  );
}
