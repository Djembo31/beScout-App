'use client';

import { AuthProvider } from './AuthProvider';
import { WalletProvider } from './WalletProvider';
import { ToastProvider } from './ToastProvider';
import AnalyticsProvider from './AnalyticsProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AnalyticsProvider>
        <WalletProvider>
          <ToastProvider>{children}</ToastProvider>
        </WalletProvider>
      </AnalyticsProvider>
    </AuthProvider>
  );
}
