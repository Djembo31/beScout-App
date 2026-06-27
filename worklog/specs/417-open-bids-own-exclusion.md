# Slice 417 — Offers: Eigen-Gebot-Leak in "Offene Gebote" schließen (server-SSOT)

**Slice-Type:** Service + Migration (SEC-DEFINER read-filter)
**Größe:** S
**CEO-Scope:** Nein — Money-Domain (offers/escrow) aber **read-only** Filter, kein Geldfluss/keine Fee/kein Auth-Boundary-Change. CTO-Korrektheitsfix. (RPC-Body-Touch → PATCH-AUDIT Auth-Guard+ACL Pflicht.)

## 1. Problem-Statement (Evidence)
Live-Beweis aus dem e2e-Walk (`worklog/proofs/welle1-e2e-lifecycle-walk.txt` Z.38-51): jarvis' eigenes öffentliches Kaufgebot auf Douglas (den er besitzt) erscheint im Portfolio-Tab **"Offene Gebote"** als **nicht-interaktive Zeile** ("Douglas · Kaufangebot · 150 CR · 48h · Ausstehend") ohne Storno- oder Accept-Button → wirkt wie escrow-gelocktes Guthaben ohne Exit. Der Walker musste den Storno via RPC (statt UI) machen.

**Handoff-Korrektur (faktenbasiert):** Der Handoff-Befund „cancel_offer_rpc existiert, nicht verkabelt" ist **falsch**. `cancelOffer` IST verkabelt — im **"Ausgehend"-Tab** (`OffersTab.tsx:464` `onCancel` für `subTab==='outgoing'`; Button `OffersTab.tsx:173` `isSender && onCancel`). Dasselbe Gebot erscheint dort MIT funktionierendem Storno. Der echte Bug: das Gebot leckt zusätzlich in den **"Offene Gebote" (`open`)**-Tab, wo es weder annehmbar noch stornierbar ist.

**Root-Cause:** `getOpenBids({ownedByUserId})` (`src/lib/services/offers.ts:112-122`) filtert öffentliche Buy-Bids auf besessene Spieler, schließt aber **eigene** Gebote (`sender_id === ownedByUserId`) nicht aus. In `OfferCard` ergibt ein eigenes Gebot `isIncoming=false` (Accept versteckt) und der `open`-Tab liefert kein `onCancel` (Cancel versteckt) → tote Zeile. Wurzelklasse = Welle 1.6 Eigen-Ausschluss (S414/415/416): eigene Gebote gehören aus jeder „annehmbar/handelbar"-Anzeige raus, weil `accept_offer` Selbst-Annahme blockt (sender ≠ acceptor).

## 2. Lösungs-Design
**Server-SSOT statt Consumer-Band-Aid.** Eigen-Ausschluss an der Datenquelle, sodass der Server nie ein Gebot zurückgibt, das der Nutzer nicht annehmen kann:
- **Pfad 1 (sichtbarer Bug):** `getOpenBids` ergänzt `.neq('sender_id', ownedByUserId)` wenn `ownedByUserId` gesetzt.
- **Pfad 2 (server autoritativ):** RPC `get_market_user_dashboard` open_bids-Subquery ergänzt `AND sender_id <> p_user_id`. Macht den BestandView-Client-Filter (`BestandView.tsx:115 if (o.sender_id === uid) continue`) redundant — bleibt als Defense-in-Depth stehen (kein Churn, kein Risiko).
- **Pfad 3 (Player-Detail):** schon erledigt via Welle-1.6-SSOT (`excludeOwnBids`/`bestForeignBidCents`, `TradingTab`/`SellModal`/`OrderbookSummary` mit `userId`). NICHT anfassen.

Der `playerId`-Pfad (`getOpenBids({playerId})`, kein `ownedByUserId`) bleibt unverändert — Eigen-Ausschluss dort macht die Welle-1.6-Client-SSOT (Player-Detail).

