# Slice 403 — Welle 1.2: `buy_from_ipo` Idempotency-Key (Doppelkauf-Schutz Erstverkauf)

**Status:** SPEC · **Größe:** S · **Slice-Type:** Migration (+ Service + Hook Verkabelung) · **Scope:** CEO-approved (Welle-1-Mandat; additive Doppelkauf-Schutz, KEINE Fee-/Economics-Änderung, Money byte-identisch) · **Datum:** 2026-06-26

> Erster Slice von **Welle 1 — Trading & Kaufprozess** (Mock→Pro, D111). Audit-Item: `mock2pro-plan.md` 1.2 [CRITICAL, Money] + `mock2pro-audit.md` Domäne 1, CRITICAL „`buy_from_ipo` kein `idempotency_key`".

---

## 1. Problem Statement

`buy_from_ipo` (Erstverkauf-Kauf-RPC) hat **als einziger der drei Kauf-RPCs keinen `idempotency_key`**. Live-`pg_get_functiondef` (2026-06-26) bestätigt: nur `pg_advisory_xact_lock(hashtext(uid||ipo_id))`. Der Advisory-Lock **serialisiert** gleichzeitige Calls, **dedupliziert aber nicht**: zwei sequenzielle Klicks oder ein Client-Retry nach Netzwerk-Timeout (wo der erste Call real durchlief) erzeugen je einen **vollen, separaten Kauf** — doppelte Abbuchung, doppelte Holdings, doppelter Club-/PBT-/Topf-Fluss.

**Verschärfend (Verkabelungs-Loch, selbst verifiziert):** Beide IPO-Buy-Hooks reichen den Key nicht durch — `features/market/mutations/trading.ts:114 useBuyFromIpo` nutzt sogar das **nicht-idempotente** `useSafeMutation` (generiert gar keinen Key), während der Schwester-Order-Kauf `useSafeIdempotentMutation` nutzt. Selbst wo ein Key generiert würde, nimmt `buyFromIpo()` ihn nicht entgegen. Der Idempotenz-Apparat endet vor der RPC.

**Betroffen:** jeder Erstverkauf-Käufer bei Doppelklick / Mobil-Reconnect / langsamem Netz. Money-kritisch (Erstverkauf = 85% Club-Share). Häufigkeit: latent, aber im Money-Path = CRITICAL.

## 2. Lösungs-Design (Architektur)

**Eine Quelle, ein Muster.** `buy_from_ipo` bekommt exakt den etablierten Money-RPC-Idempotency-Blueprint der beiden Geschwister (`buy_player_sc`/`buy_from_order`), kein neues Design.

**RPC-Signatur (neu):**
```sql
buy_from_ipo(p_user_id uuid, p_ipo_id uuid, p_quantity integer, p_idempotency_key text DEFAULT NULL) RETURNS json
```
Da die Signatur sich ändert (3→4 Args), ist es **kein `CREATE OR REPLACE`** sondern **`DROP FUNCTION buy_from_ipo(uuid,uuid,integer)` + `CREATE`** — sonst entsteht eine **Überladung** (beide Versionen koexistieren → PostgREST-Ambiguität). Live verifiziert: `buy_from_ipo` existiert NUR als 3-Arg; die Geschwister existieren NUR als 4-Arg (alte 3-Arg sauber gedroppt) → DROP+CREATE ist der bewiesene Pfad.

**Body-Injektion (5-Block-Blueprint, gespiegelt von `buy_from_order`):**
1. DECLARE `v_result JSON; v_dedup_new BOOLEAN; v_dedup_cached JSONB;`.
2. Nach `auth.uid()`-Guard: frühen Mengen-Guard `IF p_quantity IS NULL OR p_quantity < 1 THEN RETURN 'Ungültige Menge.'` (damit kein Dedup-Key auf Garbage verbrannt wird — spiegelt Geschwister; der spätere dupliz. `IF p_quantity < 1` entfällt), dann der Reserve-Block via `check_or_reserve_dedup_key(p_user_id, p_idempotency_key, 300)` (not-new → cached-replay ODER `idempotency_pending`). **VOR** dem `pg_advisory_xact_lock`.
3. Body unverändert (alle Status-/Limit-Checks, Money-Math, Inserts byte-identisch).
4. Erfolgs-JSON in `v_result` assemblen (statt direkt `RETURN`).
5. Completion: `IF p_idempotency_key IS NOT NULL THEN UPDATE request_dedup_keys SET response=v_result::JSONB, status='completed' WHERE user_id=p_user_id AND dedup_key=p_idempotency_key; END IF; RETURN v_result;`.

