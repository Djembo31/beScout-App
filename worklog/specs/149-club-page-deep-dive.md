# 149 — Club-Page Deep-Dive (Galatasaray-Audit)

**Datum:** 2026-04-23
**Size:** M (6-8 Files, Cross-Domain: i18n + UI + neuer Service)
**CEO-Scope:** ja (Wording Issue 1-4)
**Trigger:** Anil-Audit Galatasaray-Club-Page — 7 UI/UX-Issues identifiziert.

## Ziel

`/club/galatasaray` wird komplett inspiziert und auf Ferrari-Qualitaet gehoben: klare Labels, richtige Zahlen, saubere Mobile-Darstellung, Tabellenplatz-Integration, funktionierende Spieler-Karten.

## Data-Facts (Galatasaray, 2026-04-23 verifiziert)

| Kennzahl | DB | User-Sicht |
|----------|----|----|
| Players | 36 (100% image_url, alle api-sports.io) | User: "keine Bilder" |
| Scouts (club_followers) | 2 | User sieht "0" |
| Buyable IPOs | 36 (alle open) | User: "spielerkaufbar, stimmt das?" |
| vol_24h | 0 cents | korrekt (neue Test-DB) |
| dpc_float | 3600 | angezeigt, Label unklar |
| League-Standing | Rank 1, 68 pts, Form DWLWW | nicht im UI |

## Issues (7)

### Issue 1 — Scouts-Label + Count 0 statt 2 [CEO-Wording + CTO-Debug]
- Label `t('scouts') = 'Scouts'` — User versteht Begriff nicht (BeScout-intern: Fan=Scout)
- User sieht 0, DB hat 2. Debug noetig: (a) followerCount-Query richtiger clubId? (b) Cache stale?
- **CEO-Entscheidung:** Label bleibt "Scouts" (BeScout-Brand) ODER "Fans" (klar) ODER "Follower" (generisch)

### Issue 2 — "24h Vol" Label [CEO-Wording]
- `t('volume24h') = '24h Vol'` — "Vol" unklar
- **Vorschlag:** "Handel 24h" (DE) / "24s İşlem" (TR)

### Issue 3 — "Spieler kaufbar" Label [CEO-Wording + Compliance]
- `t('buyable') = 'Spieler kaufbar'` — Business-Regel AR-7: IPO → "Erstverkauf"
- **Vorschlag:** "Im Erstverkauf" (DE) / "Kulüp Satışı'nda" (TR) + richtige Pluralisierung

### Issue 4 — "Scout Card Float" Label [CEO-Wording]
- `t('dpcFloat') = 'Scout Card Float'` — "Float" = Finanzterm, unverstaendlich
- **Vorschlag:** "Karten im Umlauf" (DE) / "Dolaşımdaki Kartlar" (TR)

### Issue 5 — Form-Pills Mobile-Overflow [CTO]
- `ClubStatsBar.tsx:79` packt 3 stats + form (5×24px) + prestige in 1 flex-row → overflow auf 393px
- **Fix:** Row 1 = 3 secondary stats (compact). Row 2 = Form + Prestige (wenn vorhanden)

### Issue 6 — Tabellenplatz-Integration [CTO-Feature]
- `league_standings` Tabelle existiert (Slice 074), Galatasaray Rank 1 eingetragen
- **Bauen:** `getClubStanding(clubId)` service + `useClubStanding(clubId)` hook
- Render: in Club Info section neue Kachel "Tabellenplatz 1. / 68 Pkt / DWLWW Form"

### Issue 7 — PlayerDisplay "scheisse, keine Bilder" [CTO-Debug + Review]
- Photos sind 100% in DB, CSP erlaubt `media.api-sports.io`
- **Debug noetig:** Warum rendert User keine Bilder? Hypothesen:
  - (a) `PlayerPhoto` component broken auf Client
  - (b) `dbToPlayers()` mapped `image_url` → `imageUrl` falsch
  - (c) `next/image` remotePatterns fehlt in next.config
  - (d) User-Cache zeigt alten Deploy
- **Design:** Card-Variant soll Ferrari-Look (carbon + gold) haben — visuell verifizieren

## Betroffene Files

