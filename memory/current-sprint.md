# Current Sprint — Polish Sweep (Pre-Launch Page Polish)

## Stand (2026-04-12, Ferrari Knowledge System installiert)

- **Branch:** main
- **Letzter Commit:** `679eb54` feat(system): Ferrari Knowledge System — complete installation
- **Deployed:** live auf bescout.net (keine Produkt-Aenderungen, nur System)
- **Ferrari Status:** 9/9 Teile installiert, CTO-reviewed, Hooks getestet
- **Tests:** `tsc --noEmit` clean, settings.json valid
- **Session-Charakter:** Strategisch. Karpathy-Research → IST-Analyse → Design → Installation. Naechste Session = erster Proof-of-Concept mit Market Polish.

## Aktueller Fokus: Polish Sweep

SSOT: `memory/polish-sweep.md`. Ziel: Jede der 29 Pages + zugehörigen Modals systematisch polieren und committen.

### Phase 1 — Critical Path Progress

| # | Page | Status | Kommentar |
|---|------|--------|-----------|
| 1 | Home (`/`) | ✅ done | Pass 1 (A declutter + C mystery box daily, `d995738`) + Pass 2 (B1 letzter spieltag widget, `aa4cea7`). Track D deferred zu Liga-Projekt |
| 2 | Market (`/market`) | ⏳ nächste Page | Tabs: Kaufen / Verkaufen / Sell-Orders / Liste |
| 3 | Fantasy (`/fantasy`) | ⏳ | Tabs + 5 Modals (EventDetail, Summary, CreatePrediction, FixtureDetail, CreateEvent) |
| 4 | Player Detail (`/player/[id]`) | ⏳ | 4 Action-Modals (Buy/Sell/LimitOrder/Offer) |
| 5 | Profile (`/profile`) | ⏳ | 4 Tabs (Übersicht/Holdings/Verlauf/Timeline) + FollowList Modal |
| 6 | Inventory (`/inventory`) | ⏳ | 4 Tabs (equipment/cosmetics/wildcards/history) + EquipmentDetail Modal |

Phase 2 (12 Pages) / Phase 3 (5 Pages) / Phase 4 (2 Pages) / Phase 5 (4 Pages) — siehe `memory/polish-sweep.md`.

### Home Pass 2 — was konkret reinkam

- `src/components/home/LastGameweekWidget.tsx` — neuer self-contained Widget mit home-scoped Query-Keys (kein Cache-Collide mit Manager-Historie)
- Datenquelle: existierende `getUserFantasyHistory(uid, 1)` + `getLineup(eventId, uid)` Services aus `@/features/fantasy/services/lineups.queries` (reuse, no duplication)
- Format-Detection und Slot-Key-Building via `@/features/fantasy/constants` Helpers (reuse, no duplication)
- Full Lineup Grid Darstellung (Anil Option C): Header + KPI-Row (Score/Rang/Belohnung) + alle 7/11 Slots in pitch order (ATT→MID→DEF→GK) + Footer-Link zu `/manager?tab=historie`
- Empty State Card mit `/fantasy` CTA (Anil Option B)
- i18n DE/TR unter `home.lastGameweek.*`
- Position: Main Column zwischen `ScoutCardStats` und "Top Mover der Woche" (Anil Option B)

## Produkt-Entscheidungen (warten weiter auf Anils Kopf)

1. Beta-Tester-Gruppe formalisieren (Anzahl / Zeitrahmen / Onboarding-Call)
2. Revenue Stream Prio aus `memory/project_missing_revenue_streams.md` (Sponsor Flat Fee / Event Boost / Chip Economy)
3. BeScout Liga Q1/Q3/Q4/Q5/Q6 Antworten (siehe `memory/project_bescout_liga.md`) — aber erst nach Polish Sweep

## Scope-Creep (aus dem Polish Sweep Log)

| Gefunden bei | Item | Severity | Status |
|---|---|---|---|
| Home A3 | `get_my_top_movers_7d` RPC fehlt — aktuell nur change24h verfügbar für "Top Mover der Woche" | M | ⏳ |
| Home C4 | `open_mystery_box_v2` backend daily-cap check — Frontend-only gating derzeit | M | ⏳ |
| Track D | CardMastery Konzept existiert nicht im Code — muss definiert werden | L | ⏳ |

## Naechste Session

Start mit `memory/session-handoff.md` lesen. Dann Page #2 Market starten:

```
QA_BASE_URL=https://bescout.net MSYS_NO_PATHCONV=1 npx tsx e2e/qa-polish.ts --path=/market --slug=market
```

→ Screenshots mobile+desktop angucken → Anil alignen → fixen → commit → nächste Page.

## Session Commits (2026-04-10 Nacht)

| Hash | Message |
|---|---|
| `aa4cea7` | feat(home): polish pass 2 — track B1 (letzter spieltag widget) |

Auf origin/main gepusht, via Vercel deployed, live verifiziert.
