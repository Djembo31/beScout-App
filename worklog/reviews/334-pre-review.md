# Slice 334 — Pre-Review-Memo (Self-Audit)

## ACs Self-Audit
- AC-01/02 (Spalte + FK SET NULL): ✅ live verifiziert (uuid/nullable, confdeltype='n').
- AC-03 (9-arg, genau 1 Signatur): ✅ pg_get_function_identity_arguments → 1 Row mit p_player_id.
- AC-04 (invalid_player): ✅ Live-Smoke `{success:false,error:'invalid_player'}`.
- AC-05 (Insert player_id): teils — Struktur live ok; Happy-Insert über echten Pfad → PROVE (Force-Rollback).
- AC-06 (player_name-Resolve): ✅ vitest communityPolls-get (2 Tests).
- AC-07 (REVOKE anon): ✅ has_function_privilege('anon')=false, authenticated=true.
- AC-08 (Picker im Modal): ⏳ Live-Playwright (PROVE).
- AC-09 (Suche player+club): ✅ Code-Pfad (matchesAnchorText); Live → PROVE.
- AC-10/11 (Chip-Filter + kein Catch-22): ✅ availableAnchors aus searchedItems (pre-anchor), unabhängig von `anchor`-State; Live → PROVE.
- AC-12 (i18n namespace): ✅ node-Check beide Locales, alle unter `community` aufgelöst.

## Edge-Cases getestet
- Edge #3 (invalid_player) ✅ live. Edge #4 (player not found → name null) ✅ vitest.
- Edge #6 (Anker+Suche kombiniert): Code AND-kombiniert (searchedItems → anchoredItems). Nicht separat getestet → Reviewer-Blick.
- Edge #8/9 (Vote bei Spieler-Anker raus / Verein-Anker bleibt): itemPlayerId('vote')=null → fällt bei Spieler-Anker raus ✅; club_id bleibt ✅.

## Self-Verification gelaufen
- `tsc --noEmit` → exit 0.
- vitest (create+get+feed+hooks) → 138+6 passed.
- i18n node-Check → alle Keys MISSING-frei beide Locales.
- DB: Spalte+FK+Signatur+REVOKE live verifiziert.

## Bekannte Risiken / Reviewer-Fokus
1. **§254-Catch-22:** availableAnchors hängt nur an `searchedItems`, NICHT an `anchor` → Chips bleiben nach Auswahl. Bitte gegenprüfen.
2. **club_id-Union-Access:** `item.data.club_id ?? null` über 5-Typen-Union — tsc grün, alle Typen haben club_id. Vote hat kein player_id (itemPlayerId('vote')=null).
3. **player_name-Resolve im Service:** `.in('id', playerIds)` max 50 ids (Polls-Limit 50) → kein Chunk-Bug. Reviewer: Bestätigung.
4. **Migration-Timestamp:** 20260618140000 > 333 (20260618120000) ✅ greenfield-Ordnung.
5. **CommunityPollCard Spieler-Tag:** nur Anzeige wenn player_name; rückwärts-kompatibel (MitmachenSection unverändert).

## Scope-Drift
- Keine. Klickbare Card-Tags + Player-Detail-Einstieg bewusst Scope-Out (P2b), in Spec §11 dokumentiert.
