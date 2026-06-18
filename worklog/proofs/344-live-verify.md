# Proof — Slice 344 (Fan-Rang-Leiter + Perk-Katalog)

**Datum:** 2026-06-18 · **Methode:** Playwright MCP gegen bescout.net (jarvis-qa), post-Deploy (Commit `4afd47e6`).

## Artefakte
- `344-vitest.txt` — 6/6 Unit-Tests grün (inkl. AC-03 Mirror-Regression, Empty-State, Top-Tier-Edge).
- `344-ladder-desktop.png` — Desktop-Viewport, /club/galatasaray → Tab „Mehr".
- `344-ladder-393px.png` — Mobile 393px (iPhone 16).

## Live-Verifikation (`/club/galatasaray`, eingeloggt jarvis-qa)

Gerenderte Fan-Rang-Karte (innerText, Empty-State da jarvis bei Galatasaray noch keinen Rang hat):
```
Fan-Rang | Noch kein Fan-Rang — werde aktiv bei deinem Club! | Jetzt ein Fantasy Event spielen
FAN-RANG-STUFEN | Noch 10 bis Stammgast
Vereinsikone   | 70+   | 3× Stimmgewicht in Umfragen
Ehrenmitglied  | 55–69 | 3× Stimmgewicht in Umfragen
Legende        | 40–54 | 2× Stimmgewicht in Umfragen
Ultra          | 25–39 | 2× Stimmgewicht in Umfragen
Stammgast      | 10–24 | 1× Stimmgewicht in Umfragen
Zuschauer      | 0–9   | 1× Stimmgewicht in Umfragen | AKTUELL
```

## AC-Abgleich (live)
- **AC-01/AC-02** ✅ 6-Stufen-Leiter rendert; Empty-State (kein Rang) zeigt Leiter + CTA, AKTUELL-Marker auf Zuschauer.
- **AC-03** ✅ Poll-Gewicht exakt Mirror 343: Ultra/Legende 2×, Ehren/Ikone 3×, Zuschauer/Stammgast 1×.
- **AC-04** ✅ Alle Labels DE gerendert, `MISSING_MESSAGE`-Scan = 0 (`/gamification\.fanRank/` → false).
- **AC-05** ✅ 393px: `scrollWidth − clientWidth = 0px` (kein Horizontal-Overflow).
- **AC-06** ✅ Fortschritt „Noch 10 bis Stammgast" (current Zuschauer score 0 → next Stammgast minScore 10), off-by-one-safe.
- **AC-07** ✅ Wording neutral („Stimmgewicht", „Stufen"), kein gewinn*/kazan*.

## Hinweis
Empty-State demonstriert die Leiter vollständig (Conversion-Anreiz „was du erreichen kannst"). Die Karte liegt im Club-Tab „Mehr" (RevealSection, lazy-mount on scroll). Verifiziert wurde DE; TR-Strings sind im Code present + namespace-geprüft (de+tr).