## 3. Betroffene Files
| File | Änderung | Begründung |
|------|----------|-----------|
| `src/lib/services/offers.ts` | `getOpenBids`: `.neq('sender_id', ownedByUserId)` im `if (ownedByUserId)`-Zweig | Pfad 1 — sichtbarer Bug |
| `supabase/migrations/<ts>_open_bids_exclude_own.sql` | `get_market_user_dashboard` CREATE OR REPLACE, open_bids-Subquery `AND sender_id <> p_user_id` | Pfad 2 — server-SSOT |
| `src/lib/services/__tests__/offers.test.ts` | Test: `.neq('sender_id', uid)` aufgerufen bei `ownedByUserId`; NICHT bei `playerId`-Pfad | Regression-Guard |

## 4. Code-Reading-Liste (VOR Implementation) — erledigt
1. `src/lib/services/offers.ts:92-126` (`getOpenBids`) — Query-Aufbau, `ownedByUserId`-Zweig. ✅ kein sender_id-Filter.
2. `src/features/market/components/portfolio/OffersTab.tsx:59-189,455-466` — OfferCard-Render-Logik + Handler-Verkabelung. ✅ `onCancel` nur `outgoing`; eigenes Gebot im `open`-Tab = tote Zeile.
3. `src/features/market/components/portfolio/useOffersState.ts:60-78` — `open`-Tab ruft `getOpenBids({ownedByUserId})`. ✅
4. **Live-RPC** `get_market_user_dashboard` via `pg_get_functiondef` (D87) — ✅ open_bids-Subquery ohne sender_id-Ausschluss; auth.uid()-Guard vorhanden.
5. `src/features/market/components/portfolio/BestandView.tsx:104-119` — Consumer von dashboard.open_bids. ✅ filtert eigene Bids bereits (Z.115).
6. `src/components/player/detail/TradingTab.tsx:132,148` + `SellModal.tsx:55` — Player-Detail nutzt Welle-1.6-SSOT. ✅ erledigt.
7. `src/lib/services/__tests__/offers.test.ts:107-138` — bestehende getOpenBids-Tests + Mock-Pattern. ✅

## 5. Pattern-References
- **S414/415/416** (errors-frontend, trading.md S7-303 F-1): Eigen-Ausschluss „von-allem-N"; eigene Gebote aus jeder Nachfrage-/Annehmbar-Anzeige (`accept_offer` blockt Selbst-Annahme).
- **D111 Ursache #1** (Teil-Konsolidierung): „eine Quelle" durchsetzen statt Band-Aid an N Consumern → daher server-seitig.
- **database.md** Migration-Workflow: `mcp__supabase__apply_migration`, NIE `db push`.
- **S368c / AR-44**: CREATE OR REPLACE auf existierende Funktion ERHÄLT ACL; trotzdem `proacl`-Verify post-apply.

## 6. Acceptance Criteria (executable)
- **AC-1** [HAPPY] `getOpenBids({ownedByUserId})` ruft `.neq('sender_id', <uid>)`. VERIFY: vitest Mock-Assert. FAIL-IF: neq nicht aufgerufen.
- **AC-2** [GUARD] `getOpenBids({playerId})` (ohne ownedByUserId) ruft `.neq('sender_id',…)` NICHT. VERIFY: vitest. FAIL-IF: neq aufgerufen (würde Player-Detail-SSOT doppeln/stören).
- **AC-3** [DB] RPC open_bids enthält für einen Test-User KEINE Row mit `sender_id = p_user_id`. VERIFY: Live-SQL gegen RPC mit geseedetem Eigen-Gebot auf besessenem Spieler → `jsonb_path_query(open_bids, '$[*].sender_id')` enthält p_user_id nicht.
- **AC-4** [PATCH-AUDIT] auth.uid()-Guard (`auth_uid_mismatch`) + ACL unverändert nach Replace. VERIFY: `pg_get_functiondef ILIKE '%auth_uid_mismatch%'` + `proacl::text` Vorher==Nachher.
- **AC-5** [LIVE-UI] Nach Deploy: jarvis erstellt öffentliches Kaufgebot auf besessenen Spieler → erscheint NICHT in "Offene Gebote", aber in "Ausgehend" MIT Storno-Button; Storno via UI funktioniert (balance refund). VERIFY: Playwright bescout.net.
- **AC-6** tsc 0 + voller offers-Test grün.

