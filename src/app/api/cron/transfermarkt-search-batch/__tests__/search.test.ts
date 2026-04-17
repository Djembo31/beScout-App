import { describe, it, expect } from 'vitest';
import { normalizeName, parseSearchResults, scoreMatch } from '../route';

describe('normalizeName', () => {
  it('lowercases + strips diacritics', () => {
    expect(normalizeName('Özil')).toBe('ozil');
    expect(normalizeName('Çankaya')).toBe('cankaya');
    expect(normalizeName('İlkay')).toBe('ilkay');
  });

  it('removes non-alpha characters', () => {
    expect(normalizeName('M. Schulz')).toBe('mschulz');
    expect(normalizeName('Yiğit-Arslan')).toBe('yigitarslan');
  });

  it('handles German umlauts', () => {
    expect(normalizeName('Müller')).toBe('muller');
    expect(normalizeName('Schäfer')).toBe('schafer');
  });
});

describe('parseSearchResults', () => {
  it('extracts player-ids from search result HTML', () => {
    const html = `
      <table>
        <tr><td>
          <a href="/emre-demir/profil/spieler/123456" class="spielprofil_tooltip">Emre Demir</a>
        </td>
        <td>Bayern München</td></tr>
        <tr><td>
          <a href="/melih-bostan/profil/spieler/789012" title="Melih Bostan">Melih Bostan</a>
        </td></tr>
      </table>
    `;
    const results = parseSearchResults(html);
    expect(results).toHaveLength(2);
    expect(results[0].transfermarkt_id).toBe('123456');
    expect(results[0].slug).toBe('emre-demir');
    expect(results[0].display_name).toBe('Emre Demir');
    expect(results[1].transfermarkt_id).toBe('789012');
  });

  it('returns empty array when no player links', () => {
    expect(parseSearchResults('<html>no matches</html>')).toHaveLength(0);
  });
});

describe('scoreMatch', () => {
  const player = { first_name: 'Emre', last_name: 'Demir' };
  const club = { name: 'Sakaryaspor', short: 'SAK' };

  it('scores high when last_name in slug + club in context', () => {
    const match = {
      transfermarkt_id: '1',
      slug: 'emre-demir',
      display_name: 'Emre Demir',
      context: '<td>Sakaryaspor</td>',
    };
    const score = scoreMatch(match, player, club);
    // last_name in slug (40) + first_name (20) + club in context (30) = 90
    expect(score).toBeGreaterThanOrEqual(85);
  });

  it('scores low when only last_name matches', () => {
    const match = {
      transfermarkt_id: '1',
      slug: 'other-demir',
      display_name: 'Other Demir',
      context: '<td>Galatasaray</td>',
    };
    const score = scoreMatch(match, player, club);
    // last_name in slug (40) only
    expect(score).toBeLessThan(50);
  });

  it('scores with club-short fallback', () => {
    const match = {
      transfermarkt_id: '1',
      slug: 'emre-demir',
      display_name: 'Emre Demir',
      context: '<td>SAK United</td>',
    };
    const score = scoreMatch(match, player, club);
    // last_name in slug (40) + first_name (20) + short (15) = 75
    expect(score).toBeGreaterThanOrEqual(65);
  });

  it('returns 0 when nothing matches', () => {
    const match = {
      transfermarkt_id: '1',
      slug: 'unrelated-player',
      display_name: 'Unrelated Name',
      context: '<td>Other Club</td>',
    };
    expect(scoreMatch(match, player, club)).toBe(0);
  });
});
