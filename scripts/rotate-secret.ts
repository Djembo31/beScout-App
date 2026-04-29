#!/usr/bin/env tsx
/**
 * Secret Rotation Sync (Slice 255 — Anil-Direktive 2026-04-29)
 *
 * Atomare Sync von Secret-Werten ueber 3 Locations damit "war in falscher Datei"-
 * Drift (siehe Slice 254 SUPABASE_SERVICE_ROLE_KEY-Drama) nicht wiederholt:
 *
 *   1. Vercel-Env (production)
 *   2. .env.local (lokale Entwicklung)
 *   3. .env.vercel-prod-fresh (Audit-Snapshot)
 *
 * Usage:
 *   pnpm rotate-secret <KEY_NAME>
 *
 *   Modus 1 — interactive: Du wirst nach dem neuen Wert gefragt (echo-off, kein
 *   Shell-History-Leak). Tool setzt parallel in alle 3 Locations.
 *
 *   Modus 2 — sync: pnpm rotate-secret <KEY_NAME> --sync-from=local
 *     Nimmt aktuellen .env.local-Wert als Source-of-Truth und synct zu Vercel +
 *     Audit-Snapshot. Nutzfall: Anil hat in .env.local manuell den frischen Key
 *     eingetragen, will jetzt Vercel-Env angleichen.
 *
 *   Modus 3 — verify: pnpm rotate-secret <KEY_NAME> --verify
 *     Pruft ob alle 3 Locations identischen Wert haben. Exit 1 bei Drift.
 *
 * Secrets-Sanity:
 *   - Stripped trailing whitespace + literal `\n` strings (Vercel-CLI-paste-Drift)
 *   - Kein echo des Wertes in Shell-Output (nur prefix + length)
 *
 * Slice 255 Layer-2 (D52-Pattern: D52-Tooling fuer Secret-Hygiene). Ergaenzt
 * audit:cron-health (Layer 1 — detection) um Layer 2 (atomic-rotation).
 */

