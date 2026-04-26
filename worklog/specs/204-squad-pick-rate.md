# Slice 204 — Squad-Tab Fantasy-Pick-Rate (K-03)

## Ziel
Auf `/club/[slug]` Spieler-Tab (Cards-View) zeigt jeder Spieler einen Pick-Rate-Badge `🔥 NN%` wenn Fantasy-Aggregat-Daten fuer aktive Gameweek-Event vorliegen — sodass User sofort erkennen "welcher Spieler ist gerade hot pick".

## Betroffene Files
- **NEW** `src/components/club/PickRateBadge.tsx` — kleiner Badge-Component (overlay-tauglich)
- **EDIT** `src/app/(app)/club/[slug]/ClubContent.tsx` — Pick-Rate-Map laden, Badge ueber PlayerDisplay
- **EDIT** `messages/de.json` + `messages/tr.json` — `club.pickRate` namespace

## Acceptance Criteria
1. Cards-View Spieler-Tab: jeder Spieler in `pickRateMap` hat oben rechts Badge mit Prozent + Flame-Icon
2. Threshold: nur anzeigen wenn `pct >= 5` (Noise-Filter, kein "0.1% pick")
3. Compact-View bleibt unangetastet (Layout zu eng fuer Badge)
4. Kein aktives Event ODER leere Pick-Rate-Daten → keine Badges, kein Layout-Shift
5. Loading-State: kein Skeleton (Badges erscheinen einfach wenn da sind — non-critical UX)
6. Verfuegbar fuer alle 7 Ligen (kein Hard-Filter pro Liga, RPC liefert Aggregat)
7. i18n: DE "X% gepickt" + TR "%X seçildi" + aria-label

## Edge Cases
- Keine aktive Gameweek (off-season) → `useLeagueActiveGameweek` returnt null → keine Badges
- Event-Lookup leer (keine running events fuer GW) → keine Badges
- Pick-Rate-RPC error → silent (catch in service), keine Badges, keine Toast-Spam
- Spieler nicht in Pick-Rate-Map (war nie in einem Lineup) → kein Badge (richtig)
- 100% Pick-Rate → "100%" (nicht "100.0%")
- Fractional (z.B. 5.7%) → ganzzahlig gerundet ("6%")
- Compact-View toggled → Badges weg (nur Cards)
- Mobile (393px): Badge nicht ueber Spielername liegen, top-right ueber Photo

## Proof-Plan
- `npx tsc --noEmit` clean
- `git diff --stat` zeigt 4 Files (3 Code + spec)
- vitest skipped (kein Service-Edit, nur Component-Wiring)

## Scope-Out
- KEINE neue RPC (D46 — `getEventPlayerPickRates` existiert seit Slice 195e)
- KEINE Veraenderung an PlayerDisplay-API (Wrap-Pattern)
- KEINE Per-Player-Tooltip/Click (nur statisches Display)
- Keine Most-Owned Badge fuer K-02 (anderer Slice)
- Compact-View nicht erweitert
- Andere Tabs (Spielplan, Uebersicht) unangetastet

## Decision-Notes
- **D46-Anwendung:** `useEventPlayerPickRates` aus `src/features/fantasy/queries/fantasyPicker.ts` reused
- **Wrap-Pattern statt PlayerDisplay-Prop:** PlayerDisplay bleibt FPL-agnostic, Badge ist Squad-Tab-spezifisch
- **Threshold 5%:** matches Slice 199 Pattern (Anonymized Aggregate UI nur signifikante Werte)
