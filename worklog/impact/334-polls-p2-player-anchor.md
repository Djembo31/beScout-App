# Impact — Slice 334 (Polls P2: player_id + Discovery)

## Betroffene Schema-Objekte
- `community_polls` (ADD COLUMN player_id uuid NULL FK players ON DELETE SET NULL)
- `create_community_poll` RPC (8-arg → 9-arg: +p_player_id; alte Signatur DROP)

## Consumer-Liste (grep-verifiziert)

### `community_polls` / `getCommunityPolls` / `CommunityPollWithCreator`
| Consumer | Pfad | Impact |
|----------|------|--------|
| useCommunityPolls (Query-Hook) | `src/lib/queries/polls.ts` | KEIN Change — reicht durch |
| useCommunityData | `src/components/community/hooks/useCommunityData.ts` | KEIN Change |
| Community-Page | `src/app/(app)/community/page.tsx` | KEIN Change (Feed bekommt Daten schon) |
| **CommunityFeedTab** | `src/components/community/CommunityFeedTab.tsx` | **HAUPT-CHANGE** (Suche + Anker-Chip-Filter) |
| CommunityPollCard | `src/components/community/CommunityPollCard.tsx` | klein: optionaler Spieler-Tag |
| **MitmachenSection (Vereinsseite)** | `src/components/club/sections/MitmachenSection.tsx` | **KEIN Change — verifiziert safe.** Mappt nur `{id,question,options,total_votes}`, ignoriert player_id. Optional-Feld = rückwärts-kompatibel. |

### `create_community_poll` RPC
| Consumer | Pfad | Impact |
|----------|------|--------|
| createCommunityPoll (Service) | `src/lib/services/communityPolls.ts` | Change: p_player_id durchreichen |
| CreatePollModal | `src/components/community/CreatePollModal.tsx` | Change: Spieler-Picker (intern usePlayerNames) |
| CreatePollButton (User-Pfad) | community/page.tsx | KEIN Change (Modal-intern) |
| CreatePollButton (Club-Pfad) | `src/components/admin/AdminVotesTab.tsx` | KEIN Change (Modal-intern; Picker erscheint automatisch) |

### Tests
| Test | Impact |
|------|--------|
| `src/lib/services/__tests__/communityPolls-create.test.ts` | Update: RPC-Call-Shape hat p_player_id |
| `src/components/community/__tests__/CommunityFeedTab.test.tsx` | Prüfen, ggf. Anker-Filter-Test ergänzen |
| `src/lib/__tests__/db-invariants.test.ts` | Prüfen ob community_polls-Schema-Annahme bricht (vermutl. nein) |

## Side-Effects
- **RLS:** community_polls hat RLS (baseline). ADD COLUMN braucht keine neue Policy; INSERT via SECURITY DEFINER RPC (RLS nicht beteiligt); SELECT-Policy deckt neue Spalte automatisch. ✓
- **Caching:** `useCommunityPolls` staleTime 2min; nach Create invalidiert page bereits `qk.polls.all`. ✓
- **player_name-Resolve:** getCommunityPolls bekommt zusätzliche players-`.in('id',ids)`-Query. Polls-Limit 50 → max 50 ids → kein `.in()`-Chunk-Bug (Grenze 100). ✓
- **Realtime:** nicht betroffen.

## Migration-Plan
1. `mcp__supabase__apply_migration` (NACH 333-Timestamp → 20260618140000).
2. ADD COLUMN + FK.
3. DROP alte 8-arg-Signatur, CREATE 9-arg, REVOKE/GRANT (AR-44, neue Signatur).
4. `pg_get_functiondef` + `information_schema.columns` + REVOKE-Audit verify.

## Rückwärts-Kompatibilität
- player_id optional/NULL → alle bestehenden Polls + MitmachenSection unverändert lauffähig.
- RPC: neuer Param hat DEFAULT NULL, ABER Signatur-Wechsel → Service MUSS mitgezogen werden (gleicher Slice).
