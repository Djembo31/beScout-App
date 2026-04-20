import createNextIntlPlugin from 'next-intl/plugin';
import createBundleAnalyzer from '@next/bundle-analyzer';
import { withSentryConfig } from '@sentry/nextjs';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
const withBundleAnalyzer = createBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['lucide-react', '@supabase/supabase-js', 'posthog-js', '@tanstack/react-query', 'next-intl', 'zustand', 'country-flag-icons', '@sentry/nextjs'],
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
      {
        protocol: 'https',
        hostname: 'media.api-sports.io',
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

// Slice 118: Sentry Release-Tracking via withSentryConfig.
// Erwartet SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT als Vercel env vars.
// Ohne Token: Release-Tracking silent deaktiviert (build bleibt stabil).
const sentryConfig = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true,
};

export default withSentryConfig(
  withBundleAnalyzer(withNextIntl(nextConfig)),
  sentryConfig,
);
