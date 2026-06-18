# Slice 334 — Proof (Polls P2: player_id + Discovery)

## DB / Schema (live, project skzjfhvgccaeplydsunz)

### AC-01/02 — Spalte + FK
```
column player_id: data_type=uuid, is_nullable=YES
FK confdeltype = 'n'  (ON DELETE SET NULL)
```

### AC-03/07 — RPC-Signatur + Grants
```
pg_get_function_identity_arguments(create_community_poll):
  p_user_id uuid, p_question text, p_options jsonb, p_cost_bsd bigint,
  p_duration_days integer, p_source text, p_club_id uuid, p_description text, p_player_id uuid
→ genau 1 Signatur (9-arg), alte 8-arg gedroppt.
has_function_privilege('anon','EXECUTE')          = false
has_function_privilege('authenticated','EXECUTE') = true
```

### AC-04 — invalid_player Guard (Live-Call)
```
create_community_poll(..., p_player_id='00000000-...0000')
→ {"success": false, "error": "invalid_player"}   (kein FK-23503-Crash)
```

### AC-05 — Happy-Insert mit player_id (BEGIN; … ROLLBACK;)
```
create_community_poll(club_admin, '...', source='club', club_id=<real>, player_id=<real player>)
SELECT … FROM community_polls WHERE question='Smoke 334 happy (player anchor)':
  source='club', has_club=true, has_player=true
ROLLBACK  → keine Spur.
```

## Service / Unit (vitest)

### AC-06 — player_name-Resolve
```
src/lib/services/__tests__/communityPolls-get.test.ts → 2 passed
  - resolves player_name 'Lamine Yamal' + position 'ATT'; null bei kein-Anker
  - player_name null wenn player_id gesetzt aber Spieler nicht gefunden (Edge #4)
src/lib/services/__tests__/communityPolls-create.test.ts → 6 passed
  - p_player_id: null default + p_player_id durchgereicht wenn gesetzt
Gesamt berührte Tests: 138 + 6 passed, 0 failed.
```

### AC-12 — i18n Namespace-aware (node-Check, beide Locales)
```
de/tr community.pollPlayerLabel/Search/None/NotFound/Remove → alle aufgelöst (kein MISSING)
de/tr community.feed.noAnchorResults/clearFilter            → alle aufgelöst
```

### tsc
```
npx tsc --noEmit → exit 0
```

## Live-Playwright gegen www.bescout.net (post-Deploy, 2026-06-18) — BESTÄTIGT

Build live verifiziert (SW unregister + cache.delete + Hard-Reload, Slice-326-Pattern).

- **AC-10 Anker-Chips rendern:** 3 Chips im Feed — `SAK` (Verein Sakaryaspor) + `Raymond Adeola` + `Oğulcan Çağlayan` (2 Spieler). Verein + Spieler gemischt, korrekt.
- **AC-10 Filter wirkt:** Klick auf Chip „Oğulcan Çağlayan" → Counter `9 → 1 Beiträge`; einziger Eintrag = player_take dieses Spielers.
- **AC-11 §254 kein Catch-22:** nach Auswahl bleiben alle 3 Chips sichtbar/klickbar; nur geklickter `aria-pressed=true`, andere `false`.
- **AC-11 Clear:** aktiven Chip erneut geklickt → `1 → 9 Beiträge`, kein Chip aktiv.
- **AC-09 Suche nach Verein:** Eingabe „Sakarya" → `9 → 2 Beiträge` (matcht via getClub-Name über Typen); Chip-Leiste rechnet sich aus Suchergebnis neu (SAK + Raymond Adeola).
- **AC-12 i18n:** frische `/community`-Seite → 0 Konsolen-Fehler, kein `MISSING_MESSAGE` für `community.*`. (Im all-Scan auftauchende `admin.clubPollSection*`-MISSING = alte gecachte Chunk-Hashes vor Reload; Keys existieren in de.json:2992 → resolven auf frischem Bundle.)

### AC-08 — CreatePollModal Spieler-Picker: code-/test-bewiesen (Live-Modal gated)
- QA-Konto „Jarvis QA" hat 0 Follower → „Umfrage erstellen" korrekt durch Follower-Tor (50, P1) gesperrt → Modal nicht öffenbar mit diesem Konto.
- Abgedeckt durch: vitest (playerId→p_player_id durchgereicht) + tsc + Picker ist 1:1-Reuse des live-bewährten CreateResearchModal-Pickers (usePlayerNames). Funktional zusätzlich bewiesen durch happy-insert Rollback-Smoke (source='club', has_player=true).

## Review
- worklog/reviews/334-review.md → PASS, 3 NITPICK (alle dokumentiert/out-of-scope).
- Backlog: getPlayerNames `.limit()`-Härtung (Nitpick #3).
