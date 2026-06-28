/**
 * Slice 434 — Duplikations-Ratchet (Detektor für ungetrackte Zwei).
 *
 * Schließt die §0-„Detektor"-Lücke: macht die Schnitt-Regel „kein ungetrackter
 * zweiter Weg" maschinell prüfbar. Reiht sich in die Detektor-Pattern-Familie
 * ein (D46 orphan-component, D54 wiring-check) und nutzt das im Repo erprobte
 * Ratchet-Muster (boundary-check S4, test-confidence-check S5).
 *
 * KERN-SEMANTIK: Eine Duplikation ist ERLAUBT, wenn sie im Register steht
 * (egal ob `bewusste-zwei` wie D112 oder `ungetrackt`=noch-zu-heilen — Haupt-
 * sache acknowledged). Sie ist VERBOTEN, wenn ein Duplikations-Fingerabdruck im
 * Code existiert, den das Register NICHT kennt. = §0 1:1.
 *
 * BASELINE = EINE Quelle, kein zweites File: der gefencte ```dup-registry```-
 * Block IN worklog/notes/disease-register.md. Prosa = Narrativ, Block = Maschine.
 *
 * Drei Prüfungen:
 *   1. Geheilt-Regressions-Guard (kind=code ODER db): ein als `geheilt` registriertes
 *      Symbol, das in src/ (non-test) WIEDER auftaucht → Finding. Scan ist src/-only
 *      (Migrationen liegen in supabase/, werden NIE gescannt → kein append-only-FP).
 *      Live-DB-Reconciliation (Objekt nur in DB, nicht im Code) = v2-Scope.
 *   2. Discovery (WARN, speist das Register): Funktions-Namens-Stamm-Kollision unter
 *      exportierten Symbolen in src/lib/** — nur Synonym-Gruppen format≈fmt / calc≈
 *      calculate≈compute, Cluster nur bei ≤1 Gruppe (formatScout/fmtScout + timeAgo/
 *      formatTimeAgo, NICHT komplementäres calcFee/formatFee).
 *   3. Ratchet-Gate: Geheilt-Regression ODER untracked Discovery-Cluster → exit 1
 *      (in --check). Pre-commit ruft v1 mit `|| true` (WARN-first) bis FP=0.
 *      Plus Stale-INFO (report-only): ungetrackt+code-Eintrag dessen Symbole aus src/
 *      verschwanden → evtl. konsolidiert.
 *
 * Usage:
 *   npx tsx scripts/duplication-check.ts          # full report (exit 0)
 *   npx tsx scripts/duplication-check.ts --check   # gate-mode (exit 1 bei Findings)
 *   pnpm run audit:dup        /        audit:dup:check
 *
 * Exit-Codes: 0 clean · 1 Findings (Mensch reviewt/heilt/registriert) · 2 Script-Fehler.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { resolve, basename, relative } from 'node:path';

const PROJECT_ROOT = resolve(__dirname, '..');
const REGISTER_PATH = resolve(PROJECT_ROOT, 'worklog/notes/disease-register.md');
const SRC_DIR = resolve(PROJECT_ROOT, 'src');
const LIB_DIR = resolve(SRC_DIR, 'lib');
const REPORT_DIR = resolve(PROJECT_ROOT, 'worklog/audits');

const args = process.argv.slice(2);
const CHECK_MODE = args.includes('--check');

type RegStatus = 'ungetrackt' | 'bewusste-zwei' | 'geheilt';
type RegKind = 'code' | 'db' | 'concept';

interface RegEntry {
  status: RegStatus;
  id: string;
  kind: RegKind;
  symbols: string[];
  note: string;
}

const VALID_STATUS: RegStatus[] = ['ungetrackt', 'bewusste-zwei', 'geheilt'];
const VALID_KIND: RegKind[] = ['code', 'db', 'concept'];

// --- generic helpers (Stil aus wiring-check.ts / boundary-check.ts) ---

function readFileSafe(p: string): string {
  try {
    return readFileSync(p, 'utf8');
  } catch {
    return '';
  }
}

/** Walk dir for files with given extensions; exclude node_modules + test files. */
function listSourceFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = resolve(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry === '__tests__' || entry === 'test-utils') continue;
      out.push(...listSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

function rel(p: string): string {
  return relative(PROJECT_ROOT, p).replace(/\\/g, '/');
}

// --- 0. Registry-Parser (die maschinenlesbare Baseline) ---

interface ParseResult {
  entries: RegEntry[];
  warnings: string[];
  blockFound: boolean;
}

export function parseRegistry(markdown: string): ParseResult {
  const warnings: string[] = [];
  // Extrahiere den ```dup-registry … ``` Block (genau einer).
  const m = markdown.match(/```dup-registry\r?\n([\s\S]*?)```/);
  if (!m) return { entries: [], warnings, blockFound: false };

  const entries: RegEntry[] = [];
  const lines = m[1].split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue; // Leerzeile / Kommentar
    // Pipe-delimited: status | id | kind | symbols(comma) | note
    const parts = line.split('|').map((s) => s.trim());
    if (parts.length < 4) {
      warnings.push(`Zeile mit <4 Spalten übersprungen: "${line}"`);
      continue;
    }
    const [status, id, kind, symbolsRaw] = parts;
    const note = parts.slice(4).join(' | ');
    if (!VALID_STATUS.includes(status as RegStatus)) {
      warnings.push(`Ungültiger Status "${status}" (Zeile übersprungen): "${line}"`);
      continue;
    }
    if (!VALID_KIND.includes(kind as RegKind)) {
      warnings.push(`Ungültiger Kind "${kind}" (Zeile übersprungen): "${line}"`);
      continue;
    }
    const symbols = symbolsRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (symbols.length === 0) {
      warnings.push(`Eintrag ${id} ohne Symbole (übersprungen)`);
      continue;
    }
    entries.push({ status: status as RegStatus, id, kind: kind as RegKind, symbols, note });
  }
  return { entries, warnings, blockFound: true };
}

