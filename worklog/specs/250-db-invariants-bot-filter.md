# Slice 250 — db-invariants Bot-Filter + INV-19 Whitelist-Update

**Größe:** XS
**Slice-Type:** Doc/Test (test-only)
**Datum:** 2026-04-28
**Bezug:** Slice 249 Phase B Root-Cause: 44 wallet-drifts sind Test-Bots. INV-16/INV-33 sollen Bots filtern. INV-19 Whitelist-Drift bei players_mv_history.

## 1.1 Problem-Statement

Pre-push-Hook (Slice 248 Smoke) entdeckte 3 INV-Test-Failures gegen Production-DB:
- INV-16: 44 wallets out-of-sync — **alle Test-Bots** (`handle LIKE 'bot%'`)
- INV-33: identisch (44 same Bot-Wallets)
- INV-19: `players_mv_history` hat RLS-enabled aber 0 Policies + nicht in Whitelist (Slice 197d Drift)

**Root-Cause:**
- `e2e/bots/ai/refresh-wallets.ts` (Slice 194) setzt `wallets.balance = bot.budget` ohne Transaction-Insert (designed Test-Setup)
- `players_mv_history` wurde im Slice 197d (2026-04-25) für Cron-only geadded, aber INV-19 Whitelist nicht ergänzt

**Evidenz:**
- 100% der drift-wallets haben `handle LIKE 'bot%'` (verifiziert via SQL JOIN profiles)
- `grep players_mv_history src/` → nur in `api/cron/calculate-mv-trends/route.ts` (Cron-only)
- `get_rls_policy_coverage()` zeigt 5 zero-policy tables, 4 in Whitelist, 1 NEU (`players_mv_history`)

## 1.2 Lösungs-Design

**INV-16 + INV-33:** beforeAll lädt Bot-User-IDs einmal, Tests filtern wallets-Liste.

```ts
let botUserIds: Set<string>;

beforeAll(async () => {
  // ... existing sb setup
  const { data: bots } = await sb.from('profiles').select('id').like('handle', 'bot%');
  botUserIds = new Set((bots ?? []).map(b => b.id));
});
```

In INV-16 + INV-33: vor wallets-Loop `if (botUserIds.has(wallet.user_id)) continue;`.

**INV-19:** Whitelist um `players_mv_history` erweitern.

## 1.3 Betroffene Files

- `src/lib/__tests__/db-invariants.test.ts` (3 Edits: beforeAll + INV-16 + INV-33 + INV-19)

## 1.4 Code-Reading-Liste

| File | Zweck |
|------|-------|
| `src/lib/__tests__/db-invariants.test.ts` | Source of Truth für INV-Tests |
| `e2e/bots/ai/refresh-wallets.ts` | Smoking-gun-Code |
| `e2e/bots/ai/bot-generator.ts` | Welche Handles? |

## 1.5 Pattern-References

- **Slice 248 Phase B Investigation** — Root-Cause-Method
- **D35 Self-Review** — Pattern-Wiederholung Slice 218 + 247 (Test-Mock-Repair)

## 1.6 Acceptance Criteria

```
AC-01: beforeAll lädt botUserIds (Set<string>) aus profiles WHERE handle LIKE 'bot%'
AC-02: INV-16 skipt bot-wallets explizit + console.log "skipped X bots"
AC-03: INV-33 skipt bot-wallets explizit + console.log
AC-04: INV-19 Whitelist enthält 'players_mv_history' mit Comment Slice-Bezug
AC-05: pnpm exec vitest run src/lib/__tests__/db-invariants.test.ts → exit 0 (alle 3 INV-Tests grün)
AC-06: pre-push-Hook lokal grün (CI=true skipt diese Tests sowieso, lokal jetzt grün)
```

## 1.7 Edge Cases

| Case | Verhalten |
|------|-----------|
| Bot-Tabelle leer | botUserIds = empty Set, alle wallets werden geprüft (status quo) |
| Profile-Query failed | beforeAll wirft, alle Tests fail-fast |
| Echter User mit handle "bot..." | edge-case akzeptiert (sollte nicht passieren — handles sind unique + bot-prefix nur Tests) |

## 1.8 Self-Verification Commands

```bash
# Pre-Edit Reproduktion
pnpm exec vitest run src/lib/__tests__/db-invariants.test.ts --no-coverage 2>&1 | tail -5
# erwartet: 3 failed (INV-16, INV-19, INV-33)

# Post-Edit Verify
pnpm exec vitest run src/lib/__tests__/db-invariants.test.ts --no-coverage 2>&1 | tail -5
# erwartet: 39 passed, 0 failed
```

## 1.9 Open-Questions / Autonom-Zone

**Pflicht-Klärung:** keine — XS test-only ohne CEO-Scope.

**Autonom-Zone:**
- Bot-Filter via `handle LIKE 'bot%'` (gewählt — bot-generator.ts Pattern)
- `players_mv_history` Whitelist-Comment-Format

## 1.10 Proof-Plan

- `worklog/proofs/250-db-invariants-recovery.txt` — Pre/Post Vitest-Output mit Bot-Skip-Log

## 1.11 Scope-Out

- **Bot-Wallets in separater Tabelle** → Backlog (M-Slice, post-Beta wenn nötig)
- **`refresh-wallets.ts` mit transactions-Insert** → wäre semantisch falsch (Bots sind Test-Setup, nicht Real-Trading)
- **INV-Tests in CI aktivieren** → war bewusst skipIntegration, bleibt so (Live-DB-State unzuverlässig in CI)

## 1.12 Stage-Chain

SPEC → IMPACT (skipped: test-only) → BUILD → REVIEW (self-review D35) → PROVE → LOG

## 1.13 Pre-Mortem

- **Risiko:** Bot-Filter überrahmt echte User die Handle "bot..." haben. Mitigation: bot-generator.ts hat bot-Prefix, echte User unwahrscheinlich.
- **Risiko:** INV-19 Whitelist wächst unkontrolliert. Mitigation: Comment dokumentiert Slice-Bezug, Review bei jedem Add.