| File | Zweck | Issue |
|------|-------|-------|
| `messages/de.json` + `messages/tr.json` | Labels scouts/volume24h/buyable/dpcFloat | 1-4 |
| `src/components/club/ClubStatsBar.tsx` | Mobile-Overflow Form-Row | 5 |
| `src/lib/services/club.ts` | + `getClubStanding()` | 6 |
| `src/lib/queries/misc.ts` (oder new) | + `useClubStanding()` hook | 6 |
| `src/components/club/ClubInfoStandings.tsx` (NEW) | Tabellenplatz-Kachel | 6 |
| `src/app/(app)/club/[slug]/ClubContent.tsx` | Render Standings in Club Info | 6 |
| `next.config.js` | prüfen: `media.api-sports.io` in `images.remotePatterns` | 7 |
| `src/components/player/index.tsx` (PlayerPhoto) | Debug PlayerPhoto falls broken | 7 |

## Acceptance Criteria

1. Galatasaray `/club/galatasaray` auf iPhone 393px: Form-Row läuft NICHT aus Bild
2. Labels auf Mobile + Desktop klar (4× Wording ersetzt nach CEO-Entscheidung)
3. Scouts-Count zeigt **2** (nicht 0) — Regression-Test fuer bekannte Clubs
4. Buyable-Count zeigt **36** (alle IPOs) — korrekt
5. DPC-Float zeigt **3.600** — mit neuem Label
6. Neue Club-Info-Kachel: Tabellenplatz 1 / 68 Pkt / Form DWLWW / 67:22 Tore
7. Spieler-Karten rendern alle 36 Bilder (api-sports.io) auf Card + Compact Variant
8. DE + TR i18n beide komplett
9. Playwright-Screenshot gegen bescout.net/club/galatasaray (393px + 1280px) in `worklog/proofs/149-*.png`

## Edge Cases

- Scouts=0 (neuer Club ohne Follower) — "0 Scouts" (nicht "kein Follower")
- Keine League-Standings-Row (neuer Club, noch nicht gescraped) — Kachel versteckt, kein Error
- Form-String kurzer als 5 Zeichen (z.B. "WW" bei Saison-Start) — rendere nur vorhandene
- User nicht logged-in (Public View) — PublicClubView verwendet andere Props, checken ob Fixes propagieren
- Form fehlt ("form" NULL in standings) — Kachel zeigt nur Rank+Pts ohne Pills
- Tabellenplatz-Form vs formResults-Hook: zwei Quellen (API-Football/standings vs fixtures). Konsistenz pruefen, ggf. standings bevorzugen
- Mobile landscape (667×375) — Row-Layout muss auch da halten
- TR-Locale: lange Strings ("Dolaşımdaki Kartlar") nicht truncaten auf Mobile

## Proof-Plan

1. Playwright gegen bescout.net/club/galatasaray auf 393px + 1280px + TR-locale — 3 Screenshots nach `worklog/proofs/149-galatasaray-mobile.png`, `149-galatasaray-desktop.png`, `149-galatasaray-tr.png`
2. Vitest: `npx vitest run src/lib/services/__tests__/club.test.ts` fuer Standings-Service
3. DB-Verify SELECT: Scouts=2, buyable=36, standing-rank=1 — als Proof-txt

## Scope-Out

- Kein Refactor der gesamten ClubHero — nur Labels
- Keine Änderung an PlayerRow Card-Design wenn Rendering OK ist (nur Debug)
- Keine neuen Clubs mit Tabellenplatz-Scrape triggern (Daten existieren)
- Kein Follower-Count-UI (bleibt Zahl+Label)
- Kein Deep-Refactor von Club-Hooks (useClubData)

## Stage-Chain Plan

```
SPEC (this file)
  ↓
[CEO-Approval Wording Issue 1-4]
  ↓
IMPACT (Tabellenplatz new service — check query-keys + RLS read)
  ↓
BUILD
  - Parallel: (a) i18n-Labels    (b) Mobile-Layout    (c) Standings-Service+Hook+Component
  - Sequential: (d) ClubContent integration    (e) Photo-Debug
  ↓
REVIEW (reviewer agent, cold context)
  ↓
PROVE (Playwright 393px + 1280px + TR)
  ↓
LOG
```
