import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { Outfit, Space_Mono } from 'next/font/google';
import { Providers } from '@/components/providers/Providers';
import { ClientOverlays } from '@/components/providers/ClientOverlays';
import { getServerUser } from '@/lib/supabaseServerAuth';
import { cn } from '@/lib/utils';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  display: 'swap',
  variable: '--font-outfit',
});

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-space-mono',
});

export const metadata: Metadata = {
  title: { default: 'BeScout - Fan-Engagement Plattform', template: '%s | BeScout' },
  description: 'Trade Scout Cards, Fantasy Events & Research in Europas Top-Ligen.',
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Slice 472: read the validated session server-side so authed pages render
  // content in the SSR HTML instead of the authLoading skeleton (the real LCP
  // win). getServerUser() returns null when logged out → unchanged behavior.
  // The three are independent → parallelize so getUser()'s auth roundtrip does
  // not add serially to TTFB (review 472-F2).
  const [locale, messages, initialUser] = await Promise.all([
    getLocale(),
    getMessages(),
    getServerUser(),
  ]);

  return (
    <html lang={locale} className={cn(outfit.variable, spaceMono.variable)}>
      <body className="min-h-dvh bg-bg-main text-white font-sans antialiased">
        <NextIntlClientProvider messages={messages}>
          <Providers initialUser={initialUser}>
            {children}
            <ClientOverlays />
          </Providers>
        </NextIntlClientProvider>
        <Script id="sw-register" strategy="afterInteractive">{`
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(function(err) { console.error('[SW] Registration failed:', err); });
          }
        `}</Script>
      </body>
    </html>
  );
}
