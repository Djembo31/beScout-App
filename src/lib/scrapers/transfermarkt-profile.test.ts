import { describe, it, expect } from 'vitest';
import { parseMarketValue, parseContractEnd } from './transfermarkt-profile';

// Regression-fixtures — real HTML snippets scraped from transfermarkt.de on 2026-04-20.
// Source: scripts/tm-parser-sanity.ts — saved to tmp/tm-sanity/.
// Markup changed in 2026-04: `data-header__box--marketvalue` → `data-header__market-value-wrapper`.

const NEW_MARKUP_80M = `<a href="/marktwertverlauf/spieler/503743" class="data-header__market-value-wrapper">80,00 <span class="waehrung">Mio. &#8364;</span> <p class="data-header__last-update">Letzte Änderung: 09.03.2026</p></a>`;

const NEW_MARKUP_8M = `<a href="/marktwertverlauf/spieler/290537" class="data-header__market-value-wrapper">8,00 <span class="waehrung">Mio. €</span> <p class="data-header__last-update">Letzte Änderung: 24.03.2026</p></a>`;

const NEW_MARKUP_250K = `<a href="/marktwertverlauf/spieler/999" class="data-header__market-value-wrapper">250,00 <span class="waehrung">Tsd. €</span></a>`;

const NEW_MARKUP_1POINT5M = `<a href="/marktwertverlauf/spieler/888" class="data-header__market-value-wrapper">1,50 <span class="waehrung">Mio. €</span></a>`;

const LEGACY_MARKUP = `<div class="data-header__box--marketvalue"><a href="/x">€ 12,50 Mio. ...</a></div>`;

const CONTRACT_HTML = `<span>Vertrag bis: <span class="data-header__content">30.06.2031</span></span>`;

describe('parseMarketValue (new markup, 2026-04+)', () => {
  it('parses 80 Mio. € from Morgan Rogers profile snippet', () => {
    expect(parseMarketValue(NEW_MARKUP_80M)).toBe(80_000_000);
  });

  it('parses 8,00 Mio. € from Jean Butez profile snippet', () => {
    expect(parseMarketValue(NEW_MARKUP_8M)).toBe(8_000_000);
  });

  it('parses 1,50 Mio. € with decimal comma', () => {
    expect(parseMarketValue(NEW_MARKUP_1POINT5M)).toBe(1_500_000);
  });

  it('parses Tsd. € suffix (thousands)', () => {
    expect(parseMarketValue(NEW_MARKUP_250K)).toBe(250_000);
  });

  it('returns null when no MV block present', () => {
    expect(parseMarketValue('<html><body>no mv here</body></html>')).toBeNull();
  });

  it('returns null on malformed wrapper', () => {
    expect(
      parseMarketValue(
        '<a class="data-header__market-value-wrapper">NaN <span class="waehrung">Mio. €</span></a>',
      ),
    ).toBeNull();
  });
});

describe('parseMarketValue (legacy markup fallback)', () => {
  it('parses legacy "€ X Mio." format when new markup absent', () => {
    expect(parseMarketValue(LEGACY_MARKUP)).toBe(12_500_000);
  });

  it('prefers new markup over legacy when both present', () => {
    const both = NEW_MARKUP_80M + LEGACY_MARKUP;
    expect(parseMarketValue(both)).toBe(80_000_000);
  });
});

describe('parseContractEnd', () => {
  it('parses Vertrag bis DD.MM.YYYY', () => {
    expect(parseContractEnd(CONTRACT_HTML)).toBe('2031-06-30');
  });

  it('returns null when no contract block', () => {
    expect(parseContractEnd('<html></html>')).toBeNull();
  });
});
