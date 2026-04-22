'use client';

import { QueryProvider } from './QueryProvider';
import { AuthProvider, useUser } from './AuthProvider';
import { ClubProvider } from './ClubProvider';
import { ToastProvider } from './ToastProvider';

/**
 * Gate ClubProvider behind auth.
 * Fetches user-specific data (activeClub / followed clubs via useFollowedClubs)
 * that is unnecessary for logged-out users. Skipping avoids Supabase queries
 * on public/auth pages (login, onboarding, pitch).
 *
 * Slice 152d: WalletProvider entfernt. Wallet-Balance wird jetzt vom
 * `useWallet` Query-Hook (`@/lib/hooks/useWallet`) geliefert — Consumer
 * importieren direkt, kein Provider-Wrapping nötig. React Query's
 * `enabled: !!userId`-Guard verhindert Fetches fuer logged-out User,
 * was frueher via AuthGated-Mount erreicht wurde.
 */
function AuthGatedProviders({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();

  // Don't mount data providers until we know user is logged in
  if (loading || !user) {
    return <ToastProvider>{children}</ToastProvider>;
  }

  return (
    <ClubProvider>
      <ToastProvider>{children}</ToastProvider>
    </ClubProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <AuthGatedProviders>{children}</AuthGatedProviders>
      </AuthProvider>
    </QueryProvider>
  );
}
