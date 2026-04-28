/**
 * INV-25 — Service-Throw-Key Coverage (Slice 010, 2026-04-17)
 *
 * Static audit: every literal `throw new Error('<identifier>')` in the
 * service layer must be either (a) a member of KNOWN_KEYS in
 * `src/lib/errorMessages.ts` — so `mapErrorToKey(raw)` passes it through
 * to the `errors` i18n namespace — or (b) explicitly listed in
 * `INV25_WHITELIST` as a namespace-specific key that is handled by an
 * explicit consumer-side `msg === '<key>'` branch (e.g. fantasy-namespace
 * keys routed via `useEventActions.ts`).
 *
 * Drift-Class this guards: Service adds a new `throw new Error('newKey')`,
 * developer forgets to add `newKey` to KNOWN_KEYS or ERROR_MAP → any caller
 * using `setError(mapErrorToKey(normalizeError(err)))` silently falls to
 * `'generic'` → user sees `errors.generic` instead of the intended message.
 * (See common-errors.md: "i18n-Key-Leak via Service-Errors".)
 *
 * Scope: only service-layer files under `src/lib/services/` and
 * `src/features/*\/services/`. Consumer components and API routes are
 * out of scope — their throw-patterns are audited separately.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..', '..');

// ─────────────────────────────────────────────────────────────
// Step 1 — enumerate service files to scan
// ─────────────────────────────────────────────────────────────
function walk(dir: string, acc: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const name of entries) {
    const full = join(dir, name);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) {
      if (name === '__tests__' || name === 'node_modules') continue;
      walk(full, acc);
    } else if (st.isFile() && (name.endsWith('.ts') || name.endsWith('.tsx'))) {
      if (name.endsWith('.test.ts') || name.endsWith('.test.tsx')) continue;
      acc.push(full);
    }
  }
  return acc;
}

function collectServiceFiles(): string[] {
  const files: string[] = [];
  // src/lib/services/*
  walk(resolve(ROOT, 'src', 'lib', 'services'), files);
  // src/features/*\/services/*
  const featuresRoot = resolve(ROOT, 'src', 'features');
  let featureDirs: string[];
  try {
    featureDirs = readdirSync(featuresRoot);
  } catch {
    featureDirs = [];
  }
  for (const f of featureDirs) {
    const sub = join(featuresRoot, f, 'services');
    try {
      if (statSync(sub).isDirectory()) walk(sub, files);
    } catch {
      // feature without services/ directory — skip
    }
  }
  return files;
}

// ─────────────────────────────────────────────────────────────
// Step 2 — extract literal identifier keys from throw-new-Error calls
// ─────────────────────────────────────────────────────────────
// Matches:   throw new Error('someKey')
//            throw new Error("someKey")
//            throw new Error(`someKey`)     (pure literal only)
// Skips:     throw new Error(err.message)
//            throw new Error(`${x}`)
//            throw new Error('raw text with spaces')
const THROW_KEY_RE = /throw\s+new\s+Error\s*\(\s*(['"`])([a-zA-Z_][a-zA-Z0-9_]*)\1\s*\)/g;

function extractThrownKeys(filePath: string): Array<{ key: string; line: number }> {
  const src = readFileSync(filePath, 'utf8');
  const keys: Array<{ key: string; line: number }> = [];
  // Walk match-by-match so we can compute line numbers
  let m: RegExpExecArray | null;
  THROW_KEY_RE.lastIndex = 0;
  while ((m = THROW_KEY_RE.exec(src)) !== null) {
    const upToMatch = src.slice(0, m.index);
    const line = upToMatch.split('\n').length;
    keys.push({ key: m[2]!, line });
  }
  return keys;
}

// ─────────────────────────────────────────────────────────────
// Step 3 — whitelist for namespace-specific keys that live outside
// the `errors` i18n namespace and are resolved by explicit consumer-side
// `msg === '<key>'` branches. Each entry MUST cite the handling consumer.
// ─────────────────────────────────────────────────────────────
const INV25_WHITELIST: Record<string, string> = {
  // Slice 251 Wave 2 Track F: features/fantasy/services/wildcards.ts:78 throws
  // 'rpc_no_response' wenn supabase.rpc() data=null returnt. Consumer-Pfad:
  // useEventActions.ts catches Error.message via setError → mapErrorToKey
  // mapped es defensiv auf 'generic'. Pflicht-Backlog post-Wave-3:
  // i18n-Key `errors.rpcNoResponse` + KNOWN_KEYS-Eintrag in errorMessages.ts.
  rpc_no_response: 'wildcards.ts:78 (Wave 2 Track F — pending i18n-key + KNOWN_KEYS migration)',
  // Note: `lineup_save_failed` is *not* thrown as a pure literal (the throw
  // is `throw new Error(result.error ?? 'lineup_save_failed')` in
  // features/fantasy/services/lineups.mutations.ts:44 — expression form) so
  // the audit regex does not see it. If that ever changes to a pure literal,
  // add it back here with the consumer-resolver reference (useEventActions.ts:183).
  // Note: `insufficient_wildcards` was removed from WHITELIST 2026-04-29 (Slice
  // 251 Wave 3 fix-push) because Wave 2 Track F's wildcards-RPCs no longer
  // throw the literal — composite-PK schema returns discriminated-union
  // `{success: false, error: 'wildcard_no_balance'}` instead. Consumer-handler
  // in useEventActions.ts:394 case-statement remains as defensive fallback
  // for legacy paths but the audit-regex no longer sees a literal-throw site.
};

// ─────────────────────────────────────────────────────────────
// Test
// ─────────────────────────────────────────────────────────────
describe('INV-25: Service-Throw-Key Coverage', () => {
  it('every literal thrown identifier-key is in KNOWN_KEYS or WHITELIST', async () => {
    const { mapErrorToKey } = await import('../errorMessages');

    const files = collectServiceFiles();
    expect(files.length).toBeGreaterThan(0);

    type Finding = { file: string; line: number; key: string };
    const all: Finding[] = [];
    for (const f of files) {
      for (const { key, line } of extractThrownKeys(f)) {
        all.push({ file: f.replace(ROOT, '').replace(/\\/g, '/'), line, key });
      }
    }

    // Assertion: each extracted key either (a) resolves to itself via
    // mapErrorToKey (i.e. it's in KNOWN_KEYS — pass-through branch in
    // errorMessages.ts) or (b) is explicitly whitelisted.
    const violations: string[] = [];
    for (const { file, line, key } of all) {
      if (key in INV25_WHITELIST) continue;
      const resolved = mapErrorToKey(key);
      if (resolved !== key) {
        violations.push(
          `${file}:${line}  throws '${key}' but mapErrorToKey('${key}') → '${resolved}' (not in KNOWN_KEYS, not whitelisted)`
        );
      }
    }

    if (violations.length === 0) {
      const distinctKeys = new Set(all.map((f) => f.key));
      console.log(
        `[INV-25] ${files.length} service files scanned, ${all.length} literal throws, ${distinctKeys.size} distinct keys, ${Object.keys(INV25_WHITELIST).length} whitelisted, 0 violations`
      );
    }

    expect(violations, violations.join('\n')).toHaveLength(0);
  });

  it('every WHITELIST entry is actually thrown somewhere (no stale entries)', () => {
    const files = collectServiceFiles();
    const thrown = new Set<string>();
    for (const f of files) {
      for (const { key } of extractThrownKeys(f)) thrown.add(key);
    }

    const stale = Object.keys(INV25_WHITELIST).filter((k) => !thrown.has(k));
    expect(stale, `Stale whitelist entries (no longer thrown): ${stale.join(', ')}`).toHaveLength(0);
  });
});
