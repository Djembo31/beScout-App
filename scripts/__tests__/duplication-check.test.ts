/**
 * Slice 434 — Unit-Tests für den Duplikations-Ratchet.
 *
 * Testet die reinen, exportierten Bausteine (Parser + Discovery-Primitive) —
 * die FN/FP-kritische Logik. File-IO (main) wird live über die AC-Audit-Smokes
 * bewiesen (worklog/proofs/434-ac-audit.txt), nicht hier gemockt.
 */
import {
  parseRegistry,
  extractExports,
  normalizeStem,
  synonymGroup,
  clusterFromExports,
  clusterIsTracked,
} from '../duplication-check';

describe('parseRegistry', () => {
  it('parst gültige Zeilen mit allen Feldern', () => {
    const md = [
      'Vortext',
      '```dup-registry',
      '# Kommentar wird ignoriert',
      'geheilt | S406 | db | treasury_balance_cents | Counter → Ledger',
      'ungetrackt | D-23 | code | formatScout, fmtScout | 2 Geld-Formatter',
      '```',
      'Nachtext',
    ].join('\n');
    const { entries, blockFound, warnings } = parseRegistry(md);
    expect(blockFound).toBe(true);
    expect(warnings).toHaveLength(0);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ status: 'geheilt', id: 'S406', kind: 'db', symbols: ['treasury_balance_cents'] });
    expect(entries[1].symbols).toEqual(['formatScout', 'fmtScout']);
    expect(entries[1].status).toBe('ungetrackt');
  });

  it('liefert blockFound=false wenn kein dup-registry-Block existiert (Edge 1)', () => {
    const { blockFound, entries } = parseRegistry('# nur Prosa, kein Block');
    expect(blockFound).toBe(false);
    expect(entries).toHaveLength(0);
  });

  it('überspringt Zeilen mit <4 Spalten + warnt (Edge 2)', () => {
    const md = '```dup-registry\nkaputt | nur | drei\ngeheilt | X1 | code | sym | ok\n```';
    const { entries, warnings } = parseRegistry(md);
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe('X1');
    expect(warnings.length).toBeGreaterThanOrEqual(1);
  });

  it('überspringt ungültigen Status/Kind statt zu crashen (Edge 2)', () => {
    const md = '```dup-registry\nbloedsinn | X1 | code | sym | n\ngeheilt | X2 | quatsch | sym | n\n```';
    const { entries, warnings } = parseRegistry(md);
    expect(entries).toHaveLength(0);
    expect(warnings.length).toBe(2);
  });

  it('behält Pipes in der note-Spalte', () => {
    const md = '```dup-registry\nbewusste-zwei | D112 | concept | orders, offers | a | b | c\n```';
    const { entries } = parseRegistry(md);
    expect(entries[0].note).toBe('a | b | c');
  });

  it('ignoriert Kommentar- und Leerzeilen', () => {
    const md = '```dup-registry\n\n# header\n\ngeheilt | X1 | code | sym | n\n\n```';
    const { entries } = parseRegistry(md);
    expect(entries).toHaveLength(1);
  });
});

describe('extractExports', () => {
  it('findet export function / const / let', () => {
    const src = [
      'export function timeAgo(t: number) {}',
      'export const formatScout = (n: number) => n;',
      'export let mutableThing = 1;',
      'const notExported = 2;',
      'function alsoNot() {}',
    ].join('\n');
    const names = extractExports(src);
    expect(names).toContain('timeAgo');
    expect(names).toContain('formatScout');
    expect(names).toContain('mutableThing');
    expect(names).not.toContain('notExported');
    expect(names).not.toContain('alsoNot');
  });

  it('findet export default function', () => {
    expect(extractExports('export default function Page() {}')).toContain('Page');
  });

  it('findet export async function', () => {
    expect(extractExports('export async function loadX() {}')).toContain('loadX');
  });
});