## 7. Edge Cases
| Case | Erwartung |
|------|-----------|
| ownedByUserId gesetzt, User hat 0 Holdings | früher Return `[]` (Z.109), neq nie erreicht — ok |
| ownedByUserId gesetzt, nur fremde Bids | unverändert alle zurück |
| ownedByUserId gesetzt, nur eigenes Bid | leere Liste → "Keine offenen Gebote"-Empty-State |
| playerId-Pfad (Player-Detail) | KEIN server-Eigen-Ausschluss (Client-SSOT macht's) |
| sender_id NULL | unmöglich bei buy-offer (sender = Bieter, NOT NULL) — neq safe |
| Dashboard-RPC, User ohne Holdings | `array_length … > 0`-Guard → `[]`, Subquery nie erreicht |

## 8. Self-Verification Commands
- `npx vitest run src/lib/services/__tests__/offers.test.ts`
- `npx tsc --noEmit`
- Live-SQL: RPC mit geseedetem Eigen-Gebot → open_bids ohne eigene sender_id (BEGIN…ROLLBACK).
- `pg_get_functiondef('public.get_market_user_dashboard(uuid)'::regprocedure)` post-apply: auth-guard + `sender_id <> p_user_id` präsent.
- `SELECT proacl::text FROM pg_proc WHERE proname='get_market_user_dashboard'` vorher==nachher.

## 9. Open-Questions
- **Autonom (CTO):** Filter-Platzierung, Test-Form, RPC-Body-Touch. Entschieden.
- **CEO-Zone:** keine — kein Geldfluss/Fee/Scope-Change. Falls Reviewer Money-Boundary sieht → eskalieren.

## 10. Proof-Plan
- `worklog/proofs/417-offers-tests.txt` — vitest offers + tsc.
- `worklog/proofs/417-rpc-verify.txt` — Live-SQL: RPC open_bids ohne Eigen-Gebot (force-rollback Seed) + PATCH-AUDIT (auth-guard + proacl vorher/nachher).
- `worklog/proofs/417-live-ui.png/.txt` — Playwright: Gebot fehlt in "Offene Gebote", da in "Ausgehend" mit Storno, Storno-Erfolg.
- **Kein Zero-Sum nötig** — read-only Filter, keine Geld-Bewegung (explizit dokumentiert).

## 11. Scope-Out
- KEIN neuer Storno-Button im "Offene Gebote"-Tab (semantisch falsch — Tab = fremde Gebote annehmen; Storno lebt korrekt in "Ausgehend").
- BestandView-Client-Filter (Z.115) NICHT entfernen (harmlose Defense-in-Depth, Churn-Vermeidung).
- `getOpenBids({playerId})`/Player-Detail unverändert (Welle-1.6-SSOT erledigt).
- Keine Tab-Umbenennung/IA-Änderung.

## 12. Stage-Chain (geplant)
SPEC → IMPACT (inline, §3) → BUILD (service+migration+test) → REVIEW (reviewer-Agent, Money-Domain Pflicht) → PROVE (vitest+RPC-SQL+Playwright) → LOG.

## 13. Pre-Mortem (S — kurz)
1. `.neq` auf Mock-Chain nicht erfasst → Test-Mock muss `.neq` als chainable führen (Mock prüfen).
2. RPC-Replace revertiert stillen Patch → PATCH-AUDIT gegen Live-Baseline (D87), nicht alte Datei.
3. ACL-Drift bei Replace → `proacl`-Verify (S368c: Replace erhält ACL, trotzdem prüfen).
4. Player-Detail-Pfad versehentlich mitgefiltert → AC-2 guard (neq NICHT bei playerId).
5. Eigen-Gebot erscheint weiter, weil falscher Tab gefixt → AC-5 live beide Tabs prüfen.
