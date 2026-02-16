'use client';

import { AuthProvider } from './AuthProvider';
import { ClubProvider } from './ClubProvider';
import { WalletProvider } from './WalletProvider';
import { ToastProvider } from './ToastProvider';
import AnalyticsProvider from './AnalyticsProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AnalyticsProvider>
        <ClubProvider>
          <WalletProvider>
            <ToastProvider>{children}</ToastProvider>
          </WalletProvider>
        </ClubProvider>
      </AnalyticsProvider>
    </AuthProvider>
  );
}
