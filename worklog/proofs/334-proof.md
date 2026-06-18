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

## OFFEN (post-Deploy) — Live-Playwright gegen bescout.net
- AC-08 CreatePollModal Spieler-Picker (User- + Club-Pfad, 393px)
- AC-09 Suche matcht Spieler/Verein über alle Typen
- AC-10/11 Anker-Chip-Filter (filtert + kein Catch-22)
- MISSING_MESSAGE-Console-Scan (Slice-333-Lehre)
→ wird nach Vercel-Deploy als Proof-Nachtrag bestätigt (analog Slice 333 AC-09).

## Review
- worklog/reviews/334-review.md → PASS, 3 NITPICK (alle dokumentiert/out-of-scope).
- Backlog: getPlayerNames `.limit()`-Härtung (Nitpick #3).
