# Review — Slice 464 (D-37: SOLE-gate top_role-RPCs → platform_admins)

**Reviewer:** Cold-Context-Agent (§3 Money, streng) · **Datum:** 2026-06-30 · **time-spent:** ~18 min

## Verdict: PASS

## Findings (alle INFO, non-blocking)

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | INFO (nit) | migration grant_founding_pass | `FROM platform_admins` unqualifiziert vs `public.platform_admins` in den anderen 2. Funktional identisch (Body war schon immer unqualifiziert profiles/wallets/transactions; kein SET search_path — separates W0-Item function_search_path_mutable). | Optional harmonisieren; KEIN re-apply für Kosmetik (search_path-Härtung = eigener W0-Sweep über 87 Fns). |
| 2 | INFO | proof | INV-31 nicht re-runt. → **ERLEDIGT** post-review: `total_needs_fix=0`, the_three classified strict_guard/other_auth_use, kein neuer no_guard. |
| 3 | INFO (pre-existing, NICHT Slice) | grant_founding_pass Kill-Switch | SUM vor INSERT ohne Lock = theoretischer Concurrency-Overshoot. **Byte-identisch zur Baseline**, nicht von 464 eingeführt. Money-Body-Change = CEO-Scope. | Nur protokolliert (Backlog-Kandidat, eigener Slice falls relevant). |

## One-Line
Ja — ein Senior merged das: chirurgischer permissive-only Guard-Swap, Money-Bodies byte-verifiziert gegen Live-Baseline, Kill-Switch intakt, Proof mit echtem Mint-Rollback. Nur kosmetische Nitpicks.

## Belege (PATCH-AUDIT byte-Diff)
- **grant_founding_pass** (vs slice_316): `v_admin_role` DECLARE entfernt; Guard top_role→platform_admins (Error-String wortgleich); Schritte 2-9 byte-identisch (CASE-Tiers 250000/1000000/3500000/10000000, Preis-Val, Kill-Switch 90000000, founding_pass-INSERT, wallet-UPSERT, transactions-INSERT, Return). Einzeilig gerenderte Signatur = aus live functiondef abgeleitet (D87).
- **admin_grant_wildcards** (vs slice_251): `v_role` DECLARE entfernt; **Spoof-Guard erhalten** (auth_uid_mismatch byte-true); top_role→platform_admins (admin_role_required + ERRCODE erhalten); user_wildcards-UPSERT + wildcard_transactions byte-identisch.
- **cancel_event_entries** (vs unified_event_payment): EXISTS-Swap, `{ok:false,error:'unauthorized'}` + Delegation an rpc_cancel_event_entries byte-true.
- **Guard:** platform_admins kanonisch (S462), = UI-Quelle isPlatformAdmin → Reverse-S347 geschlossen. Permissiv-only (alter top_role-Guard 0-Match=100% reject; service_role unverändert reject). Empirisch durch AC-03-Mint bewiesen.
- **Grants:** alle 3 REVOKE PUBLIC,anon + GRANT authenticated, Signaturen korrekt. service_role unberührt. Timestamp 20260630 > Vorgänger (S326-greenfield ok).
- **Money-Sicherheit:** kein neuer Flow, gleiche Mint-Logik nur für Platform-Admins; Kill-Switch unangetastet; Nicht-Platform-Admin kann nirgends minten.
- **INV-31 (post-review):** total_needs_fix=0, kein Guard verloren.

## Positive
- Live-functiondef-Baseline (D87) statt alter Datei → S156/S343-Falle vermieden.
- Spoof-Guard als Edge #3 markiert + im Anker mitverifiziert.
- Voller Money-Mint im force-rollback (nicht nur Guard-Past) = End-to-End-Beweis ohne Persistenz.
- Permissive-only-Argument wasserdicht (RPCs lehnten vorher JEDEN ab) → Money-Change risikofrei.

## Learnings
- D-37 (die 3 SOLE-gate-RPCs) geheilt → errors-db S463 markieren. SOLE-gate-Swap = reiner permissive-only-Move; Beweis = 3-Rollen + Mint-Rollback + PATCH-AUDIT-Anker.
- INV-31 als billiger Zusatz-Anker bei Guard-only-SECDEF-Swaps (maschinell „kein Guard verloren").
