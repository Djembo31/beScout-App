import { describe, it, expect } from 'vitest';
import { mapNationalityToIso } from '../countryNameToIso';

describe('mapNationalityToIso', () => {
  describe('empty / nullish inputs', () => {
    it('returns empty string for null', () => {
      expect(mapNationalityToIso(null)).toBe('');
    });
    it('returns empty string for undefined', () => {
      expect(mapNationalityToIso(undefined)).toBe('');
    });
    it('returns empty string for empty string', () => {
      expect(mapNationalityToIso('')).toBe('');
    });
    it('returns empty string for whitespace-only', () => {
      expect(mapNationalityToIso('   ')).toBe('');
    });
    it('returns empty string for unknown country', () => {
      expect(mapNationalityToIso('Narnia')).toBe('');
    });
  });

  describe('ISO pass-through', () => {
    it('accepts "TR" as-is', () => {
      expect(mapNationalityToIso('TR')).toBe('TR');
    });
    it('accepts "NG" as-is', () => {
      expect(mapNationalityToIso('NG')).toBe('NG');
    });
    it('accepts lowercase "de" as-is (case-insensitive)', () => {
      expect(mapNationalityToIso('de')).toBe('DE');
    });
    it('accepts "GB-ENG" subdivision as-is', () => {
      expect(mapNationalityToIso('GB-ENG')).toBe('GB-ENG');
    });
    it('accepts lowercase "gb-sct" as-is', () => {
      expect(mapNationalityToIso('gb-sct')).toBe('GB-SCT');
    });
  });

  describe('European full names', () => {
    it.each([
      ['Germany', 'DE'],
      ['Spain', 'ES'],
      ['France', 'FR'],
      ['Italy', 'IT'],
      ['Netherlands', 'NL'],
      ['Portugal', 'PT'],
      ['Belgium', 'BE'],
      ['Switzerland', 'CH'],
      ['Austria', 'AT'],
      ['Croatia', 'HR'],
      ['Poland', 'PL'],
      ['Denmark', 'DK'],
      ['Sweden', 'SE'],
      ['Norway', 'NO'],
      ['Finland', 'FI'],
      ['Greece', 'GR'],
      ['Russia', 'RU'],
      ['Ukraine', 'UA'],
      ['Serbia', 'RS'],
      ['Romania', 'RO'],
      ['Hungary', 'HU'],
      ['Czechia', 'CZ'],
      ['Czech Republic', 'CZ'],
      ['Slovakia', 'SK'],
      ['Slovenia', 'SI'],
      ['Albania', 'AL'],
      ['Kosovo', 'XK'],
      ['Bulgaria', 'BG'],
      ['Iceland', 'IS'],
      ['Luxembourg', 'LU'],
      ['Montenegro', 'ME'],
      ['Moldova', 'MD'],
      ['Cyprus', 'CY'],
      ['Latvia', 'LV'],
      ['Lithuania', 'LT'],
      ['Estonia', 'EE'],
      ['Georgia', 'GE'],
      ['Armenia', 'AM'],
      ['Azerbaijan', 'AZ'],
      ['Faroe Islands', 'FO'],
    ])('maps "%s" to "%s"', (name, code) => {
      expect(mapNationalityToIso(name)).toBe(code);
    });
  });

  describe('Turkey aliases (all 3 DB representations)', () => {
    it('maps "Türkiye" (endonym) to "TR"', () => {
      expect(mapNationalityToIso('Türkiye')).toBe('TR');
    });
    it('maps "Turkiye" (no diacritics) to "TR"', () => {
      expect(mapNationalityToIso('Turkiye')).toBe('TR');
    });
    it('maps "Turkey" (English) to "TR"', () => {
      expect(mapNationalityToIso('Turkey')).toBe('TR');
    });
    it('maps "TR" (ISO) to "TR"', () => {
      expect(mapNationalityToIso('TR')).toBe('TR');
    });
  });

  describe('UK subdivisions', () => {
    it('maps "England" to "GB-ENG"', () => {
      expect(mapNationalityToIso('England')).toBe('GB-ENG');
    });
    it('maps "Scotland" to "GB-SCT"', () => {
      expect(mapNationalityToIso('Scotland')).toBe('GB-SCT');
    });
    it('maps "Wales" to "GB-WLS"', () => {
      expect(mapNationalityToIso('Wales')).toBe('GB-WLS');
    });
    it('maps "Northern Ireland" to "GB-NIR"', () => {
      expect(mapNationalityToIso('Northern Ireland')).toBe('GB-NIR');
    });
    it('maps "United Kingdom" to "GB"', () => {
      expect(mapNationalityToIso('United Kingdom')).toBe('GB');
    });
  });

  describe('Ireland disambiguation', () => {
    it('maps "Ireland" to "IE"', () => {
      expect(mapNationalityToIso('Ireland')).toBe('IE');
    });
    it('maps "Republic of Ireland" to "IE"', () => {
      expect(mapNationalityToIso('Republic of Ireland')).toBe('IE');
    });
    it('maps "Northern Ireland" to "GB-NIR" (not IE)', () => {
      expect(mapNationalityToIso('Northern Ireland')).toBe('GB-NIR');
    });
  });

  describe('African names', () => {
    it.each([
      ['Nigeria', 'NG'],
      ['Ghana', 'GH'],
      ['Senegal', 'SN'],
      ['Morocco', 'MA'],
      ['Algeria', 'DZ'],
      ['Tunisia', 'TN'],
      ['Cameroon', 'CM'],
      ['Mali', 'ML'],
      ['Egypt', 'EG'],
      ['South Africa', 'ZA'],
      ['Zimbabwe', 'ZW'],
      ['Zambia', 'ZM'],
      ['Angola', 'AO'],
      ['Benin', 'BJ'],
      ['Gambia', 'GM'],
      ['The Gambia', 'GM'],
      ['Guinea', 'GN'],
      ['Guinea-Bissau', 'GW'],
      ['Burkina Faso', 'BF'],
      ['Sierra Leone', 'SL'],
      ['Togo', 'TG'],
      ['Gabon', 'GA'],
      ['Kenya', 'KE'],
      ['Libya', 'LY'],
      ['Malawi', 'MW'],
      ['Niger', 'NE'],
      ['Cape Verde', 'CV'],
      ['Equatorial Guinea', 'GQ'],
      ['Mozambique', 'MZ'],
      ['Tanzania', 'TZ'],
    ])('maps "%s" to "%s"', (name, code) => {
      expect(mapNationalityToIso(name)).toBe(code);
    });
  });

  describe("Côte d'Ivoire aliases", () => {
    it("maps \"Côte d'Ivoire\" (with diacritics) to CI", () => {
      expect(mapNationalityToIso("Côte d'Ivoire")).toBe('CI');
    });
    it("maps \"Cote d'Ivoire\" (without diacritics) to CI", () => {
      expect(mapNationalityToIso("Cote d'Ivoire")).toBe('CI');
    });
    it('maps "Ivory Coast" (English name) to CI', () => {
      expect(mapNationalityToIso('Ivory Coast')).toBe('CI');
    });
  });

  describe('Congo disambiguation', () => {
    it('maps "Congo" to "CG" (Republic of the Congo)', () => {
      expect(mapNationalityToIso('Congo')).toBe('CG');
    });
    it('maps "Congo DR" to "CD" (Democratic Republic)', () => {
      expect(mapNationalityToIso('Congo DR')).toBe('CD');
    });
    it('maps "DR Congo" to "CD"', () => {
      expect(mapNationalityToIso('DR Congo')).toBe('CD');
    });
    it('maps "Democratic Republic of the Congo" to "CD"', () => {
      expect(mapNationalityToIso('Democratic Republic of the Congo')).toBe('CD');
    });
  });

  describe('Bosnia aliases', () => {
    it('maps "Bosnia and Herzegovina" to "BA"', () => {
      expect(mapNationalityToIso('Bosnia and Herzegovina')).toBe('BA');
    });
    it('maps "Bosnia-Herzegovina" to "BA"', () => {
      expect(mapNationalityToIso('Bosnia-Herzegovina')).toBe('BA');
    });
    it('maps "BA" (ISO) to "BA"', () => {
      expect(mapNationalityToIso('BA')).toBe('BA');
    });
  });

  describe('Americas', () => {
    it.each([
      ['Brazil', 'BR'],
      ['Argentina', 'AR'],
      ['Uruguay', 'UY'],
      ['USA', 'US'],
      ['United States', 'US'],
      ['United States of America', 'US'],
      ['Canada', 'CA'],
      ['Mexico', 'MX'],
      ['Colombia', 'CO'],
      ['Chile', 'CL'],
      ['Peru', 'PE'],
      ['Ecuador', 'EC'],
      ['Venezuela', 'VE'],
      ['Paraguay', 'PY'],
      ['Honduras', 'HN'],
      ['Costa Rica', 'CR'],
      ['Jamaica', 'JM'],
      ['Haiti', 'HT'],
      ['Dominican Republic', 'DO'],
      ['Suriname', 'SR'],
      ['Panama', 'PA'],
      ['Guadeloupe', 'GP'],
      ['Martinique', 'MQ'],
      ['Curaçao', 'CW'],
      ['Curacao', 'CW'],
    ])('maps "%s" to "%s"', (name, code) => {
      expect(mapNationalityToIso(name)).toBe(code);
    });
  });

  describe('Asia & Oceania', () => {
    it.each([
      ['Japan', 'JP'],
      ['Australia', 'AU'],
      ['Korea Republic', 'KR'],
      ['South Korea', 'KR'],
      ['Iran', 'IR'],
      ['Israel', 'IL'],
      ['Kazakhstan', 'KZ'],
      ['Uzbekistan', 'UZ'],
      ['Syria', 'SY'],
      ['Thailand', 'TH'],
      ['Philippines', 'PH'],
      ['New Zealand', 'NZ'],
      ['China', 'CN'],
      ['India', 'IN'],
    ])('maps "%s" to "%s"', (name, code) => {
      expect(mapNationalityToIso(name)).toBe(code);
    });
  });

  describe('case-insensitivity and whitespace', () => {
    it('mixed case "gErMaNy" → "DE"', () => {
      expect(mapNationalityToIso('gErMaNy')).toBe('DE');
    });
    it('trailing whitespace "Germany  " → "DE"', () => {
      expect(mapNationalityToIso('Germany  ')).toBe('DE');
    });
    it('leading whitespace "  Nigeria" → "NG"', () => {
      expect(mapNationalityToIso('  Nigeria')).toBe('NG');
    });
    it('all uppercase "NIGERIA" → "NG"', () => {
      expect(mapNationalityToIso('NIGERIA')).toBe('NG');
    });
  });

  describe('German aliases (Slice 103 — TM.de scrape)', () => {
    // Alle Werte aus DB-query nach Phase 1 Run
    it.each([
      ['Spanien', 'ES'],
      ['Italien', 'IT'],
      ['Deutschland', 'DE'],
      ['Türkei', 'TR'],
      ['Tuerkei', 'TR'],
      ['Frankreich', 'FR'],
      ['Brasilien', 'BR'],
      ['Österreich', 'AT'],
      ['Oesterreich', 'AT'],
      ['Argentinien', 'AR'],
      ['Albanien', 'AL'],
      ['Rumänien', 'RO'],
      ['Rumaenien', 'RO'],
      ['Bulgarien', 'BG'],
      ['Kolumbien', 'CO'],
      ['Schweiz', 'CH'],
      ['Slowenien', 'SI'],
      ['Ägypten', 'EG'],
      ['Aegypten', 'EG'],
      ['Vereinigte Staaten', 'US'],
      ['Dänemark', 'DK'],
      ['Daenemark', 'DK'],
      ['Katar', 'QA'],
      ['Kuba', 'CU'],
      ['Lettland', 'LV'],
      ['Litauen', 'LT'],
      ['Luxemburg', 'LU'],
      ['Marokko', 'MA'],
      ['Niederlande', 'NL'],
      ['Elfenbeinküste', 'CI'],
      ['Elfenbeinkueste', 'CI'],
      ['Weißrussland', 'BY'],
      ['Weissrussland', 'BY'],
      ['Südafrika', 'ZA'],
      ['Südkorea', 'KR'],
      ['Mexiko', 'MX'],
      ['Neuseeland', 'NZ'],
      ['Polen', 'PL'],
      ['Ungarn', 'HU'],
      // Slice 105: TFF1 edge cases
      ['Tadschikistan', 'TJ'],
      ['Usbekistan', 'UZ'],
      ['Mauritius', 'MU'],
    ])('maps German "%s" to "%s"', (de, iso) => {
      expect(mapNationalityToIso(de)).toBe(iso);
    });
  });
});