/** Alle Symbole, die das Register kennt (für Discovery-Suppression). */
function registeredSymbols(entries: RegEntry[]): Set<string> {
  const s = new Set<string>();
  for (const e of entries) for (const sym of e.symbols) s.add(sym.toLowerCase());
  return s;
}

// --- src-Files einmal laden (geteilt: Geheilt-Guard + Stale-INFO) ---

type SrcFile = { rel: string; content: string };

function loadSrc(srcFiles: string[]): SrcFile[] {
  return srcFiles.map((f) => ({ rel: rel(f), content: readFileSafe(f) }));
}

// --- 1. Geheilt-Regressions-Guard (kind=code ODER db) ---
// Reviewer-434 #1: kind=db wird MITGEPRÜFT. Der Scan ist src/-only (Migrationen liegen in
// supabase/, werden NIE gescannt) → eine geheilte DB-Spalte (z.B. treasury_balance_cents),
// die in src/ wieder referenziert wird (`.select('…')`), ist eine echte Regression mit ~0 FP.

interface HealedFinding {
  id: string;
  symbol: string;
  files: string[];
}

function checkHealedRegression(entries: RegEntry[], src: SrcFile[]): HealedFinding[] {
  const healed = entries.filter((e) => e.status === 'geheilt' && (e.kind === 'code' || e.kind === 'db'));
  if (healed.length === 0) return [];

  const findings: HealedFinding[] = [];
  for (const entry of healed) {
    for (const symbol of entry.symbols) {
      // Word-boundary match, damit "buildLineup" nicht "rebuildLineupX" trifft.
      const re = new RegExp(`\\b${escapeRegExp(symbol)}\\b`);
      const hits = src.filter((f) => re.test(f.content)).map((f) => f.rel);
      if (hits.length > 0) findings.push({ id: entry.id, symbol, files: hits });
    }
  }
  return findings;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// --- 2. Discovery: Funktions-Namens-Stamm-Kollision in src/lib/** ---

// Synonym-Gruppen: nur Prefix-Paare „gleiche Aufgabe, anderer Name" werden gestrippt.
// EINE Gruppe = Synonyme (format≈fmt; calc≈calculate≈compute). Ein Stamm-Cluster gilt nur
// als Twin, wenn HÖCHSTENS EINE Synonym-Gruppe beteiligt ist (+ optional prefix-lose Namen):
//   formatScout/fmtScout (Gruppe fmt) ✓ · timeAgo/formatTimeAgo (bare + fmt) ✓
//   calcFee/formatFee (calc≠fmt = komplementär) ✗ kein Twin  (Reviewer-434 #2: latente FP raus)
// NICHT get/fetch/use/my — würden Accessor-/Hook-Varianten konflieren. Breitere Axes
// (DB-Overloads, Component-Role) = v2 (Spec §11 Scope-Out).
const SYNONYM_GROUPS: Record<string, string[]> = {
  fmt: ['format', 'fmt'],
  calc: ['calculate', 'compute', 'calc'],
};
const PREFIX_TO_GROUP: Record<string, string> = {};
for (const [group, prefixes] of Object.entries(SYNONYM_GROUPS)) {
  for (const p of prefixes) PREFIX_TO_GROUP[p] = group;
}
// Längster Prefix zuerst, damit "calculate" vor "calc" matcht.
const PREFIXES = Object.keys(PREFIX_TO_GROUP).sort((a, b) => b.length - a.length);
const MIN_STEM_LEN = 3;

interface Cluster {
  stem: string;
  symbols: { name: string; file: string }[];
}

/** Exportierte Symbol-Definitionen (function/const/let) aus einem File. */
export function extractExports(content: string): string[] {
  const names: string[] = [];
  const re = /export\s+(?:async\s+)?(?:function|const|let)\s+([a-zA-Z_$][\w$]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) names.push(m[1]);
  // export default function NAME
  const reDefault = /export\s+default\s+(?:async\s+)?function\s+([a-zA-Z_$][\w$]*)/g;
  while ((m = reDefault.exec(content)) !== null) names.push(m[1]);
  return names;
}

/** Längster Synonym-Prefix an der camelCase-Grenze — oder null. */
function matchedPrefix(name: string): string | null {
  for (const p of PREFIXES) {
    if (new RegExp(`^${p}(?=[A-Z0-9_])`).test(name)) return p;
  }
  return null;
}

/** Normalisiere einen Symbol-Namen auf seinen Vergleichs-Stamm (1 Synonym-Prefix gestrippt). */
export function normalizeStem(name: string): string {
  const p = matchedPrefix(name);
  return (p ? name.slice(p.length) : name).toLowerCase();
}

/** Synonym-Gruppe des gestrippten Prefix (fmt|calc) oder null bei prefix-losem Namen. */
export function synonymGroup(name: string): string | null {
  const p = matchedPrefix(name);
  return p ? PREFIX_TO_GROUP[p] : null;
}

/**
 * Pure Cluster-Bildung aus bereits-extrahierten Exports (unit-testbar, kein File-IO).
 * Twin-Cluster = ≥2 distinkte Namen, gleicher Stamm, ≤1 beteiligte Synonym-Gruppe.
 */
export function clusterFromExports(exps: { name: string; file: string }[]): Cluster[] {
  const byStem = new Map<string, { name: string; file: string }[]>();
  for (const e of exps) {
    const stem = normalizeStem(e.name);
    if (stem.length < MIN_STEM_LEN) continue;
    if (!byStem.has(stem)) byStem.set(stem, []);
    byStem.get(stem)!.push(e);
  }
  const clusters: Cluster[] = [];
  for (const [stem, syms] of byStem) {
    const distinctNames = Array.from(new Set(syms.map((s) => s.name)));
    if (distinctNames.length < 2) continue;
    // ≥2 verschiedene Synonym-Gruppen (calc vs fmt) = komplementär, kein Twin.
    const groups = new Set(distinctNames.map(synonymGroup).filter((g): g is string => g !== null));
    if (groups.size <= 1) clusters.push({ stem, symbols: syms });
  }
  return clusters;
}

function detectDiscoveryClusters(libFiles: string[]): Cluster[] {
  const exps: { name: string; file: string }[] = [];
  for (const file of libFiles) {
    const r = rel(file);
    for (const name of extractExports(readFileSafe(file))) exps.push({ name, file: r });
  }
  return clusterFromExports(exps);
}

/** Cluster ist getrackt, wenn ALLE seine Symbol-Namen im Register stehen. */
export function clusterIsTracked(cluster: Cluster, registered: Set<string>): boolean {
  const names = Array.from(new Set(cluster.symbols.map((s) => s.name.toLowerCase())));
  return names.every((n) => registered.has(n));
}

// --- 3. Stale-Register-INFO (Reviewer-434 #4 / Pre-Mortem #4) ---
// Report-only, NIE exit-relevant: ein `ungetrackt`+`code`-Eintrag, dessen Symbole in src/
// komplett verschwunden sind, ist evtl. konsolidiert → Hinweis „auf geheilt prüfen".

interface StaleInfo {
  id: string;
  symbols: string[];
}

function checkStaleRegistry(entries: RegEntry[], src: SrcFile[]): StaleInfo[] {
  const candidates = entries.filter((e) => e.status === 'ungetrackt' && e.kind === 'code');
  const out: StaleInfo[] = [];
  for (const e of candidates) {
    const present = e.symbols.some((sym) => {
      const re = new RegExp(`\\b${escapeRegExp(sym)}\\b`);
      return src.some((f) => re.test(f.content));
    });
    if (!present) out.push({ id: e.id, symbols: e.symbols });
  }
  return out;
}

// --- Report ---

function todayStr(): string {
  return process.env.AUDIT_DATE ?? new Date().toISOString().slice(0, 10);
}

interface RunResult {
  healed: HealedFinding[];
  stale: StaleInfo[];
  trackedClusters: Cluster[];
  untrackedClusters: Cluster[];
  parse: ParseResult;
}

function formatReport(r: RunResult): string {
  const L: string[] = [];
  L.push(`# Duplikations-Ratchet Report — ${todayStr()}`, '');
  L.push(`Slice 434 — Detektor für ungetrackte Zwei (§0 Schnitt-Regel).`, '');
  L.push(`Baseline: \`worklog/notes/disease-register.md\` → \`\`\`dup-registry\`\`\`-Block.`, '');
  L.push('## Summary', '');
  L.push(`- Registry-Einträge geladen:   ${r.parse.entries.length}`);
  L.push(`- Geheilt-Regression:          ${r.healed.length}  ${r.healed.length ? '🔴' : '✅'}`);
  L.push(`- Discovery-Cluster (tracked): ${r.trackedClusters.length}`);
  L.push(`- Discovery untracked:         ${r.untrackedClusters.length}  ${r.untrackedClusters.length ? '🟠' : '✅'}`);
  if (r.stale.length) L.push(`- Stale-Register-INFO:         ${r.stale.length}  (ℹ️ evtl. konsolidiert)`);
  if (r.parse.warnings.length) L.push(`- Parser-Warnungen:            ${r.parse.warnings.length}`);
  L.push('');

  if (r.healed.length) {
    L.push('## 🔴 Geheilt-Regression (ein geheilter Zwilling kam zurück)', '');
    L.push('| Register-ID | Symbol | Wieder gefunden in |', '|---|---|---|');
    for (const h of r.healed) L.push(`| ${h.id} | \`${h.symbol}\` | ${h.files.slice(0, 5).join(', ')}${h.files.length > 5 ? ' …' : ''} |`);
    L.push('');
  }

  if (r.untrackedClusters.length) {
    L.push('## 🟠 Untracked Duplikations-Verdacht (Stamm-Kollision, nicht im Register)', '');
    L.push('| Stamm | Symbole | Dateien |', '|---|---|---|');
    for (const c of r.untrackedClusters) {
      const syms = Array.from(new Set(c.symbols.map((s) => s.name))).join(', ');
      const files = Array.from(new Set(c.symbols.map((s) => s.file))).join(', ');
      L.push(`| \`${c.stem}\` | ${syms} | ${files} |`);
    }
    L.push('');
    L.push('→ Pro Cluster entscheiden: **konsolidieren** (auf 1 kanonisches Symbol)');
    L.push('  ODER als **bewusste-zwei/ungetrackt ins Register** eintragen (dann getrackt).');
    L.push('');
  }

  if (r.trackedClusters.length) {
    L.push('## ✅ Discovery-Cluster (bereits im Register = getrackt)', '');
    for (const c of r.trackedClusters) {
      const syms = Array.from(new Set(c.symbols.map((s) => s.name))).join(', ');
      L.push(`- \`${c.stem}\`: ${syms}`);
    }
    L.push('');
  }

  if (r.stale.length) {
    L.push('## ℹ️ Stale-Register-INFO (ungetrackt+code, Symbole in src/ abwesend → auf geheilt prüfen)', '');
    for (const s of r.stale) L.push(`- ${s.id}: \`${s.symbols.join(', ')}\``);
    L.push('');
  }

  if (r.parse.warnings.length) {
    L.push('## Parser-Warnungen', '');
    for (const w of r.parse.warnings) L.push(`- ${w}`);
    L.push('');
  }
  return L.join('\n');
}

// --- main ---

function main(): number {
  console.log('═══ Duplikations-Ratchet (Slice 434) ═══');

  const md = readFileSafe(REGISTER_PATH);
  if (!md) {
    console.error(`❌ Register nicht lesbar: ${rel(REGISTER_PATH)}`);
    return 2;
  }
  const parse = parseRegistry(md);
  if (!parse.blockFound) {
    console.error('❌ Kein ```dup-registry```-Block in disease-register.md gefunden.');
    console.error('   → Baseline-Block anlegen (siehe Slice 434 Spec §2).');
    return 2;
  }

  const srcFiles = listSourceFiles(SRC_DIR);
  const libFiles = listSourceFiles(LIB_DIR);
  const src = loadSrc(srcFiles);

  const healed = checkHealedRegression(parse.entries, src);
  const stale = checkStaleRegistry(parse.entries, src);
  const clusters = detectDiscoveryClusters(libFiles);
  const registered = registeredSymbols(parse.entries);
  const trackedClusters = clusters.filter((c) => clusterIsTracked(c, registered));
  const untrackedClusters = clusters.filter((c) => !clusterIsTracked(c, registered));

  const result: RunResult = { healed, stale, trackedClusters, untrackedClusters, parse };

  console.log(`Registry-Einträge:   ${parse.entries.length}`);
  console.log(`src-Files gescannt:  ${srcFiles.length}  (lib: ${libFiles.length})`);
  console.log(`Geheilt-Regression:  ${healed.length}`);
  console.log(`Discovery-Cluster:   ${clusters.length}  (tracked ${trackedClusters.length} / untracked ${untrackedClusters.length})`);
  if (stale.length) console.log(`Stale-Register-INFO: ${stale.length}  (ℹ️ report-only)`);
  if (parse.warnings.length) console.log(`Parser-Warnungen:    ${parse.warnings.length}`);

  if (!existsSync(REPORT_DIR)) mkdirSync(REPORT_DIR, { recursive: true });
  const reportPath = resolve(REPORT_DIR, `dup-${todayStr()}.md`);
  writeFileSync(reportPath, formatReport(result));
  console.log(`Report:              ${rel(reportPath)}`);

  const violations = healed.length + untrackedClusters.length;
  if (violations > 0) {
    console.log('');
    if (healed.length) {
      console.log(`🔴 ${healed.length} geheilte(r) Zwilling(e) wieder im Code:`);
      for (const h of healed) console.log(`   • [${h.id}] ${h.symbol} → ${h.files.slice(0, 3).join(', ')}`);
    }
    if (untrackedClusters.length) {
      console.log(`🟠 ${untrackedClusters.length} untracked Duplikations-Verdacht (Stamm-Kollision):`);
      for (const c of untrackedClusters) {
        console.log(`   • ${c.stem}: ${Array.from(new Set(c.symbols.map((s) => s.name))).join(', ')}`);
      }
    }
    console.log('');
    console.log('§0 Schnitt-Regel: kein ungetrackter zweiter Weg. Konsolidieren ODER ins dup-registry eintragen.');
    return 1;
  }

  console.log('');
  console.log('✅ Keine Geheilt-Regression, kein untracked Duplikations-Verdacht.');
  return 0;
}

// Nur ausführen wenn direkt aufgerufen (nicht beim Test-Import).
// Defensive Guard: unter vitest/ESM kann `require` undefined sein → ReferenceError beim Import.
if (typeof require !== 'undefined' && require.main === module) {
  const code = main();
  if (CHECK_MODE && code !== 0) process.exit(code);
  process.exit(code === 2 ? 2 : 0);
}
