import { describe, it, expect } from 'vitest';
import {
  parseMarketValue,
  parseContractEnd,
  parseNationality,
  parseCurrentClubTmId,
} from './transfermarkt-profile';

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

describe('parseMarketValue (TM no-value dash, Slice 098b)', () => {
  it('returns 0 when TM zeigt "Marktwert: -" im meta-description', () => {
    const html = '<meta content="Akan ➤ Marktwert: - ➤ * 14.07.1994 in Ankara, Türkei" /><body>no wrapper</body>';
    expect(parseMarketValue(html)).toBe(0);
  });

  it('does NOT return 0 when Marktwert-wrapper mit echtem Wert existiert', () => {
    const html = `<meta content="Foo ➤ Marktwert: - ➤ ..." /><a class="data-header__market-value-wrapper">80,00 <span class="waehrung">Mio. €</span></a>`;
    expect(parseMarketValue(html)).toBe(80_000_000);
  });

  it('returns null wenn weder dash noch wrapper', () => {
    expect(parseMarketValue('<html><body>no mv</body></html>')).toBeNull();
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

// Fixtures aus live-TM HTML (Osimhen profile), geladen 2026-04-20 via curl
const NATIONALITY_ITEMPROP_HTML = `<li class="data-header__label">Staatsbürgerschaft:
  <span itemprop="nationality" class="data-header__content">
    <img src="https://tmssl.akamaized.net/images/flagge/tiny/124.png" title="Nigeria" alt="Nigeria" class="flaggenrahmen" />
    Nigeria
  </span>
</li>`;

const NATIONALITY_INFOTABLE_HTML = `<span class="info-table__content info-table__content--regular">Staatsbürgerschaft:</span>
<span class="info-table__content info-table__content--bold">
  <img src="/flag.png" title="Germany" alt="Germany" class="flaggenrahmen" />&nbsp;&nbsp;Germany
</span>`;

const NATIONALITY_ENTITY_HTML = `<span class="info-table__content info-table__content--regular">Staatsb&uuml;rgerschaft:</span>
<span class="info-table__content info-table__content--bold">
  <img src="/flag.png" title="Senegal" alt="Senegal" class="flaggenrahmen" />Senegal
</span>`;

const NATIONALITY_DUAL_HTML = `<span itemprop="nationality" class="data-header__content">
  <img title="Nigeria" alt="Nigeria" class="flaggenrahmen" />
  <img title="Senegal" alt="Senegal" class="flaggenrahmen" />
  Nigeria Senegal
</span>`;

const NATIONALITY_DIACRITIC_HTML = `<li class="data-header__label">Staatsbürgerschaft:
  <span itemprop="nationality" class="data-header__content">
    <img title="Côte d'Ivoire" class="flaggenrahmen" />
    Côte d'Ivoire
  </span>
</li>`;

describe('parseNationality', () => {
  it('parses primary itemprop="nationality" block (Nigeria)', () => {
    expect(parseNationality(NATIONALITY_ITEMPROP_HTML)).toBe('Nigeria');
  });

  it('falls back to info-table Staatsbürgerschaft label (Germany)', () => {
    expect(parseNationality(NATIONALITY_INFOTABLE_HTML)).toBe('Germany');
  });

  it('handles HTML-entity encoded umlaut (&uuml;)', () => {
    expect(parseNationality(NATIONALITY_ENTITY_HTML)).toBe('Senegal');
  });

  it('returns first flag for dual citizenship (Nigeria, not Senegal)', () => {
    expect(parseNationality(NATIONALITY_DUAL_HTML)).toBe('Nigeria');
  });

  it('preserves diacritics ("Côte d\'Ivoire")', () => {
    expect(parseNationality(NATIONALITY_DIACRITIC_HTML)).toBe("Côte d'Ivoire");
  });

  it('returns null when no Staatsbürgerschaft block exists', () => {
    expect(parseNationality('<html><body>no nationality</body></html>')).toBeNull();
  });

  it('returns null for empty HTML', () => {
    expect(parseNationality('')).toBeNull();
  });

  it('prefers itemprop over info-table when both present', () => {
    const both = NATIONALITY_ITEMPROP_HTML + NATIONALITY_INFOTABLE_HTML;
    expect(parseNationality(both)).toBe('Nigeria');
  });
});

// Fixtures für parseCurrentClubTmId (Slice 141 — TM-Club-ID-Discovery)
const CLUB_HEADER_GS = `<div class="data-header__info-box">
  <span class="data-header__club">
    <a href="/galatasaray/startseite/verein/141" title="Galatasaray">
      <img src="https://tmssl.akamaized.net/images/wappen/head/141.png" class="dataBild" />
    </a>
  </span>
</div>`;

const CLUB_HEADER_NO_TITLE = `<div class="data-header">
  <a href="/sakaryaspor/startseite/verein/27552">
    <img src="/logo.png" />
  </a>
</div>`;

const CLUB_HEADER_VEREINSLOS = `<div class="data-header">
  <span class="data-header__club-info">Vereinslos seit 30.06.2026</span>
</div>
<p>Weitere Vereine:</p>
<a href="/old-club/startseite/verein/99999">Old Club</a>`;

const CLUB_HEADER_EMPTY = `<html><body><p>no header block</p></body></html>`;

const CLUB_HEADER_LEIH = `<div class="data-header__info-box">
  <span class="data-header__club">
    <a href="/werder-bremen/startseite/verein/86" title="Werder Bremen">
      <img src="/86.png" />
    </a>
  </span>
  <span class="data-header__parent-club">Stammverein:
    <a href="/fc-bayern-muenchen/startseite/verein/27" title="FC Bayern München">Bayern</a>
  </span>
</div>`;

describe('parseCurrentClubTmId', () => {
  it('parses header link with title attribute (Galatasaray)', () => {
    const result = parseCurrentClubTmId(CLUB_HEADER_GS);
    expect(result).toEqual({
      tmClubId: 141,
      clubName: 'Galatasaray',
      slug: 'galatasaray',
    });
  });

  it('falls back to slug-derived name when title is missing', () => {
    const result = parseCurrentClubTmId(CLUB_HEADER_NO_TITLE);
    expect(result).toEqual({
      tmClubId: 27552,
      clubName: 'Sakaryaspor',
      slug: 'sakaryaspor',
    });
  });

  it('ignores "Weitere Vereine" links beyond 10k char window (returns null for header-less vereinslos)', () => {
    // Vereinsloser Spieler: kein /startseite/verein/ im Header, nur im Weitere-Vereine-Bereich.
    // Weil unser 10k-Fenster den Header inkludiert aber hier keinen aktuellen Club enthält,
    // darf dieser Fall in unserem kurzen Fixture auch kein Match liefern — wir simulieren, dass
    // der Old-Club-Link im Fixture-Text NACH dem fiktiven 10k-Schnitt liegt.
    const paddedHtml = CLUB_HEADER_VEREINSLOS.replace(
      'Weitere Vereine:',
      ' '.repeat(10_500) + 'Weitere Vereine:',
    );
    expect(parseCurrentClubTmId(paddedHtml)).toBeNull();
  });

  it('returns null when HTML has no /startseite/verein/ link at all', () => {
    expect(parseCurrentClubTmId(CLUB_HEADER_EMPTY)).toBeNull();
  });

  it('returns first club link (current, not Stammverein) for loan players', () => {
    const result = parseCurrentClubTmId(CLUB_HEADER_LEIH);
    expect(result).toEqual({
      tmClubId: 86,
      clubName: 'Werder Bremen',
      slug: 'werder-bremen',
    });
  });

  it('returns null for empty html', () => {
    expect(parseCurrentClubTmId('')).toBeNull();
  });
});
