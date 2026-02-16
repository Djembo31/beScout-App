import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Providers } from '@/components/providers/Providers';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'BeScout - Fan-Engagement Plattform', template: '%s | BeScout' },
  description: 'Trade Digital Player Cards, Fantasy Events & Research in der TFF 1. Lig.',
  openGraph: { type: 'website', locale: 'de_DE', siteName: 'BeScout' },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icons/icon-192x192.png',
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'BeScout',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0a0a0a',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-[#0a0a0a] text-white font-sans antialiased">
        <Providers>
          {children}
          <InstallPrompt />
        </Providers>
        <Script id="sw-register" strategy="afterInteractive">{`
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(function(err) { console.error('[SW] Registration failed:', err); });
          }
        `}</Script>
      </body>
    </html>
  );
}
