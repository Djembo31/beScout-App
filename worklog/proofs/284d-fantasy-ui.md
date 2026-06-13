# Proof Slice 284d (2026-06-13)

## Build
- tsc --noEmit → 0 · vitest fantasy+components+manager grün (fixtures.test 52/52, +FANT-08-Test umgedreht auf neues Lock-Verhalten)

## AC-02 FANT-09 RPC (DB-verifiziert)
```
rpc_get_recent_player_minutes(): 22360 slots / 4472 players = 5.00 je Spieler, newest-first
sample: GW33/32/31 minutes=0 (DNP-COALESCE korrekt)
```
Body: COALESCE(MAX(minutes_played),0) + GROUP BY player_id,gameweek → kein Doppel-Slot bei Doppel-Spieltag.

## AC-01 FANT-05 (DB-verifiziert — Liga-Scope wirkt)
GW30 Top-Scorer pro Liga (disjunkt, vorher gemischt):
```
La Liga 449 · Serie A 409 · TFF 1.Lig 407 · Premier League 398
```
leagueId-Filter restringiert die fixtures-Subquery → Ergebnisse-Tab zeigt nur die gescopte Liga.

## AC-03/04 FANT-13/08
Code-verifiziert (Saisonende → kein Live-Spiel für visuellen Live-Test). FANT-08-Test invertiert (lock=true bei past played_at). FANT-13 isLive→pending-Ausschluss + minute-Feld.

## REVIEW
Cold-Context CONCERNS → 1 MAJOR (Migration-File) + 1 MINOR (Doppel-MAX bestätigt OK) + 1 NIT geheilt. worklog/reviews/284d-review.md.
