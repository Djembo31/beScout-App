import createNextIntlPlugin from 'next-intl/plugin';
import createBundleAnalyzer from '@next/bundle-analyzer';
import { withSentryConfig } from '@sentry/nextjs';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
const withBundleAnalyzer = createBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@supabase/supabase-js',
      '@supabase/ssr',
      'posthog-js',
      '@tanstack/react-query',
      '@tanstack/react-query-persist-client',
      'next-intl',
      'zustand',
      'country-flag-icons',
      '@sentry/nextjs',
      '@radix-ui/react-dialog',
      '@radix-ui/react-alert-dialog',
    ],
    // Slice 125: Next.js 14 requires this flag for the instrumentation hook.
    // Removed in Next.js 15 (stable by default).
    instrumentationHook: true,
  },
  images: {
    // Slice 486 (W6 Phase 3): AVIF zuerst (~30% kleiner als WebP), WebP-Fallback. App-weit.
    formats: ['image/avif', 'image/webp'],
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
//
// Slice 125: `disableLogger` + `automaticVercelMonitors` migrated to their
// `webpack.*` equivalents per Sentry v10 deprecation warnings.
const sentryConfig = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  hideSourceMaps: true,
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
    automaticVercelMonitors: true,
  },
};

export default withSentryConfig(
  withBundleAnalyzer(withNextIntl(nextConfig)),
  sentryConfig,
);