describe('normalizeStem', () => {
  it('strippt format/fmt → gleicher Stamm (D-23 Twin-Klasse)', () => {
    expect(normalizeStem('formatScout')).toBe('scout');
    expect(normalizeStem('fmtScout')).toBe('scout');
    expect(normalizeStem('formatScout')).toBe(normalizeStem('fmtScout'));
  });

  it('strippt calc/calculate/compute → gleicher Stamm', () => {
    expect(normalizeStem('calcFee')).toBe('fee');
    expect(normalizeStem('calculateFee')).toBe('fee');
    expect(normalizeStem('computeFee')).toBe('fee');
  });

  it('strippt NICHT get/use/fetch (kein Accessor/Hook-FP)', () => {
    // getWallet vs useWallet dürfen NICHT kollidieren (Service+Hook = legitim).
    expect(normalizeStem('getWallet')).not.toBe(normalizeStem('useWallet'));
    expect(normalizeStem('getWallet')).toBe('getwallet');
  });

  it('strippt Prefix nur an camelCase-Grenze (formatter ≠ format)', () => {
    // "formatter" beginnt mit "format" aber Folge-Char ist kleinbuchstabe → nicht strippen.
    expect(normalizeStem('formatter')).toBe('formatter');
  });

  it('lowercased plain names', () => {
    expect(normalizeStem('TimeAgo')).toBe('timeago');
  });
});

describe('synonymGroup', () => {
  it('mappt format/fmt → fmt, calc/calculate/compute → calc', () => {
    expect(synonymGroup('formatScout')).toBe('fmt');
    expect(synonymGroup('fmtScout')).toBe('fmt');
    expect(synonymGroup('calcFee')).toBe('calc');
    expect(synonymGroup('calculateFee')).toBe('calc');
    expect(synonymGroup('computeFee')).toBe('calc');
  });
  it('null bei prefix-losem Namen', () => {
    expect(synonymGroup('timeAgo')).toBeNull();
    expect(synonymGroup('getWallet')).toBeNull();
  });
});

describe('clusterFromExports (Twin-Erkennung, Reviewer-434 #2/#6)', () => {
  const mk = (...names: string[]) => names.map((name, i) => ({ name, file: `f${i}.ts` }));

  it('clustert formatScout/fmtScout (Gruppe fmt) als Twin', () => {
    const c = clusterFromExports(mk('formatScout', 'fmtScout'));
    expect(c).toHaveLength(1);
    expect(c[0].stem).toBe('scout');
  });

  it('clustert timeAgo/formatTimeAgo (bare + fmt) als Twin', () => {
    const c = clusterFromExports(mk('timeAgo', 'formatTimeAgo'));
    expect(c).toHaveLength(1);
    expect(c[0].stem).toBe('timeago');
  });

  it('clustert NICHT calcFee/formatFee (calc≠fmt = komplementär) — FP-Fix #2', () => {
    expect(clusterFromExports(mk('calcFee', 'formatFee'))).toHaveLength(0);
  });

  it('clustert calcFee/computeFee (beide calc-Gruppe) als Twin', () => {
    const c = clusterFromExports(mk('calcFee', 'computeFee'));
    expect(c).toHaveLength(1);
    expect(c[0].stem).toBe('fee');
  });

  it('clustert NICHT getWallet/useWallet (verschiedene Stämme, kein Accessor/Hook-FP)', () => {
    expect(clusterFromExports(mk('getWallet', 'useWallet'))).toHaveLength(0);
  });

  it('clustert NICHT bei nur 1 Symbol', () => {
    expect(clusterFromExports(mk('formatScout'))).toHaveLength(0);
  });
});

describe('clusterIsTracked (Ratchet-Entscheidung)', () => {
  const cluster = {
    stem: 'scout',
    symbols: [
      { name: 'formatScout', file: 'a.ts' },
      { name: 'fmtScout', file: 'b.ts' },
    ],
  };
  it('true wenn alle Symbol-Namen registriert', () => {
    expect(clusterIsTracked(cluster, new Set(['formatscout', 'fmtscout']))).toBe(true);
  });
  it('false wenn ein Symbol fehlt → untracked → Gate feuert', () => {
    expect(clusterIsTracked(cluster, new Set(['formatscout']))).toBe(false);
  });
});