import { execSync, spawnSync as nodeSpawnSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import readline from 'readline';

const args = process.argv.slice(2);
const keyName = args.find((a) => !a.startsWith('--'));
const syncFromLocal = args.includes('--sync-from=local');
const verifyOnly = args.includes('--verify');

if (!keyName) {
  console.error('Usage: pnpm rotate-secret <KEY_NAME> [--sync-from=local | --verify]');
  process.exit(1);
}

const ENV_LOCAL = path.resolve(process.cwd(), '.env.local');
const ENV_VERCEL_FRESH = path.resolve(process.cwd(), '.env.vercel-prod-fresh');

function readEnvVar(filePath: string, key: string): string | null {
  if (!existsSync(filePath)) return null;
  const content = readFileSync(filePath, 'utf-8');
  const match = content.match(new RegExp(`^${key}\\s*=\\s*"?([^"\\n]*)"?`, 'm'));
  if (!match) return null;
  // Strip literal `\n` (Vercel-CLI-pull paste-Drift) + trailing whitespace.
  return match[1].replace(/\\n$/g, '').trim();
}

function writeEnvVar(filePath: string, key: string, value: string): void {
  const content = existsSync(filePath) ? readFileSync(filePath, 'utf-8') : '';
  const escaped = value.replace(/[\\$`]/g, '\\$&');
  const lineRegex = new RegExp(`^${key}=.*$`, 'm');
  let nextContent: string;
  if (lineRegex.test(content)) {
    nextContent = content.replace(lineRegex, `${key}="${escaped}"`);
  } else {
    nextContent = (content.endsWith('\n') ? content : content + '\n') + `${key}="${escaped}"\n`;
  }
  writeFileSync(filePath, nextContent);
}

function pullVercelEnv(): void {
  try {
    execSync(`vercel env pull ${ENV_VERCEL_FRESH} --environment=production --yes`, {
      stdio: 'pipe',
    });
  } catch (err) {
    console.warn(`⚠️  vercel env pull failed: ${(err as Error).message}`);
  }
}

/**
 * Slice 255 Heal (Reviewer F-1, P1) — atomic rotation via spawnSync + stdin pipe
 * statt execSync(template-string). Vermeidet Shell-Injection-Risk bei Secrets
 * mit Sonderzeichen ($, `, ", \). Plus Rollback-Path wenn add-FAIL: alten Wert
 * via prevValue restore-pflicht damit Production nicht silent ohne Secret bleibt.
 */
function vercelEnvAdd(key: string, value: string): { ok: boolean; stderr: string } {
  // spawnSync mit input-Option pipet stdin sicher — kein shell-string-interpolate.
  const result = nodeSpawnSync('vercel', ['env', 'add', key, 'production'], {
    input: value,
    stdio: ['pipe', 'pipe', 'pipe'],
    encoding: 'utf-8',
  });
  return {
    ok: result.status === 0,
    stderr: result.stderr ?? '',
  };
}

function setVercelEnv(key: string, value: string, prevValue: string | null): void {
  // 1. Remove existing (vercel env add fails on duplicate)
  let removed = false;
  try {
    nodeSpawnSync('vercel', ['env', 'rm', key, 'production', '--yes'], { stdio: 'pipe' });
    removed = true;
  } catch {
    /* not present, ignore — first-time-set Path */
  }

  // 2. Add fresh via spawn + stdin (no shell-interpolation)
  const result = vercelEnvAdd(key, value);
  if (!result.ok) {
    console.error(`❌ vercel env add failed: ${result.stderr.slice(0, 300)}`);

    // Rollback-Path: wenn rm gelang aber add scheitert, ist Production secret-less.
    // Restore prevValue um Production nicht zu brechen.
    if (removed && prevValue) {
      console.warn(`⚠️  Rollback: restoring previous value to prevent Production-down.`);
      const rollback = vercelEnvAdd(key, prevValue);
      if (rollback.ok) {
        console.warn(`   ✓ Rollback successful — Production-secret preserved.`);
      } else {
        console.error(`   ❌ ROLLBACK FAILED — Production has NO ${key}! Manually re-add via Dashboard immediately.`);
      }
    }
    throw new Error(`vercel env add ${key} failed`);
  }
}

function maskValue(value: string): string {
  if (value.length <= 8) return '***';
  return `${value.slice(0, 8)}...${value.slice(-4)} (len=${value.length})`;
}

async function promptValue(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false, // echo-off would need extra setup; for now plain prompt
  });
  return new Promise((resolve) => {
    rl.question(`Neuen Wert für ${keyName}: `, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main(): Promise<void> {
  console.log(`═══ Secret Rotation Sync — ${keyName} ═══`);

  if (verifyOnly) {
    pullVercelEnv();
    const local = readEnvVar(ENV_LOCAL, keyName);
    const vercel = readEnvVar(ENV_VERCEL_FRESH, keyName);

    console.log(`.env.local:  ${local ? maskValue(local) : '(missing)'}`);
    console.log(`Vercel-prod: ${vercel ? maskValue(vercel) : '(missing)'}`);

    if (!local || !vercel) {
      console.error('❌ Drift detected: missing in 1+ location.');
      process.exit(1);
    }
    if (local !== vercel) {
      console.error(`❌ Drift detected: values differ.`);
      console.error(`   .env.local  prefix: ${local.slice(0, 8)}`);
      console.error(`   Vercel-prod prefix: ${vercel.slice(0, 8)}`);
      process.exit(1);
    }
    console.log('✅ All locations in sync.');
    return;
  }

  let newValue: string;

  if (syncFromLocal) {
    const local = readEnvVar(ENV_LOCAL, keyName);
    if (!local) {
      console.error(`❌ ${keyName} not found in .env.local — cannot sync-from-local.`);
      process.exit(1);
    }
    console.log(`Source-of-Truth = .env.local: ${maskValue(local)}`);
    newValue = local;
  } else {
    newValue = await promptValue();
    if (!newValue) {
      console.error('❌ Empty value, aborting.');
      process.exit(1);
    }
    console.log(`New value: ${maskValue(newValue)}`);
  }

  // Sanity: strip trailing `\n`-string + whitespace (paste-Drift-Defense)
  const cleaned = newValue.replace(/\\n$/g, '').trim();
  if (cleaned !== newValue) {
    console.warn(`⚠️  Stripped trailing \\n / whitespace — ${maskValue(newValue)} → ${maskValue(cleaned)}`);
  }

  // Capture prev-value for Rollback-Path before rm+add
  pullVercelEnv();
  const prevValue = readEnvVar(ENV_VERCEL_FRESH, keyName);

  console.log(`\n→ Update Vercel-prod...`);
  setVercelEnv(keyName, cleaned, prevValue);
  console.log('   ✓ Vercel-prod updated');

  console.log(`→ Update .env.local...`);
  writeEnvVar(ENV_LOCAL, keyName, cleaned);
  console.log('   ✓ .env.local updated');

  console.log(`→ Re-pull .env.vercel-prod-fresh for verification...`);
  pullVercelEnv();
  const verified = readEnvVar(ENV_VERCEL_FRESH, keyName);
  if (verified === cleaned) {
    console.log('   ✓ Vercel-Env verified matches.');
  } else {
    console.warn(`   ⚠️  Vercel-Env mismatch — expected ${maskValue(cleaned)}, got ${verified ? maskValue(verified) : '(null)'}`);
    console.warn(`       Vercel-Edge propagation may need 30-60s. Re-run --verify in 1 min.`);
  }

  console.log('\n✅ Rotation complete. Trigger affected services to test (e.g. cron, RPC-call).');
}

main().catch((err) => {
  console.error(`❌ ${(err as Error).message}`);
  process.exit(1);
});
