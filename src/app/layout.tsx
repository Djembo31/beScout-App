import type { Metadata } from 'next';
import { Providers } from '@/components/providers/Providers';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'BeScout - Fan-Engagement Plattform', template: '%s | BeScout' },
  description: 'Trade Digital Player Cards, Fantasy Events & Research in der TFF 1. Lig.',
  openGraph: { type: 'website', locale: 'de_DE', siteName: 'BeScout' },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-[#0a0a0a] text-white font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
