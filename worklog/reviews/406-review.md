# Review — Slice 406 (Club-Treasury Single-Source-of-Truth)

**Reviewer:** Cold-Context reviewer-Agent · 2026-06-27 · time-spent ~9 min
**Verdict: PASS**

## Findings
| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| N1 | NIT | proof:48 vs spec AC-8 | Proof zeigt `proacl={postgres,authenticated,service_role}`, Spec schrieb `{authenticated,service_role}`. `postgres`=Owner normal, kein anon → kein Defekt, Wording. | (nicht geheilt — kosmetisch, Owner ist erwartbar) |
| N2 | NIT | proof AC-5 | Roh-`prosrc ILIKE`=4 = die 4 Slice-406-Doku-Kommentare (nennen den Spaltennamen). Funktional 0 Reader/Writer (`non_comment_refs=0`). | (nicht geheilt — Proof erklärt es; Kommentare bewusst behalten = Anti-Confusion-Doku) |

## One-Line
Ja — Senior merged das: chirurgische, geldneutrale Counter-Entfernung, byte-identische Money-Pfade, sauberes `DROP COLUMN IF EXISTS`, 3× Zero-Sum-Beweis.

## Belege (Kurz)
1. **PATCH-AUDIT (S156/S356):** alle 4 Bodies geprüft — Guards (`auth_uid_mismatch` 4/4), Idempotency-5-Block (3/4, accept_offer korrekt ohne), `book_platform_treasury`-Sources (`trading`/`p2p`/`ipo` erhalten), `credit_pbt`/pbt-Inserts intakt, Fee-Konstanten unverändert (600/150/100, 200/50/50, 8500/1000). Nur der Counter-Block entfernt, Position konsistent. Kein Silent-Revert.
2. **Geldneutral:** jede RPC INSERTet weiter trades-Row mit club_fee (buy_from_ipo: club_fee=v_club_share 85%) → Trigger bucht Ledger. Kein Pfad buchte Club-Anteil NUR über Counter. Live AC-1/AC-3 diff=0.
3. **DROP-Sicherheit:** `IF EXISTS` ✓, RPCs zuerst dann DROP ✓, kein CASCADE (0 Dependency), greenfield-tauglich.
4. **ACL (S368c):** unveränderte Signaturen → ACL erhalten, kein anon.
5. **Scope-Smell (IPO-Share als type='trade_fee'):** bewusst Scope-Out, geldneutral, eigener Mini-Slice — korrekt, kein Blocker.

## Knowledge (Reviewer-Vorschlag, low-prio)
Bestätigter „write-only Orphan Counter neben kanonischem Ledger" = Instanz der „von allem zwei"-Drift-Klasse (errors-db.md Money-Drift) → kurzes Beispiel ergänzen.
