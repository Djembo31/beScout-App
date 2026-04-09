# Home Polish Sweep — Pass 1 + 2 (2026-04-09/10)

## Kontext
Polish Sweep ist ein strukturiertes Visual-QA-Projekt vor Business Launch. 29 Pages, commit-per-page, Mobile-Screenshot als Beweis. SSOT: `memory/polish-sweep.md`. Home ist Page #1 und wurde in zwei Passes abgeschlossen.

## Track A — Home Declutter (Commit d995738)

**Entfernt:**
- `HomeSpotlight.tsx` marktPulse Section + Fallback → raus
- `SuggestedActionBanner.tsx` ("Melde dich für Fantasy Event") → raus
- `PortfolioStrip.tsx` ("Mein Spielerkader") → ersetzt durch `ScoutCardStats.tsx`

**Neu:**
- `ScoutCardStats.tsx` — zeigt SC-Count + Position-Split (GK/DEF/MID/ATT) mit Farb-Tokens
- "Top Mover der Woche" Block mit Empty-State (Option A: sc-Karten-Icon + Text)

**Constraint:** `get_my_top_movers_7d` RPC fehlt — nur 24h-change verfügbar. Scope-Creep: neue DB-Column oder Aggregation aus `trades` nötig für echtes 7-Tage-Widget. Bis dahin: Empty-State.

## Track B1 — LastGameweekWidget (Commit aa4cea7)

**Neue Datei:** `src/components/home/LastGameweekWidget.tsx`

**Pattern: Self-Contained Inline Queries mit Home-Scoped Cache Keys**
- Query Keys: `['home','lastFantasyResult',uid]` + `['home','lineupSnapshot',eventId,uid]`
- Keine Kollision mit Manager-Tab Cache (der nutzt andere Keys)
- Services wiederverwendet aus `@/features/fantasy/services/lineups.queries`
  - `getUserFantasyHistory(uid, 1)` — letztes Event-Ergebnis
  - `getLineup(eventId, uid)` — User-Aufstellung für das Event

**Layout-Entscheidung (Anil Option C):**
- Full Lineup Grid: eine Zeile pro Slot, Position-Tag + Spieler-Name + Punkte
- Pitch-Reihenfolge reversed: ATT → MID → DEF → GK (visuell natürlicher)
- Footer-Link: `/manager?tab=historie` für volle History

**Format-Utilities genutzt:**
- `getFormationsForFormat` + `buildSlotDbKeys` aus `@/features/fantasy/constants`
- Ohne diese Utilities würde der Widget eigene Format-Logik duplizieren

**Empty State:**
- Swords-Icon + "Noch kein Spieltag" Text
- CTA → `/fantasy` (zum ersten Event anmelden)

**Platzierung:** Zwischen ScoutCardStats und Top-Mover-Block in Main Column (`page.tsx`)

**i18n:** `home.lastGameweek.*` Namespace (de.json + tr.json) — title/score/rank/reward/allHistory + emptyTitle/Desc/Cta

**Verifiziert:** jarvis-qa zeigte echte Daten — "Sakaryaspor Fan-Challenge" / 487 Score / #26 Rank / +250 CR Reward / 7 Lineup-Slots

## Track C — Mystery Box Compliance (Commit d995738)

**Änderungen:**
- `MysteryBoxModal.tsx` — Kauf-Option entfernt. `canAfford = hasFreeBox` (nicht mehr Balance-check)
- Wöchentlich → täglich: 3 Call-Sites geändert: `useHomeData.ts`, `page.tsx`, `missions/page.tsx`
- Neu: `dailyBoxClaimed` State tracking

**Offen (Scope-Creep C4):** Backend `open_mystery_box_v2` RPC — prüfen ob `freeMysteryBoxesPerWeek` auf daily switched ist

## Track D — BeScout Liga (Deferred)

Separates Feature-Projekt, spec-phase. SSOT: `memory/project_bescout_liga.md`.

**Kern:** Saisonbasiertes Ranking-System. 80% schon gebaut (12-Tier Elo, Gamification, Missions, Score Road). 20% Delta: Saison-Modell (DB), Monats-Sieger, Rankings Hub Page, Economy-Verknüpfung, CardMastery (neues Konzept, existiert nicht im Code).

**Blocker:** Polish Sweep muss fertig sein bevor Liga gebaut wird.

## Polish Sweep Pattern (Meta)

**Krümel-Regeln:**
1. Nur 1 Page gleichzeitig `in_progress`
2. Commit pro Page
3. Scope Creep → Scope-Creep-Log in `polish-sweep.md`, nicht sofort fixen
4. Fertig = tsc clean + visual verify + Screenshot bewiesen

**QA-Script:** `MSYS_NO_PATHCONV=1 npx tsx e2e/qa-polish.ts --path=/ --slug=home`

**Screenshots:** `e2e/screenshots/polish-sweep/<slug>/{mobile,desktop}.png` (390×844 / 1280×900)

## Status
- Home (#1): ✅ DONE (Pass 1 A+C + Pass 2 B1)
- Nächste Page: Market (#2) `/market`
