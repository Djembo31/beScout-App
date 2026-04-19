# Slice 083 — Altbestand-Filter `getPlayersByClubId`

**Status:** SPEC
**CEO-Scope:** JA (Trading-UX, Money-angrenzend — sichtbarer Kader aendert sich)
**Stage-Chain:** SPEC → IMPACT (DONE) → BUILD → PROVE → LOG

## Ziel

`getPlayersByClubId` bekommt einen **optionalen** Filter fuer aktive Spieler:
`AND is_liquidated = false AND (last_appearance_gw > 0 OR created_at > now() - 180 days)`.

User-facing Views (Club-Page, Admin-Volume-Widgets) bekommen `activeOnly: true`.
Admin-Management (Liquidate, Set-Cap, Create-IPO) bleibt auf Full-Set (backwards-compat).

## Impact-Result (aus impact-analyst)
- 4 Caller: `useClubData` (→ activeOnly), `AdminOverviewTab`/`AdminRevenueTab` (→ activeOnly), `useAdminPlayersState` (→ full-set bleiben).
- Cache-Key braucht activeOnly-Flag damit Admin+User nicht denselben Cache-Eintrag ueberschreiben.
- `club.ts:701 getClubDashboardStats` hat direkten `.from('players').eq('club_id')` — wird angeglichen (activeOnly=true).
- Ergebnis: Aston Villa 62 → ~30-35, Galatasaray 40 → ~30, Bayern 46 → ~30 in User-Views.

## Betroffene Files

| File | Aenderung |
|------|----------|
| `src/lib/services/players.ts` | `getPlayersByClubId(clubId, opts?: { activeOnly?: boolean })` |
| `src/lib/services/club.ts` | `getClubDashboardStats` Filter anwenden |
| `src/lib/queries/keys.ts` | `qk.players.byClub(cid, activeOnly)` |
| `src/lib/queries/players.ts` | `usePlayersByClub(clubId, activeOnly?)` |
| `src/components/club/hooks/useClubData.ts` | Hook-Call mit `activeOnly=true` |
| `src/components/admin/AdminOverviewTab.tsx` | Call mit `activeOnly: true` |
| `src/components/admin/AdminRevenueTab.tsx` | Call mit `activeOnly: true` |
| Tests (3) | Mock-Signatur anpassen (zusätzliches Arg, backwards-kompatibel) |

## Acceptance

1. Service: Default `activeOnly=false` (keine Breaking-Change).
2. Club-Page `/club/[slug]` zeigt Kader nach Filter.
3. Admin-Panel (useAdminPlayersState) zeigt weiterhin Full-Set inkl. liquidierte.
4. `npx tsc --noEmit` clean, betroffene Tests gruen.
5. Stichprobe auf bescout.net nach Deploy: Aston Villa + Galatasaray + Bayern Kader-Counts realistisch.

## Edge Cases

1. **User haelt Holdings auf transferiertem Spieler**: Club-Page zeigt ihn nicht mehr im Kader, Market-Holdings-Rail schon (nutzt `/api/players`, anderer Pfad). Ok.
2. **Ganz neue Players ohne Appearances + <180 Tage erstellt**: Sind legit (Neuzugang Jugend) → werden sichtbar via `created_at > now()-180d`-Branch.
3. **Cache-Drift**: Ohne Cache-Key-Update wuerden Admin+User denselben Cache-Eintrag teilen. Key-Update ist Pflicht.