**AR-44-Block (Pflicht bei DROP+CREATE = neue Funktion):**
```sql
REVOKE EXECUTE ON FUNCTION public.buy_from_ipo(uuid,uuid,integer,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.buy_from_ipo(uuid,uuid,integer,text) FROM anon;
GRANT  EXECUTE ON FUNCTION public.buy_from_ipo(uuid,uuid,integer,text) TO authenticated, service_role;
```
(Live-Grants vor Change = `authenticated`+`service_role`, **kein** anon/PUBLIC → exakt wiederherstellen.)

**Service+Hook-Verkabelung (sonst Build-without-Wire, D53):**
- `ipo.ts buyFromIpo(userId, ipoId, quantity, playerId?, idempotencyKey?)` → `p_idempotency_key: idempotencyKey ?? null`.
- `features/market/mutations/trading.ts useBuyFromIpo`: `useSafeMutation` → **`useSafeIdempotentMutation`** (namespace `'market.ipoBuy'`), Key in `buyFromIpo` durchreichen. Optimistic/Invalidation-Logik unverändert.
- `components/player/detail/hooks/usePlayerTrading.ts` IPO-Pfad: Key in `buyFromIpo` durchreichen (Hook ist bereits `useSafeIdempotentMutation 'player.buy'`).

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `supabase/migrations/20260626XXXXXX_buy_from_ipo_idempotency.sql` | NEU | DROP+CREATE 4-Arg-RPC + AR-44 |
| `src/lib/services/ipo.ts` | EDIT | `idempotencyKey?`-Param + `p_idempotency_key` durchreichen |
| `src/features/market/mutations/trading.ts` | EDIT | `useBuyFromIpo` → idempotente Mutation, Key threaden |
| `src/components/player/detail/hooks/usePlayerTrading.ts` | EDIT | IPO-Pfad: Key in `buyFromIpo` threaden |
| `src/lib/services/__tests__/ipo.test.ts` | EDIT | `toHaveBeenCalledWith('buy_from_ipo', {…, p_idempotency_key})` |
| `src/features/market/mutations/__tests__/trading.test.ts` | EDIT | `buyFromIpoMock`-Args + idempotente-Hook-Erwartung |
| `src/components/player/detail/hooks/__tests__/usePlayerTrading.test.ts` | EDIT | `buyFromIpoMock`-Args |

**Greppt:** `grep -rn "buyFromIpo" src/` (Service + 2 Hooks + Tests) · `grep -rn "buy_from_ipo" .` (Bot-Caller `e2e/bots/ai/actions.ts:150` ruft RPC mit 3 Named-Args direkt → bleibt valide via DEFAULT NULL, **kein Change**).

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| Live `pg_get_functiondef('public.buy_from_ipo(uuid,uuid,integer)')` | DB-Wahrheit (D87) | ✅ gelesen — kein idempotency_key, advisory-lock-only |
| Live `pg_get_functiondef('public.buy_from_order(...)')` | Blueprint-Vorlage | ✅ gelesen — 5-Block-Muster, Reserve VOR advisory lock |
| Live `pg_get_functiondef('public.check_or_reserve_dedup_key')` | Helfer-Semantik | ✅ INSERT-ON-CONFLICT, is_new/response, TTL 300 |
| `src/lib/hooks/useSafeIdempotentMutation.ts` | Key-Lifecycle | ✅ `mutationFn(vars, key)`; onSuccess/onError reset keyRef |
| `src/features/market/mutations/trading.ts` (54-174) | Order- vs IPO-Hook-Divergenz | ✅ `useBuyFromMarket` idempotent, `useBuyFromIpo` NICHT |
| `src/lib/services/ipo.ts` (102-166) | Service-Call-Site | ✅ aktuell 3 RPC-Params, fire-and-forget Nebenwirkungen |
| `.claude/rules/errors-db.md` „Money-RPC Idempotency-Blueprint (S178a-f)" | Falle/Muster | 5-Block + AR-44-Renew |
| `.claude/rules/database.md` AR-44 + „CREATE FUNCTION ohne REVOKE" | Grant-Falle | DROP+CREATE = neue Fn → PUBLIC-Default → REVOKE/GRANT Pflicht |

