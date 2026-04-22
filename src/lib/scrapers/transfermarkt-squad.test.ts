import { describe, it, expect } from 'vitest';
import { parseSquadTable } from './transfermarkt-squad';

// Mini-Fixture modeled on real TM-Galatasaray-Squad-Page (2026-04).
// Each row follows the nested-inline-table pattern: squad-row contains a
// 2×2 inline-table for player-photo + name + position.
const GK_ROW = `<tr class="odd">
<td class="zentriert rueckennummer bg_Torwart" title="Torwart"><div class=rn_nummer>1</div></td><td class="posrela">
<table class="inline-table">
    <tr>
        <td rowspan="2"><img src="https://img/a.png" title="Uğurcan Çakır" class="bilderrahmen-fixed lazy" /></td>
        <td class="hauptlink">
            <a href="/ugurcan-cakir/profil/spieler/292199">Uğurcan Çakır</a>
        </td>
    </tr>
    <tr>
        <td>Torwart</td>
    </tr>
</table>
</td><td class="zentriert">05.04.1996 (30)</td><td class="zentriert"><img src="https://flags/174.png" title="Türkei" alt="Türkei" class="flaggenrahmen" /></td><td class="rechts hauptlink"><a href="/ugurcan-cakir/marktwertverlauf/spieler/292199">15,00 Mio. €</a></td></tr>`;

const DEF_ROW = `<tr class="even">
<td class="zentriert rueckennummer bg_Innenverteidiger" title="Innenverteidiger"><div class=rn_nummer>4</div></td><td class="posrela">
<table class="inline-table">
    <tr>
        <td rowspan="2"><img /></td>
        <td class="hauptlink">
            <a href="/davinson-sanchez/profil/spieler/253188">Davinson Sánchez</a>
        </td>
    </tr>
    <tr>
        <td>Innenverteidiger</td>
    </tr>
</table>
</td><td class="zentriert">12.06.1996 (29)</td><td class="zentriert"><img class="flaggenrahmen" title="Kolumbien" alt="Kolumbien" src="/f.png" /></td><td class="rechts hauptlink"><a href="/davinson-sanchez/marktwertverlauf/spieler/253188">12,00 Mio. €</a></td></tr>`;

const MV_DASH_ROW = `<tr class="odd">
<td class="zentriert rueckennummer bg_Torwart" title="Torwart"><div class=rn_nummer>35</div></td><td class="posrela">
<table class="inline-table"><tr><td><img/></td><td class="hauptlink"><a href="/young-keeper/profil/spieler/999999">Young Keeper</a></td></tr><tr><td>Torwart</td></tr></table>
</td><td class="zentriert">01.01.2006 (19)</td><td class="zentriert"><img class="flaggenrahmen" title="Türkei" src="/t.png" /></td><td class="rechts hauptlink"><a href="#">-</a></td></tr>`;

const NON_SQUAD_TABLE = `<table class="transfer-history">
<tr class="odd"><td>Some transfer info without rn_nummer or /profil/spieler/</td></tr>
</table>`;

const MALFORMED_ROW = `<tr class="odd"><td>only has rn_nummer but no profile link <div class=rn_nummer>99</div></td></tr>`;

describe('parseSquadTable', () => {
  it('parses a basic 2-row squad (GK + DEF) with all fields', () => {
    const entries = parseSquadTable(GK_ROW + DEF_ROW);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual({
      tmPlayerId: 292199,
      tmSlug: 'ugurcan-cakir',
      displayName: 'Uğurcan Çakır',
      shirtNumber: 1,
      position: 'Torwart',
      nationality: 'Türkei',
      marketValueEur: 15_000_000,
    });
    expect(entries[1]).toEqual({
      tmPlayerId: 253188,
      tmSlug: 'davinson-sanchez',
      displayName: 'Davinson Sánchez',
      shirtNumber: 4,
      position: 'Innenverteidiger',
      nationality: 'Kolumbien',
      marketValueEur: 12_000_000,
    });
  });

  it('returns null marketValueEur when TM shows "-"', () => {
    const entries = parseSquadTable(MV_DASH_ROW);
    expect(entries).toHaveLength(1);
    expect(entries[0].marketValueEur).toBeNull();
    expect(entries[0].shirtNumber).toBe(35);
  });

  it('ignores non-squad tables (no rn_nummer, no profile link)', () => {
    expect(parseSquadTable(NON_SQUAD_TABLE)).toHaveLength(0);
  });

  it('skips malformed rows missing profile link', () => {
    expect(parseSquadTable(MALFORMED_ROW)).toHaveLength(0);
  });

  it('returns empty array for empty HTML (Cloudflare challenge etc.)', () => {
    expect(parseSquadTable('')).toHaveLength(0);
    expect(parseSquadTable('<html><body>no tables</body></html>')).toHaveLength(0);
  });

  it('parses Tsd. € (thousands) market value', () => {
    const row = MV_DASH_ROW.replace(
      '<a href="#">-</a>',
      '<a href="#">750,00 Tsd. €</a>',
    );
    const entries = parseSquadTable(row);
    expect(entries[0].marketValueEur).toBe(750_000);
  });

  it('handles nationality title BEFORE class attribute (TM order variant)', () => {
    // TM usually orders title→class, but parser must work either way.
    const row = GK_ROW.replace(
      'title="Türkei" alt="Türkei" class="flaggenrahmen"',
      'class="flaggenrahmen" alt="Türkei" title="Türkei"',
    );
    const entries = parseSquadTable(row);
    expect(entries[0].nationality).toBe('Türkei');
  });

  it('respects tr-depth through inline-table nested rows', () => {
    // Regression guard: naive `<tr>...</tr>` non-greedy matched inner
    // inline-table <tr>, cutting squad row early → MV/nationality vanished.
    const entries = parseSquadTable(GK_ROW);
    expect(entries[0].marketValueEur).toBe(15_000_000);
    expect(entries[0].nationality).toBe('Türkei');
  });
});
