# Slice 327 — Self-Review (Flaggen-Normung Emoji→SVG)

**Reviewer:** Primary-Claude Self-Review (D35) · **Datum:** 2026-06-15 · **Begründung self-review:** S-Slice, rein mechanische Umstellung auf bereits etablierte `CountryFlag`-Component (in PlayerHero/TradingCardFrame produktiv), gleiche ISO-Daten, kein neuer Daten-/Logik-Pfad. Hauptbeweis = Playwright-Live-Verify.

## Verdict: PASS

## Geprüft

| Achse | Ergebnis |
|-------|----------|
| **Daten-ISO (Slice 102)** | `c.code` (CountryInfo, ISO), `l.country` (League, ISO), `player.country` (via `mapNationalityToIso` im dbToPlayer-Mapper, ISO). Alle 3 Quellen sind bereits ISO → `CountryFlag code={x}` direkt korrekt. ✓ |
| **NULL-Safety** | Guards erhalten: `{player.country && <CountryFlag>}` (PlayerRow/IPOCard). CountryFlag selbst guard't `!upperCode \|\| !hasFlag` → Text-Fallback. Kein Crash bei leer/unbekannt. ✓ |
| **countryToFlag entfernt** | `grep -rn countryToFlag src/` → 0. Dead-Code raus, kein Orphan-Import (tsc EXIT 0). ✓ |
| **Größen-Konsistenz** | size=14 durchgängig (= alte `text-sm`-Höhe, h14×w21 SVG). Genormt über Filter + Cards. ✓ |
| **Test-Mock** | PlayerIPOCard.test.tsx: countryToFlag-Mock raus, `@/components/ui/CountryFlag` als Stub gemockt. 210 Tests grün. ✓ |
| **orphan LeagueBar** | `marktplatz/LeagueBar.tsx` editiert (countryToFlag→CountryFlag) — NÖTIG damit tsc grün bleibt nach utils-Removal. Datei ist dead (0 Importer, LeagueBarShared aktiv); echte Löschung in 326 Wave B (Dead-Wrapper). ✓ |

## Findings

| # | Severity | Location | Issue | Status |
|---|----------|----------|-------|--------|
| 1 | NITPICK | CountryBar/LeagueBar | CountryFlag-`<img alt={code}>` nicht aria-hidden; Button hat bereits `aria-label={name}` → minimale SR-Redundanz ("DE Deutschland"). Vorher war Emoji-span `aria-hidden`. | Akzeptabel — Kontext über Button-Label klar, kein Fehler. Optional Future: `decorative`-prop an CountryFlag (alt=""). Out-of-scope S327. |

## Risiken (Pre-Mortem-Check)
- Layout-Bruch durch SVG-Größe → Mobile-Live-Verify deckt ab (AC-05).
- Text-Fallback bleibt bei nicht-gemappten Nationalitäten → graceful (hasFlag), Live-Verify prüft Stichprobe.

## Positive
- Konsolidiert 2 Flaggen-Systeme auf 1 (SVG) — genau Anils „genormt & professionell"-Anforderung.
- Windows-Emoji-Flag-Bruch (root-cause) strukturell behoben, nicht nur kosmetisch.
- Dead-Code-Reduktion (countryToFlag weg).