## 5. Pattern-References

- `errors-db.md` „Money-RPC Idempotency-Blueprint (S178a-f)" — exaktes 5-Block-Muster, das ich spiegele.
- `database.md` „Migration-Template-Pflichten (AR-44)" — DROP+CREATE = neue Funktion → REVOKE PUBLIC/anon + GRANT authenticated/service_role.
- `errors-db.md` „CREATE OR REPLACE FUNCTION — PATCH-AUDIT PFLICHT (S156)" + „Same-Day-Migration mit FRÜHEREM Timestamp (S326)" — Baseline = Live-Body; Migrations-Timestamp > Vorgänger.
- `errors-frontend.md` „React setState Race / useSafeIdempotentMutation (S149-151)" — Money-Path-Mutation = idempotente Variante Pflicht.
- `trading.md` Fee-Split IPO (85/10/5) — Money-Konstanten, die im PATCH-AUDIT byte-identisch bleiben MÜSSEN.

## 6. Acceptance Criteria

```
AC-01: [HAPPY] Einfacher IPO-Kauf mit Key funktioniert unverändert.
  VERIFY: force-rollback DO-Block: SELECT buy_from_ipo(uid, ipo, 2, 'k-happy');
  EXPECTED: success:true, total_cost/holdings/club_share/platform_share wie ohne Key.
  FAIL IF: success:false ODER Money-Felder weichen vom Baseline-Lauf (key=NULL) ab.

AC-02: [CONCURRENT/REPLAY] Doppelkauf-Schutz greift.
  VERIFY: zweimal buy_from_ipo(uid, ipo, 2, 'k-dup') in derselben Session.
  EXPECTED: 1. Call success:true; 2. Call = identische gecachte Response (kein 2. trade/holding/transaction); ipos.sold +2 (nicht +4).
  FAIL IF: 2. Call erzeugt zweite trades-/transactions-Row ODER Wallet 2× belastet.

AC-03: [NULL] Ohne Key = altes Verhalten (Bots/Legacy).
  VERIFY: buy_from_ipo(uid, ipo, 1)  (3-arg via DEFAULT NULL)
  EXPECTED: success:true, kein request_dedup_keys-Row angelegt.
  FAIL IF: Fehler „function does not exist" ODER Overload-Ambiguität.

AC-04: [REGRESSION/MONEY] Money byte-identisch.
  VERIFY: PATCH-AUDIT — pg_get_functiondef neu vs. Baseline: Fee-Math (`ipo_club_bps,8500`/`ipo_platform_bps,1000`), book_platform_treasury('credit','ipo',…), pbt-Insert, clubs-UPDATE alle unverändert.
  EXPECTED: nur Idempotency-Zeilen + Signatur + v_result-Indirektion sind neu.
  FAIL IF: irgendeine Money-Konstante/-Zeile gedrifted.

AC-05: [SECURITY] AR-44 Grants korrekt.
  VERIFY: SELECT proacl FROM pg_proc WHERE proname='buy_from_ipo';
  EXPECTED: {authenticated=EXECUTE, service_role=EXECUTE}, KEIN anon, KEIN PUBLIC.
  FAIL IF: anon/PUBLIC in proacl.

AC-06: [ZERO-SUM] Geld-Erhaltung über Kauf.
  VERIFY: force-rollback: SUM(wallets.balance)+clubs.treasury+pbt+topf vor==nach (1 Kauf).
  EXPECTED: diff = 0 (Käufer −cost = Club+PBT+Platform-Sinks).
  FAIL IF: diff != 0.

AC-07: [I18N/UI] Idempotency-pending-Pfad bricht UI nicht.
  VERIFY: tsc + vitest grün; `idempotency_pending` ist bereits in errorMessages KNOWN_KEYS (S178)? sonst Scope-Out-Notiz.
  EXPECTED: tsc 0, alle 3 betroffenen Test-Files grün.
  FAIL IF: tsc-Fehler ODER roter Test.
```

