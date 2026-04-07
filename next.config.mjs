import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['lucide-react', '@supabase/supabase-js', 'posthog-js', '@tanstack/react-query', 'next-intl', 'zustand'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.in',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
      {
        protocol: 'https',
        hostname: 'img.a.transfermarkt.technology',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // Wave 2 migration: legacy /market?tab=portfolio → /manager?tab=kader
      {
        source: '/market',
        has: [{ type: 'query', key: 'tab', value: 'portfolio' }],
        destination: '/manager?tab=kader',
        permanent: true,
      },
      {
        source: '/market',
        has: [{ type: 'query', key: 'sub', value: 'bestand' }],
        destination: '/manager?tab=kader',
        permanent: true,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
