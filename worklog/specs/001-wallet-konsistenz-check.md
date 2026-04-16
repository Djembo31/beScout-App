# 001 — Wallet-Konsistenz-Check (Blocker A-04)

## Ziel
Live-DB Health-Invariante `INV-16` hinzufuegen: `wallets.balance` stimmt mit dem `balance_after` der juengsten `transactions`-Row jedes Users ueberein. Verletzung = Ledger-Drift, Geld entstanden/verschwunden.

## Naming
Existierende Invariants in `db-invariants.test.ts` reichen bis INV-15. Dieser Slice fuegt **INV-16** hinzu. (Die Spec-ID `001` bezieht sich auf den SHIP-Slice-Counter, NICHT auf die INV-Nummer.)

## Klassifizierung
- **Slice-Groesse:** S (1 Datei, klares Pattern nach INV-01/02/03)
- **Scope:** CTO-autonom — READ-ONLY Health-Check, keine Wallet-Manipulation, keine Fee-Logik, keine Business-Rule-Aenderung. Nur Test-Addition in bestehendem Invariant-Harness.
- **Referenz:** `memory/_archive/2026-04-meta-plans/walkthrough/04-blocker-a.md` (A-04), `.claude/rules/common-errors.md` (Service Error-Swallowing + RPC INSERT Column-Mismatch — beide erzeugen genau diese Drift-Klasse).

## Betroffene Files
| Pfad | Aktion | Begruendung |
|------|--------|-------------|
| `src/lib/__tests__/db-invariants.test.ts` | Edit — `INV-04` hinzufuegen | Bestehende Datei, Layer-1 Live-DB Tests. Pattern identisch zu INV-01/02/03. |

## Acceptance Criteria
1. Neuer Test `INV-16: wallets.balance matches latest transaction.balance_after per user` ist im File vorhanden.
2. Test laeuft `npx vitest run src/lib/__tests__/db-invariants.test.ts -t INV-16` gruen ODER liefert eine klar lesbare Violation-Liste (User-ID prefix + expected + actual + diff).
3. Test nutzt `SUPABASE_SERVICE_ROLE_KEY` aus `.env.local` (wie INV-01/02/03).
4. Test beruecksichtigt User **ohne** Transactions (diese sind aus dem Check ausgenommen — kein False-Positive).
5. Test-Timeout ist gesetzt (≥30s) fuer Live-DB-Latenz.
6. `npx tsc --noEmit` clean.
7. Proof-Artefakt in `worklog/proofs/001-wallet-invariant.txt` (Testausgabe).

## Edge Cases
1. **User ohne Transactions** — Balance == 1_000_000 (Welcome-Bonus-Default) aber keine Row in `transactions`. → Skippen (nicht fehlschlagen).
2. **Identische `created_at`** auf zwei Transactions desselben Users — ORDER BY `created_at DESC, id DESC` fuer deterministisches Ergebnis.
3. **Test-User / Seed-Daten** — Falls Seed-User mit inkonsistentem State existiert (historische Drift) → Verletzung wird sichtbar und ist Teil des Befunds, kein Bug im Test.
4. **NULL-Werte** — `balance` und `balance_after` sind beide `NOT NULL` laut Schema (baseline_core.sql:161, 223). Defensive Check trotzdem mit Skip bei NULL.
5. **Grosse User-Anzahl** — Query via Service-Role fetcht alle Wallets + DISTINCT-Latest-Transaction. Falls >10k Users: Pagination via Chunks von 1000 User-IDs.
6. **Realtime Race** — Zwischen `SELECT wallets` und `SELECT latest transaction` koennte eine neue Mutation laufen. Toleranz: 5s-Window, d.h. Transactions in den letzten 5s aus dem Vergleich ausschliessen.
7. **`locked_balance` ausser Scope** — Check ist nur `balance`, nicht `locked_balance`. Letzteres hat keinen Audit-Trail in `transactions` (wird separat verwaltet).
8. **Offline / Key fehlt** — `beforeAll` wirft klaren Error (bestehendes Pattern).

## Proof-Plan
- `npx vitest run src/lib/__tests__/db-invariants.test.ts -t "INV-16"` Output nach `worklog/proofs/001-wallet-invariant.txt`.
- Falls Violations: die Liste ist der Befund → neuer Folge-Slice zur Root-Cause-Analyse (ausserhalb dieses Slices).
- Falls 0 Violations: Beweis dass Wallet-Ledger-Invariante live haelt.

## Scope-Out
- **KEIN Fix** falls der Test fehlschlaegt. Verletzung → separater Slice mit eigener Spec. INV-16 zeigt nur ob Drift existiert.
- **KEIN `locked_balance`-Check.** Locked-Balance-Audit ist eigener Slice (bewusst separat, andere Domaenen: Offers + Events).
- **KEIN CI-Integration.** Aktuell `describe.skip`-Konvention fuer INV-Tests (laut `a0b8a5e`-Context — live-DB Tests sind CI-excluded). Dieser Slice fuegt nur den Test hinzu, ver-aendert die CI-Policy nicht.
- **KEIN SUM(amount)-Check.** `balance_after` ist robuster (Welcome-Bonus + manuelle Admin-Adjusts sind unterschiedlich geloggt). Ein SUM-Check waere ein Folge-Slice, falls INV-04 Drift aufdeckt.
- **KEINE Wallet-RPC-Aenderung.** Weder `adjust_user_wallet` noch irgendein Trading-RPC wird angefasst.

## Stages
- SPEC — dieses File (aktuell)
- IMPACT — **skipped (Grund: Test-Only Addition, kein Service/Queries/Migration-Pfad beruehrt. Consumer: nur der Test selbst.)**
- BUILD — `INV-16` in `db-invariants.test.ts` schreiben (am Ende vor `});`)
- PROVE — `vitest run -t INV-16` gegen Live-DB, Output nach Proofs
- LOG — Eintrag in `worklog/log.md`, ggf. Regel in `common-errors.md` falls Drift gefunden