## 7. Edge Cases Table

| # | Flow | Case | Input/State | Expected | Mitigation |
|---|------|------|-------------|----------|------------|
| 1 | Reserve | Key=NULL | Bot/Legacy-Call | kein Dedup, normaler Kauf | `IF p_idempotency_key IS NOT NULL` Guard |
| 2 | Replay | Erster Call noch in-flight (gleicher Key, concurrent) | 2. INSERT blockt → DO NOTHING → response NULL | `idempotency_pending` zurück | Blueprint-Verhalten (Geschwister-identisch) |
| 3 | Replay nach Erfolg | Key existiert, response gesetzt | gecachte Success-JSON | kein 2. Kauf | Completion-UPDATE setzt response |
| 4 | Replay nach Fehler | Erster Call gab Fehler (z.B. IPO beendet) | Key reserviert, response NULL, 300s | `idempotency_pending` bis TTL | Geschwister-Verhalten; Client mintet pro Versuch neuen Key (kein Reuse) |
| 5 | Garbage-Menge | p_quantity<1 + Key | früher Mengen-Guard VOR Reserve | `Ungültige Menge.`, kein Key verbrannt | Early-Guard vor Reserve-Block |
| 6 | Overload | DROP vergessen | 2 Funktionen koexistieren | — (Pre-Mortem) | Migration droppt 3-Arg explizit; AC-03 verifiziert |
| 7 | Grant-Default | DROP+CREATE ohne REVOKE | anon bekommt EXECUTE | — (Pre-Mortem) | AR-44-Block + AC-05 |

## 8. Self-Verification Commands

```bash
npx tsc --noEmit
CI=true npx vitest run src/lib/services/__tests__/ipo.test.ts \
  src/features/market/mutations/__tests__/trading.test.ts \
  src/components/player/detail/hooks/__tests__/usePlayerTrading.test.ts
grep -rn "buyFromIpo" src/   # Service + 2 Hooks threaden Key
```
Money-Path (via Supabase-MCP, force-rollback `BEGIN…DO…RAISE`):
- `pg_get_functiondef('public.buy_from_ipo(uuid,uuid,integer,text)'::regprocedure)` — 5-Block + Fee-Konstanten unverändert (PATCH-AUDIT).
- `SELECT proname, pg_get_function_identity_arguments(oid), proacl FROM pg_proc WHERE proname='buy_from_ipo'` — genau 1 Signatur (4-Arg), Grants ohne anon/PUBLIC.
- Zero-Sum + Doppelkauf-Replay-Smoke (AC-02/AC-06) als `BEGIN; PERFORM set_config('request.jwt.claim.sub',…); … RAISE EXCEPTION 'REPORT >>> %'` → Rollback, Ergebnis im Fehlertext, null Persistenz.

## 9. Open-Questions

**Pflicht-Klärung:** keine — Blueprint ist eindeutig, Geschwister sind die Vorlage, Money bleibt byte-identisch. Reserve-bei-Fehler-Verhalten (Edge 4) wird **bewusst** geschwister-identisch übernommen (Konsistenz = Welle-1-Ziel), NICHT neu erfunden.

**Autonom-Zone:** Migrations-Dateiname/Timestamp, Hook-Namespace-String (`market.ipoBuy`), Test-Assertion-Detail.

**Nicht-Autonom (bereits geklärt):** Money-Math unverändert (kein neuer Fee/Cap); keine RLS-Änderung; AR-44-Grants exakt wie Bestand. Slice ist CEO-approved via Welle-1-Mandat (additive Safety, keine Economics-Änderung).

## 10. Proof-Plan

