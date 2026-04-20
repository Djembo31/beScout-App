import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CountryFlag from '../CountryFlag';

vi.mock('@/lib/utils', () => ({
  cn: (...c: (string | boolean | undefined | null)[]) => c.filter(Boolean).join(' '),
}));

// Slice 120: CountryFlag now renders <img src="/flags/3x2/{code}.svg"> directly
// — no more react-component namespace-import. Only `hasFlag` from the main
// package is imported (a ~1 kB countries.json lookup).
vi.mock('country-flag-icons', () => ({
  // `hasFlag` accepts the hyphenated form for subdivisions
  hasFlag: (code: string) => ['DE', 'TR', 'NG', 'GB-ENG', 'GB-SCT'].includes(code),
}));

function getFlagImg() {
  return document.querySelector('img') as HTMLImageElement | null;
}

describe('CountryFlag', () => {
  it('renders <img> for known country', () => {
    render(<CountryFlag code="DE" />);
    const img = getFlagImg();
    expect(img).not.toBeNull();
    expect(img!.getAttribute('src')).toBe('/flags/3x2/DE.svg');
    expect(img!.getAttribute('alt')).toBe('DE');
  });

  it('renders <img> for TR', () => {
    render(<CountryFlag code="TR" />);
    expect(getFlagImg()?.getAttribute('src')).toBe('/flags/3x2/TR.svg');
  });

  it('renders text fallback for unknown country', () => {
    render(<CountryFlag code="XX" />);
    expect(screen.getByText('XX')).toBeInTheDocument();
    expect(getFlagImg()).toBeNull();
  });

  it('handles lowercase input', () => {
    render(<CountryFlag code="de" />);
    expect(getFlagImg()?.getAttribute('src')).toBe('/flags/3x2/DE.svg');
  });

  it('renders text fallback for empty code', () => {
    const { container } = render(<CountryFlag code="" />);
    expect(container.querySelector('span')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });

  it('applies custom size to <img> width/height', () => {
    render(<CountryFlag code="DE" size={24} />);
    const img = getFlagImg()!;
    expect(img.style.height).toBe('24px');
    expect(img.style.width).toBe('36px'); // 24 * 1.5
    expect(img.getAttribute('width')).toBe('36');
    expect(img.getAttribute('height')).toBe('24');
  });

  it('renders NG flag for Nigerian players (Osimhen regression)', () => {
    render(<CountryFlag code="NG" />);
    expect(getFlagImg()?.getAttribute('src')).toBe('/flags/3x2/NG.svg');
  });

  it('renders GB-ENG subdivision flag with hyphenated filename', () => {
    render(<CountryFlag code="GB-ENG" />);
    // Filename keeps the hyphen (mirrors package's raw SVGs). React-export
    // underscore mapping is no longer needed — Slice 120 renders via <img>.
    expect(getFlagImg()?.getAttribute('src')).toBe('/flags/3x2/GB-ENG.svg');
  });

  it('renders GB-SCT subdivision flag', () => {
    render(<CountryFlag code="GB-SCT" />);
    expect(getFlagImg()?.getAttribute('src')).toBe('/flags/3x2/GB-SCT.svg');
  });

  it('uses loading=lazy + decoding=async for perf', () => {
    render(<CountryFlag code="DE" />);
    const img = getFlagImg()!;
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.getAttribute('decoding')).toBe('async');
  });
});
