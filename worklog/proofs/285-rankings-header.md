# Slice 285 Proof — FM-06 Rankings-Liga-Header verschieben

**Datum:** 2026-06-13

## AC-4 — tsc grün (lokal)

```
$ pnpm exec tsc --noEmit
✅ (exit 0, keine Fehler)
```

## AC-1 — Header direkt über PlayerRankings (grep)

```
$ grep -B2 "<PlayerRankings" src/app/(app)/rankings/page.tsx
          <div className="space-y-3">
            <LeagueScopeHeader leagueBarSize="md" nonSticky />
            <PlayerRankings filterCountry={filterCountry} filterLeague={filterLeague} />
```

`LeagueScopeHeader`: 1 Import (Z.5) + 1 Verwendung (Z.53, rechte Spalte) — kein Page-Top mehr, kein Doppel-Render.

## AC-3 — Filter-Props unverändert

`filterCountry`/`filterLeague` aus `useLeagueScope`-Selektoren (Z.22-23) weiter an PlayerRankings durchgereicht. Leaderboards (Global/Monthly/Friends/Club/LastEvent) unverändert ohne Filter.

## AC-2 — Visuell (bescout.net /rankings, Deploy m47yf4otg, 2026-06-13)

Playwright MCP gegen bescout.net, eingeloggt als jarvis-qa.

- `285-rankings-desktop.png` (1280px) + `285-rankings-mobile.png` (393px)
- DOM-Verify (warm SPA-Navigation):
  ```
  headerCount: 1            (kein Doppel-Render)
  buttonCount: 9            (Alle·Deutschland·Türkei·Spanien·England·Italien + Alle·Süper Lig·TFF 1. Lig)
  headerIsAbovePlayerRankings: true
  headerVisible: true
  parent: <div class="space-y-3">[league-scope-header][PlayerRankings-card]</div>
  ```
- Mobile (393px): kein Filter-Header am Page-Top; Länder-/Liga-Pills sitzen unmittelbar
  über der „Spieler-Rankings"-Card. ✅ exakt das gewählte Layout (Option 1).

**AC-1/2/3/4 alle grün.** FM-06 gefixt.

---

## ⚠️ Nebenbefund (NICHT Teil von Slice 285) — Cold-Load-Race im LeagueScopeHeader

Bei der visuellen Verifikation entdeckt: bei **Hard-Navigation / Cold-Load**
(`page.goto` = Direkt-Link, Hard-Refresh, PWA-Cold-Start) rendert der
`LeagueScopeHeader` einen **komplett leeren Div** (`childCount: 0`, 0 Buttons) —
app-weit (auf /rankings UND /clubs reproduziert).

**Root-Cause:**
- `ClubProvider` (`ClubProvider.tsx:167`) rendert Children **sofort**, ohne Gating auf `cachesReady`.
- `initLeagueCache()` ist async (DB-Load) → `leagueCache` zunächst leer.
- `LeagueScopeHeader.tsx:52` `const allCountries = useMemo(() => getCountries(locale), [locale])`
  captured beim ersten Render die leere `getCountries()`-Liste.
- `CountryBar.tsx:22` `if (countries.length <= 1) return null` → Bar verschwindet.
- useMemo-deps = nur `[locale]` → recomputet **nie**, wenn der Cache später ready wird.
  → Header bleibt für die gesamte Page-Lebensdauer leer.

**Warum nicht früher aufgefallen:** Bei warmer SPA-Navigation (Klick durch die App,
Cache bereits ready) populiert der Header korrekt (9 Buttons verifiziert). Nur
Cold-Load trifft die Race — auf Mobile/PWA aber häufig.

**Impact:** Liga-Filter app-weit unsichtbar bei Cold-Load → User kann nicht filtern.
Potenzieller Beta-Blocker. **Fix-Vorschlag:** `getCountries`-useMemo an einen
cache-ready-Trigger koppeln (z.B. `useClub().loading` / `isLeagueCacheReady()` in deps),
ODER ClubProvider gated Header-Konsumenten. Cross-cutting (/rankings, /clubs, /fantasy,
/market) → eigener Slice empfohlen. Pattern-Familie: Slice 254 „Filter-as-audience-choice"
+ „initialData-vs-cache-ready"-Race.