| Change-Typ | Proof |
|------------|-------|
| RPC (Money) | force-rollback Money-Smoke-Output (AC-01/02/06) als `worklog/proofs/403-money-smoke.txt` |
| Security | `proacl`-Listing (AC-05) im selben Proof-File |
| Service/Hook | `CI=true vitest run` der 3 Test-Files als `worklog/proofs/403-vitest.txt` |
| Regression | PATCH-AUDIT-Diff (Baseline-Body vs. neu) im Proof-File |

## 11. Scope-Out

- **1.1 Kauf-UI-Konsolidierung** (was-du-siehst=was-du-zahlst, `BuyConfirmModal`/`BuyModal` zusammenführen) → eigener Welle-1-Slice (groß, UI).
- **1.3 Club-Geld-Doppelschreibung** (direktes `UPDATE clubs.treasury_balance_cents` + Trigger; IPO-85%-Share-Label) → eigener Welle-1-Slice (erst verifizieren: Legacy-Drift vs. echte Doppelzählung). **In diesem Slice NICHT angefasst** — der direkte `UPDATE clubs` bleibt byte-identisch.
- **1.5 „BSD"→„Credits" in Fehlertexten** (`buy_from_ipo` sagt „Nicht genug BSD.") → Wording-Cluster-Slice. Hier NICHT geändert (Money byte-identisch halten).
- **p_quantity>300-Cap** (buy_player_sc hat ihn, IPO nicht) → 1.5-Konsistenz, hier raus.

## 12. Stage-Chain (geplant)

```
SPEC → IMPACT (skipped: Consumer = Service + 2 Hooks + 3 Tests, in Spec vollständig gegreppt; kein Cross-Domain) → BUILD → REVIEW (reviewer-Agent PFLICHT, Money) → PROVE (force-rollback Money-Smoke + vitest) → LOG
```

## 13. Pre-Mortem

| # | Failure | Prob | Impact | Mitigation | Detection |
|---|---------|------|--------|------------|-----------|
| 1 | DROP vergessen → 3-Arg + 4-Arg koexistieren → PostgREST ruft falsche/ambige | MED | hoch | Migration `DROP FUNCTION IF EXISTS …(uuid,uuid,integer)` explizit | AC-03 + `pg_proc`-Signatur-Count=1 |
| 2 | Grants nach DROP+CREATE auf PUBLIC-Default → anon-Exploit | MED | hoch (Money-RPC) | AR-44-Block | AC-05 `proacl` |
| 3 | Money-Konstante beim Body-Rewrite gedrifted (S156-Klasse) | LOW | hoch | Body aus Live-Baseline kopiert, nur Idempotency injiziert | AC-04 PATCH-AUDIT |
| 4 | Hook reicht Key nicht durch → RPC geschützt, Client nutzt es nie (Build-without-Wire) | MED | mittel | beide Hooks im Scope, threaden Key; Test asserted Args | AC-07 + `grep buyFromIpo` |
| 5 | Bot-Caller (3-arg direct rpc) bricht | LOW | mittel | DEFAULT NULL hält 3-arg valide; kein Bot-Change | AC-03 + tsc |
| 6 | `idempotency_pending` fehlt in errorMessages KNOWN_KEYS → generischer Toast statt „wird verarbeitet" | LOW | niedrig | prüfen; falls fehlt → Scope-Out-Notiz (S393-Klasse, eigener Mini-Fix) | AC-07 |

---

## Compliance-Check

- $SCOUT/Investment-Wording: nicht berührt (keine neuen user-facing Strings).
- IPO-Begriff user-facing: nicht berührt (Erstverkauf-Labels unverändert).
- „BSD"-Fehlertext bleibt vorerst (Scope-Out 1.5) — Money byte-identisch hat Vorrang, kein Wording-Drift NEU eingeführt.
- Money byte-identisch = AC-04/AC-06.

## Open Risiko

Größtes Risiko = Postgres-Overload-Falle (Pre-Mortem 1/2). Mitigation: DROP+CREATE+AR-44 explizit, durch AC-03/AC-05 abgesichert. Restrisiko niedrig — etablierter Blueprint, zwei Live-Geschwister als Vorlage, force-rollback beweist Money-Neutralität ohne Persistenz.
