import { describe, expect, it, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

const dbMocks = vi.hoisted(() => {
  const maybeSingleMock = vi.fn();
  const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
  const selectMock = vi.fn(() => ({ eq: eqMock }));
  const fromMock = vi.fn(() => ({ select: selectMock }));
  return { maybeSingleMock, eqMock, selectMock, fromMock };
});

vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: dbMocks.fromMock,
  },
}));

// Echo key + interpolate {name}: verifies the page DERIVES copy from the i18n
// key (not a hardcoded literal) without coupling the test to the German wording
// itself — the real locale strings are asserted separately against the files.
vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () => (key: string, params?: Record<string, unknown>) =>
    params && 'name' in params ? `${key}::${String(params.name)}` : key),
}));

vi.mock('../ClubContent', () => ({
  default: () => null,
}));

import { generateMetadata } from '../page';

describe('club/[slug] metadata (Slice 294 — F-1 compliance copy)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.maybeSingleMock.mockResolvedValue({
      data: {
        name: 'Sakaryaspor',
        logo_url: 'https://example.com/logo.png',
        league: 'TFF 1. Lig',
        city: 'Sakarya',
      },
      error: null,
    });
  });

  it('derives public description from i18n meta.clubDescription with {name} (no hardcoded trading)', async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ slug: 'sakaryaspor' }) });

    // i18n-driven: description comes from the clubDescription key interpolated with the name.
    expect(metadata.description).toBe('clubDescription::Sakaryaspor');
    expect(metadata.description).not.toMatch(/trading/i);
    // og + twitter mirror the same description (no drift).
    expect(metadata.openGraph?.description).toBe(metadata.description);
    expect(metadata.twitter?.description).toBe(metadata.description);
  });

  it('falls back to club title when club not found', async () => {
    dbMocks.maybeSingleMock.mockResolvedValue({ data: null, error: null });
    const metadata = await generateMetadata({ params: Promise.resolve({ slug: 'unknown-club' }) });
    expect(metadata.title).toBe('club');
  });
});

describe('meta.clubDescription locale strings are compliance-safe', () => {
  const load = (locale: string) =>
    JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../../../../../../messages', `${locale}.json`), 'utf-8'),
    );

  for (const locale of ['de', 'tr'] as const) {
    it(`${locale}: exists, has {name}, mentions BeScout, no trading positioning`, () => {
      const value = load(locale).meta?.clubDescription as string | undefined;
      expect(value, `${locale}.meta.clubDescription missing`).toBeTruthy();
      expect(value).toContain('{name}');
      expect(value).toMatch(/BeScout/);
      expect(value).not.toMatch(/trading/i);
    });
  }
});
