'use client';

import { QueryProvider } from './QueryProvider';
import { AuthProvider, useUser } from './AuthProvider';
import { ClubProvider } from './ClubProvider';
import { WalletProvider } from './WalletProvider';
import { ToastProvider } from './ToastProvider';
import AnalyticsProvider from './AnalyticsProvider';

/**
 * Gate Club + Wallet providers behind auth.
 * These providers fetch user-specific data (followed clubs, wallet balance)
 * that is unnecessary for logged-out users. Skipping them avoids
 * Supabase queries on public/auth pages (login, onboarding, pitch, etc.).
 */
function AuthGatedProviders({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();

  // Don't mount data providers until we know user is logged in
  if (loading || !user) {
    return <ToastProvider>{children}</ToastProvider>;
  }

  return (
    <ClubProvider>
      <WalletProvider>
        <ToastProvider>{children}</ToastProvider>
      </WalletProvider>
    </ClubProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <AnalyticsProvider>
          <AuthGatedProviders>{children}</AuthGatedProviders>
        </AnalyticsProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
