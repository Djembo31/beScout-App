#!/usr/bin/env node
/**
 * Slice 430 — Tracker-Drift-Guard (P5 Anti-Drift, Prozess-Elite-Optimierung).
 *
 * Verhindert das Nachwachsen der „Mega-Zeilen + Stand-Prosa dupliziert"-Krankheit
 * (Slice 430-Diagnose): der laufende „Stand" lebte 4-5× dupliziert als 4000-7500-Zeichen-
 * Einzeiler in TODO/INDEX/MASTERPLAN/handoff → Drift + Token + Edit-Friktion.
 *
 * Die Regel (workflow.md): „Laufender Fortschritt lebt an EINEM Ort (session-handoff.md).
 * Andere Tracker referenzieren ihn oder halten 1-Zeilen-Status — NIE die volle Prosa."
 *
 * Dieser Guard erzwingt den MESSBAREN Teil davon: keine Mega-Zeilen in den scannbaren
 * Trackern. Der semantische Teil (Stand-Prosa nur in handoff) bleibt Disziplin (Anil-Entscheid:
 * Disziplin + Hook statt Auto-Skript).
 *
 * WARN-only: immer exit 0 (non-blocking), damit `.husky/pre-commit` (set -e) nicht bricht.
 * Surface am richtigen Moment (Commit) statt Memory — Muster wie der TRACKER-RECONCILE-Reminder.
 *
 * Usage:
 *   node scripts/tracker-drift-check.mjs          # WARN-Report, exit 0
 *   pnpm run audit:tracker-drift
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Scannbare Tracker (sollen menschen-scannbar bleiben). decisions.md/log.md = History/ADR,
// bewusst NICHT hier (lange Einträge legitim; Archivierung = P3, separat deferred).
const TRACKERS = [
  'MASTERPLAN.md',
  'TODO.md',
  'docs/knowledge/INDEX.md',
  'memory/session-handoff.md',
];

// Mega-Zeilen-Schwelle. Normale Bullets liegen < 600 Zeichen; die Krankheit waren 4000-7500.
const MAX_LINE = 1500;

function main() {
  const offenders = [];
  for (const rel of TRACKERS) {
    const abs = resolve(PROJECT_ROOT, rel);
    if (!existsSync(abs)) continue;
    const lines = readFileSync(abs, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (line.length > MAX_LINE) {
        offenders.push({ file: rel, line: i + 1, len: line.length });
      }
    });
  }

  if (offenders.length === 0) {
    console.log(`[tracker-drift] OK — keine Mega-Zeilen > ${MAX_LINE} Zeichen in ${TRACKERS.length} Trackern.`);
    return;
  }

  console.log('');
  console.log(`[tracker-drift] ⚠️  ${offenders.length} Mega-Zeile(n) > ${MAX_LINE} Zeichen (NON-BLOCKING):`);
  for (const o of offenders) {
    console.log(`   • ${o.file}:${o.line} — ${o.len} Zeichen`);
  }
  console.log('   → Lange Append-Zeile in Bullet-Liste brechen. Laufender Stand gehört in');
  console.log('     memory/session-handoff.md (einzige Stand-Quelle), nicht 4-5× dupliziert.');
  console.log('     Regel: workflow.md „Stand-SSOT". (Prozess-Elite-Optimierung, Slice 430.)');
  console.log('');
}

main();
process.exit(0);
