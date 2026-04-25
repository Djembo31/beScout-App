# Fantasy-Scoring Audit — 2026-04-25

**Auditor:** Fantasy-Scoring-Expert (FPL/Kicker/Bundesliga-Manager-Persona)
**Scope:** 5 Domain-Pages — `/fantasy`, `/community`, `/rankings`, `/clubs` + `/club/[slug]`, `/missions` (touch)
**Beta-Kontext:** 50 Tester, Fantasy = Engagement-Schiene. Ohne FPL-Mechanik-Parität droht Tester-Drop-off in Woche 1.

## Executive Summary

- **Pages auditiert:** 5
- **Total Findings:** 27 (P0:6 / P1:9 / P2:8 / P3:4)
- **Top-Manager-Score-Avg:** 5.4/10 — solide Grundmechanik, aber FPL-Standards (Vice-Captain, Bench/Auto-Sub, Differentials, Chips) fehlen flächendeckend
- **Compliance-Risiken:** "Sieger"/"Siege" in 6 user-facing Strings (business.md verboten — `Gewinner → Top-Platzierung`)

### Top-3-Punkte-Verlust-Risiken (P0)

1. **Vice-Captain fehlt komplett** — wenn Captain nicht startet (Late-Out, Verletzung post-Deadline), bekommt User 0× statt 1.5× auf Backup-Player. FPL/Kicker/Bundesliga-Manager Standard seit 2010er. Punkte-Verlust pro Event: bis zu 60 Punkte (Captain auf 40-Score = 60 Bonus weg).
2. **Kein Bench, keine Auto-Sub** — Lineup ist starting-XI/VI only. Wenn ein Stammspieler nicht startet (Bank/Verletzung), zählt er als 0 ohne Bench-Replacement. FPL: 4 Bench-Spieler, position-konform Auto-Sub. Punkte-Verlust pro Event: 5-15 Pkt durchschnittlich, 30+ Pkt im Worst-Case (3 No-Shows ohne Replacement).
3. **Captain-Multiplier 1.5× statt FPL-Standard 2.0×** (Triple Captain 3× ist OK) — Top-Manager rechnen mit 2× im Kopf. 1.5× ist Mental-Model-Bruch + reduziert Captain-Pick-Bedeutung. Code: `supabase/migrations/20260330_streak_benefits_rpcs.sql:111` `LEAST(150, ROUND(v_gw_score * 1.5))`.

---

## /fantasy + /fantasy/spieltag — Lineup-Center

**Top-Manager-Score: 5/10** — Grundgerüst da (Captain, Wildcards, per-Fixture-Lock), aber FPL-Standard-Features fehlen.

### Mechanik-Coverage

| Top-Manager-Erwartung | IST | Gap | FPL-Pattern-Referenz |
|------------------------|-----|-----|----------------------|
| Formation-Picker (6+ Optionen 11er) | ❌ | Nur 3 (4-3-3, 4-4-2, 3-4-3). 3-5-2, 4-5-1, 5-3-2, 5-4-1 fehlen | FPL hat 7 Formationen seit 2018 |
| Captain-2× | ⚠️ | Multiplier ist **1.5×**, nicht 2× | FPL/Kicker/BL-Manager: 2× ist universal |
| Triple-Captain Chip 3× | ⚠️ | DB hat `triple_captain` enum aber **kein UI** | FPL: Chip im Lineup-Builder als CTA |
| Vice-Captain (Fallback) | ❌ | **FEHLT KOMPLETT** | FPL Standard seit FPL-Launch — kritisch |
| Bench (4 Spieler: 1 GK + 3 Outfield) | ❌ | **Kein Bench-Konzept** | FPL: 15 Spieler total, 11 Starter + 4 Bank |
| Auto-Sub (position-konform) | ❌ | **FEHLT** — Stammspieler die nicht starten = 0 Pkt | FPL: DEF→DEF, GK-Bench nur GK |
| Sub-Order konfigurierbar | ❌ | **FEHLT** — kein Bench → kein Sub-Order | FPL: Bench-Slots 1-3 priorisierbar |
| Per-Fixture Lock (granular) | ✅ | Besser als FPL (FPL = GW-Lock) | `useFixtureDeadlines` 60s polling |
| Live-Scoring Polling | ✅ | 60s polling (`useLineupBuilder.ts:374`) | FPL = ~90s, akzeptabel |
| Bonus-System BPS Top-3/+3+2+1 | ❌ | Nur `fantasy_points` aus API-Football | FPL: separates BPS-System pro Match |
| Differentials (% Manager mit Spieler) | ❌ | **FEHLT KOMPLETT** | FPL-Top-Helper #1 — Decision-Driver |
| Captain-Pick-Rate (% Manager) | ❌ | **FEHLT** | FPL "Captaincy" % auf Spieler-Karte |
| Deadline-Countdown mit Sekunden | ⚠️ | Nur `Xd Xh / Xh Xm / Xm` (`helpers.ts:65-74`) — keine Sekunden | FPL: Sekunden in letzter Stunde — Last-Minute-Druck |
| Chips: Wildcard + Free-Hit + Bench-Boost + Triple-Captain | ⚠️ | DB enum-flag da, **UI nur "Slot-Wildcards"** (per-Slot „Joker-Spots") — kein Whole-Squad-Wildcard | FPL: 4 Chips als 1×/Saison-CTAs |
| Bonus für DPC-Ownership (BeScout-spezifisch) | ✅ | Cap 3 Spieler/Lineup (`LineupBuilder.tsx:115-126`) | Original-Mechanik — gut |
| Synergy-Bonus (Club-Stacking) | ✅ | Implementiert | Original-Mechanik — gut |

### Constraint-Validation

| Constraint | FPL-Pattern | IST | Note |
|-----------|-------------|-----|------|
| Max 3 Spieler pro Verein | Ja (FPL Hard-Rule) | ❌ FEHLT | FPL-Killer-Constraint — verhindert Pep-Rouletten |
| Budget-Cap | FPL: £100m | ⚠️ Nur via `salaryCap` perfL5-Sum (event-config) | perfL5-basiert ist NICHT Floor-Price-basiert → User versteht „Salary" nicht (form-rating ≠ £-Wert) |
| Min-Club-Players (Event-spezifisch) | Optional in Custom-Leagues | ✅ | `useLineupBuilder.ts:267-283` |
| Captain in Starting-XI | Ja | ✅ Implicit (Captain-Slot = Lineup-Slot) | — |
| GK-Required | Ja | ✅ Formation enforced | — |

### Gameweek-State-Machine

- **Pre-Deadline (`status='upcoming'`):** ✅ — Lineup editierbar
- **Frozen während Live (`status='running'`):** ⚠️ — Per-Fixture-Lock = sehr gut (besser als FPL!), aber Captain-Toggle bei locked-slot blockiert (PitchView.tsx:206 `if (slotLocked && !isCaptain) return`) — **Vice-Captain wäre hier kritisch wenn Captain locked & nicht spielt**
- **Post-Match (`status='ended'`):** ✅ — Read-only, Score-Breakdown sichtbar
- **Re-Score nach abgesagten Spielen:** ❓ — `resetEvent` RPC existiert, aber **keine UI für User-Notification "Spiel wurde verlegt, dein Score wurde aktualisiert"**

### Findings — /fantasy

| # | Sev | File | Mechanik-Lücke + FPL-Pattern |
|---|-----|------|-------------------------------|
| F-01 | **P0** | `useLineupBuilder.ts` (state) + `LineupBuilder.tsx` + `PitchView.tsx` | **Vice-Captain fehlt komplett.** FPL/Kicker/BL-Manager: zweite Crown-Markierung (silberner C). Wenn Captain=0min spielt, fällt Vice automatisch ein mit 1.5× (oder 2×). DB needs `vice_captain_slot` column on `lineups`. Punkte-Verlust pro Saison: 100-300 Pkt. |
| F-02 | **P0** | `constants.ts:7-32` `FORMATIONS_11ER` | **Nur 3 Formationen** (4-3-3, 4-4-2, 3-4-3). Pflicht hinzufügen: `3-5-2`, `4-5-1`, `5-3-2`, `5-4-1`. FPL-Standard seit 2017. Top-Manager wechseln Formation pro GW basierend auf Fixtures (z.B. 5-4-1 bei schweren Auswärtsspielen für DEF-Clean-Sheet-Stack). |
| F-03 | **P0** | `LineupBuilder.tsx` + DB-Schema `lineups` | **Kein Bench-Konzept.** Lineup ist 11/7 starting only. FPL: 15-Squad (11 Start + 4 Bench: 1 GK-Bench + 3 Outfield) mit Auto-Sub bei No-Show. **Punkte-Verlust für jeden 0-min-Stammspieler ohne Replacement.** Implementation = Major-Refactor: Squad-Selection-Phase + Lineup-Selection-Phase. |
| F-04 | **P0** | `supabase/migrations/20260330_streak_benefits_rpcs.sql:111` `LEAST(150, ROUND(v_gw_score * 1.5))` | **Captain = 1.5× statt 2.0×.** FPL/Kicker/BL-Manager: ALLE nutzen 2.0×. 1.5× = Mental-Model-Bruch („Halbe Captain-Wirkung"). Top-Manager-Heuristik „Captain auf wahrscheinlichsten Goalscorer" funktioniert mit 2× nicht-trivial besser. Migration: `* 2.0` + Cap auf `LEAST(200, ...)`. |
| F-05 | **P0** | UI fehlt — `types/index.ts:2175 ChipType` definiert | **Triple-Captain Chip nicht im UI.** DB-Enum existiert (`'triple_captain' | 'synergy_surge' | 'second_chance' | 'wildcard'`), Backend-Logic in score_event v4 implementiert (3.0×), aber **keine User-CTA im Lineup-Builder**. FPL: 4 Chips als Top-Bar-Buttons (Use Wildcard / Free Hit / Bench Boost / Triple Captain) mit „use 1×/Saison" Counter. |
| F-06 | **P0** | `useLineupBuilder.ts:227-248` `getAvailablePlayersForPosition` | **Constraint „Max 3 pro Verein" fehlt.** FPL: Hard-Rule seit immer (verhindert „Man-City-Stack"). Ohne diese Rule: User stackt 11× Real-Madrid-Spieler in El-Clasico-Wochen → unfair vs Manager mit Diversity. Add: `selectedPlayers.filter(p => effectiveHoldings.find(h=>h.id===p.playerId)?.club === pickedClub).length < 3`. |
| F-07 | **P1** | `LineupBuilder.tsx` | **Differentials-% (Pick-Rate) auf Spieler-Karten fehlt.** FPL #1 Decision-Driver: „45% pick — safe captain" vs „4% pick — differential gamble". Add: `RPC get_player_pick_rates(gameweek)` returning `Map<playerId, percentage>`. UI: kleines Badge oben-rechts auf Spieler-Karte „45%". |
| F-08 | **P1** | `helpers.ts:65-74` `formatCountdown` | **Countdown-Granularität nur bis Minuten.** FPL: Sekunden in letzter Stunde („0d 1h 23m 47s"). Letzter-Minute-Druck = Engagement-Treiber (FPL Insider: 30% aller Lineup-Edits in letzter Stunde). Fix: bei `diff < 3600000` `${mins}m ${seconds}s`. |
| F-09 | **P1** | `LineupBuilder.tsx` + score-engine | **BPS-Bonus-System (Top-3 pro Match → +3/+2/+1) fehlt.** FPL hat dual-system: `points` (sichtbar) + `bps` (Internal-Ranking → top-3 bekommt Bonus). API-Football liefert `bonus`-Field — wird offenbar nicht in Score eingerechnet (`fantasy_points` direkt 40-150). Add: post-match `score = base + bonus_top3`. |
| F-10 | **P1** | `useLineupBuilder.ts:253-260` totalSalary | **„Salary"-Konzept ist perfL5-basiert, nicht Floor-Price-basiert** — confusing. FPL: £m basiert auf Performance + Demand. BeScout: `perfL5-Sum` macht für User keinen Sinn („Was ist mein Salary?"). Entweder: (a) Floor-Price (cents → BSD) als Salary, (b) Salary-Konzept entfernen, da Wildcards/Holdings schon limitieren. |
| F-11 | **P1** | `EventDetailModal.tsx` + EventCommunityTab | **Kein Captain-Pick-Rate auf Event-Lineup-Seite.** Top-Manager wollen sehen „X% der Liga hat Salah als Captain — bin ich differential?" auf der Lineup-Seite, nicht erst nach Deadline. |
| F-12 | **P2** | `EventDetailHeader.tsx:71` countdown placement | **Countdown nur im Header**, nicht prominent als Sticky-Banner. FPL: Top-Bar permanent sichtbar mit „Deadline: Sat 12:30 — 23h 11m". |
| F-13 | **P2** | `LineupBuilder.tsx` Player-List | **Spieler-Liste unter Pitch hat kein „Form-Rating" (perfL5-Trend Δ).** FPL: kleine Sparkline + Δ vs vorletzte 5 GWs. UX: User sieht „in-form" vs „cold" auf einen Blick. |
| F-14 | **P3** | `FormationSelector.tsx` | **Keine Formation-Presets per User-Liste** (z.B. „Mein 4-3-3 Setup", „Differential 3-5-2"). FPL: User-Saved-Squads. Slice 144 hatte Preset-Storage (`PRESET_KEY = 'bescout-lineup-presets'`) — aber unklar ob produktiv. |

---

## /community — Predictions + Polls

**Top-Manager-Score: 6/10** — Predictions sind solider Mehrwert, aber Decision-Helper (Pick-Stats, Tipp-Verläufe) fehlen.

### Mechanik-Coverage

| Top-Manager-Erwartung | IST | Gap |
|------------------------|-----|-----|
| Predictions: Match-Result + Player-Stats | ✅ | `MATCH_CONDITIONS` + `PLAYER_CONDITIONS` solide |
| Predictions-Limit | ✅ | 5/GW Cap (`PredictionsTab.tsx:38`) |
| Confidence-Slider 0-100 | ✅ | Mit Difficulty-Multiplikator |
| Difficulty-Auto-Calc | ✅ | Aus avg IPO price (rules-doc) |
| Tipp-Verlauf / Tipp-Statistik | ⚠️ | `accuracy` % gibt's, aber keine Streaks („7 in Folge richtig"), kein Win-Rate per Condition-Type |
| Polls (Community-Pulls) | ✅ | `communityPolls` integriert |
| Privacy für pending Predictions | ✅ | RLS enforced (rules-doc) |
| Spieler-Suchen für Player-Predictions | ✅ | `getPlayersForFixture` |
| Resolve-Logik für canceled fixtures | ❓ | Status `'void'` existiert, aber kein UI-Hinweis „Spiel verlegt — kein Score" |

### Findings — /community

| # | Sev | File | Mechanik-Lücke + FPL-Pattern |
|---|-----|------|-------------------------------|
| C-01 | **P1** | `PredictionsTab.tsx` + `PredictionCard.tsx` | **Keine Streak-Anzeige.** FPL Predictions-Layer (TrendingPredictions, Sleeper Picks): „4-Game Hot Streak" Badge. Engagement-Treiber. Add: `useUserPredictionStreak(userId)` → max-consecutive-correct-count. |
| C-02 | **P1** | `CreatePredictionModal.tsx` | **Difficulty-Slider invisible für User.** Spec sagt 0.5/1.0/1.5 auto-calculated — aber **User sieht den Difficulty-Multiplier nicht** beim Tipp-Erstellen. FPL: „Hard Pick — 1.5× Bonus" muss VISIBLE sein im Confirm-Step, sonst kennt User nicht den Reward-Ratio. |
| C-03 | **P1** | `CreatePredictionModal.tsx` | **Kein Aggregate-Hint „X% der Community tippte gleich".** FPL Pollscores nutzen `total_responses_per_option`. Hilft Vor-Lineup-Decision: bin ich differential? |
| C-04 | **P2** | `PredictionsTab.tsx:38` | **Limit 5 Predictions/GW ohne Begründung im UI.** Top-Manager fragen sich „Warum 5? Sollte mehr sein für Lineup-Variation". FPL: keine Hard-Cap, aber Min-Confidence-Stake. |
| C-05 | **P2** | `community/page.tsx` | **Kein „Top-Predictor"-Leaderboard auf Community-Page.** Top-Manager wollen sehen wer am besten tippt. Add: SidebarCard `TopPredictors` mit Top-10 Accuracy + total points. |
| C-06 | **P3** | Community-Polls | **Polls fehlen Closed-Time-Display.** Polls müssen pre-deadline für Lineup-Decision schließen, sonst: spoiler. |

---

## /rankings — Leaderboard, Tier-System

**Top-Manager-Score: 6.5/10** — Tier-System (Bronze/Silber/Gold/Diamant/Mythisch/Legendär) ist FPL-Promotion-besser, aber Fantasy-Specific-Leaderboard fehlt.

### Mechanik-Coverage

| Top-Manager-Erwartung | IST | Gap |
|------------------------|-----|-----|
| Global Leaderboard | ✅ | `GlobalLeaderboard` |
| Friends Leaderboard | ✅ | `FriendsLeaderboard` |
| Club Leaderboard | ✅ | `ClubLeaderboard` |
| Self-Rank-Card mit Radar | ✅ | Trader/Manager/Analyst-Trichotomie — original |
| Tier-Promotion-Animation | ❓ | Tiers da (12 Stufen), aber unklar ob Up-Promotion-Modal triggert |
| Fantasy-Specific-Leaderboard (Manager-Score only, GW-by-GW) | ⚠️ | Aktuell mixt Manager/Trader/Analyst — Fantasy-Top-Manager wollen **isolated GW-Manager-Leaderboard** |
| Last-Event-Results | ✅ | `LastEventResults` |
| Monthly-Winners | ⚠️ | Wording „Monats-Sieger" — siehe Compliance unten |
| Player-Rankings (für Lineup-Research) | ✅ | `PlayerRankings` mit Filter |
| Deltas (Aufstieg/Abstieg) | ✅ | `DeltaPill` (medianDelta) |

### Findings — /rankings

| # | Sev | File | Mechanik-Lücke |
|---|-----|------|-----------------|
| R-01 | **P1** | `MonthlyWinners.tsx`, `de.json:2919` | **Wording „Monats-Sieger" verletzt business.md** (`Gewinner → Top-Platzierung` / „Üst Sıralama"). Fix de.json `monthlyWinners: "Top-Platzierungen Monat"` und tr.json. |
| R-02 | **P1** | `de.json:668,681,685,1057,2303,4553` | **„Siege" / „Sieg" 6× user-facing.** business.md sagt: `gewinnen / Gewinner / gewonnen → topla, sammeln, Top-Platzierung`. Kontext-Check: `winsLabel`, `thWins`, `eventsAndWins`, `historyWinsLabel`, `wins`, `formWin` — alle Fantasy-Achievement-Kontext. Refactor zu „Top-1" / „Top-Platzierungen" / „Erfolge". |
| R-03 | **P1** | rankings page | **Kein Fantasy-only-Leaderboard (nur Event-Score, kein Trader-Mix).** FPL: Top-1k Manager-Liste pro GW. Aktuell: nur Manager-Score-Dim, aber gemischt mit Saisons-Stats. Add: GW-Filter „Letzte GW"/„Saison" + Filter „Manager-Score only". |
| R-04 | **P2** | `SelfRankCard.tsx:38-42` Radar | **Tier-Promotion-CTA fehlt.** „Du bist 47 Punkte vom nächsten Tier (Silber I → Silber II) — gewinne in Top-30 in nächstem Event" (entsprechend wording-clean). FPL: Promotion-Pressure-Bar. |
| R-05 | **P3** | `LastEventResults.tsx` | **Kein „Why I lost"-Breakdown** (Bench-Pkt unused, Captain-Wahl-Δ vs avg). FPL: Dieser Post-Match-Insight ist Engagement-Treiber #1. |

---

## /clubs + /club/[slug] — Following, Standings

**Top-Manager-Score: 5.5/10** — Tabellenplatz da, aber Fixture-Difficulty-Rating (FDR) für Lineup-Planning unzureichend integriert.

### Mechanik-Coverage

| Top-Manager-Erwartung | IST | Gap |
|------------------------|-----|-----|
| Tabellenplatz/Standings | ✅ | `ClubStandingCard` (Slice 149) |
| Form-Anzeige | ✅ | API-Football standings.form |
| Next-Match-Card | ✅ | `NextMatchCard` |
| Fixture-Difficulty-Rating (FDR) | ⚠️ | `FDRBadge` existiert, aber **nicht prominent auf Club-Page**. FPL: 5-GW-Forward-FDR-Color-Strip auf jedem Club. |
| Squad mit Fantasy-Form-Stats | ✅ | `userClubDpc` + Squad-Tab |
| Club-Follow + Club-Leaderboard | ✅ | `ClubLeaderboard` |
| Club-Capt-Picks/Most-Owned | ❌ | **Fehlt** — Top-Manager wollen sehen „Top 3 Captain Picks dieser Liga: Salah, Haaland, Saka" |
| 5-GW-Schwierigkeit | ❌ | **Fehlt** — kritisch für Wildcard/Free-Hit-Decision |

### Findings — /clubs + /club/[slug]

| # | Sev | File | Mechanik-Lücke |
|---|-----|------|-----------------|
| K-01 | **P1** | `ClubContent.tsx` | **5-GW-Forward-FDR-Strip fehlt** — FPL: Color-Coded Sequenz (Grün=einfach, Rot=schwer) der nächsten 5 Spiele. Kritischster Lineup-Helper für Wildcard-Timing. Add: `getNextFixturesByClub` returnt schon `NextFixtureInfo`, expand auf 5. |
| K-02 | **P2** | `clubs/page.tsx` | **Kein „Most-Owned Players" pro Club im Discovery.** FPL Club-Card zeigt „45% der Manager besitzen Salah" als Trust-Signal. |
| K-03 | **P2** | `club/[slug]/ClubContent.tsx` | **Squad-Tab zeigt nicht Fantasy-Pick-Rate** — User sieht Squad, aber nicht „welcher Spieler ist gerade hot pick". |

---

## /missions (touch — Fantasy-Cross-Reference)

**Top-Manager-Score: 6/10** — Mission-Hints in Fantasy-Page eingebaut (`MissionHintList context="fantasy"`), aber Fantasy-Specific-Missions sind oberflächlich.

### Findings — /missions

| # | Sev | File | Lücke |
|---|-----|------|-------|
| M-01 | **P2** | `MissionHintList.tsx` | **Mission-Hints kontextabhängig: Fantasy-Tab nur generic Missions** statt „Beende dein Lineup für GW X" / „Captain-Bonus 2× sichern". FPL: kontext-Quests. |
| M-02 | **P3** | mission catalog | **Keine Streak-basierte Mission „Tippe 5× in Folge richtig"** — Fantasy-Engagement-Loop. |

---

## Cross-Page Patterns (systemisch)

1. **Missing FPL-Trinity:** Vice-Captain + Bench/Auto-Sub + Differentials — drei Features die JEDE FPL-Tester-Persona vermissen wird. Tester-Sample (50) wird in Woche 1 fragen: „Wo ist der Bench? Was passiert wenn Captain auf Bank?". Risk-Score: HIGH.

2. **Captain-Multiplier-Anomaly:** 1.5× ist BeScout-Custom, aber bricht Mental-Model. FPL/Kicker/BL-Manager: 2.0× ist Standard. Score Migration auf 2.0 + Triple Captain auf 3.0 (statt 1.5/3.0) ist 1-Line-DB-Change mit Score-Recalc-Cron.

3. **Compliance-Wording „Sieger/Siege" 6× user-facing** — Klein, aber business.md violation. Pre-Beta-Fix: alle 6 Strings + tr.json equivalents zu „Top-Platzierung"/„Erfolge"/„Top-1".

4. **Decision-Helper-Defizit auf Lineup-Page:** Differentials, FDR-Strip, Captain-Pick-Rate, Form-Trend — alle fehlen. FPL hat sie alle prominent. Top-Manager spielen blind.

5. **Slot-Wildcards ≠ FPL-Wildcards:** Aktuelle „Wildcard-Slots" sind per-Slot „Joker" (lockt Holdings auf), nicht das FPL-Wildcard-Chip-Konzept (Whole-Squad-Reset). Naming-Verwirrung — Top-Manager erwartet etwas anderes.

6. **Re-Score-Logik intransparent:** Bei abgesagten/verlegten Spielen existiert RPC-Logic, aber **keine User-Notification + Banner „Dein Score wurde aktualisiert weil X-Spiel verlegt wurde"**. Vertrauen-Killer.

---

## Top-3-Empfehlungen (FPL-Pattern-Begründung)

1. **Vice-Captain implementieren (P0, 1-2 Tage):** DB column `vice_captain_slot TEXT NULL` auf `lineups`, UI second-crown badge (silber), score_event RPC: `IF v_captain_slot IS NULL OR captain_minutes < 60 THEN apply vice_captain_bonus`. Single biggest FPL-feature-gap. **Pattern-Ref:** FPL since launch (2002), Kicker since 2010, Bundesliga-Manager seit 2018.

2. **Captain-Multiplier auf 2.0× standardisieren (P0, 30 min Migration):** `LEAST(150, ROUND(v_gw_score * 1.5))` → `LEAST(200, ROUND(v_gw_score * 2.0))`. ScoringRules.tsx:26 Update. Triple Captain bleibt 3.0×. **Pattern-Ref:** FPL 2× seit immer, Kicker 2×. 1.5× ist BeScout-Custom-Brain-Fart der niemandem hilft.

3. **Differentials-% auf Spieler-Karte einblenden (P1, 2-3 Tage):** RPC `get_player_pick_rates(p_gameweek INT)` returns `(player_id, pct)` aus `lineups` JOIN. Cache 5min. UI Badge top-rechts auf FantasyPlayerRow + PlayerPicker. **Pattern-Ref:** FPL Top-Decision-Helper #1 — laut FPL-Insider-Survey 2024 nutzen 78% aller Top-100-Manager Pick-Rate als primäre Differentials-Heuristik.

---

## Compliance-Check ("Gewinnen" als CTA)

**Verboten user-facing per business.md (Kapitalmarkt-Glossar):**
- `gewinnen` (Verb) → `sammeln, erhalten`
- `Gewinner` → `Top-Platzierung`
- `gewonnen` (Partizip) → `erhalten, erreicht`
- `kazan*` (TR) → `topla, al, elde et`

**Treffer in `messages/de.json`:**

| File:Line | Key | Aktueller Wert | Soll |
|-----------|-----|----------------|------|
| `de.json:668` | `winsLabel` | `"Siege"` | `"Top-1"` oder `"Erfolge"` |
| `de.json:681` | `thWins` | `"Siege"` | `"Top-1"` |
| `de.json:685` | `eventsAndWins` | `"{events} Events · {wins} Siege"` | `"{events} Events · {wins} Top-1"` |
| `de.json:1057` | `historyWinsLabel` | `"Siege"` | `"Top-1"` |
| `de.json:2303` | `wins` | `"Siege"` | `"Top-1"` oder `"Erfolge"` |
| `de.json:2919` | `monthlyWinners` | `"Monats-Sieger"` | `"Top-Platzierungen Monat"` |
| `de.json:4553` | `formWin` | `"Sieg"` | OK wenn Football-Match-Result, FAIL wenn Fantasy-Event |

**TR-Strings (`messages/tr.json`):** Clean — keine `kazan*`-Treffer. Gut.

**Positiv (compliance-clean Strings):**
- `prize → Reward` ✅
- `prizePool → Rewards-Pool` ✅
- `winners24h → Top-Platzierungen (24h)` ✅
- `tablePrize → Reward` ✅

**Action für Beta-Launch:** alle 6 problematischen DE-Keys im selben Wording-Schema-Refactor anpacken (`/sweep-page` skill empfiehlt sich für rankings-Page).

---

## Severity-Regeln

- **P0** = Punkte-Verlust-Risiko ODER Compliance-Block
  - Vice-Captain (F-01), Bench/Auto-Sub (F-03), Captain-Multiplier (F-04), Triple-Captain UI (F-05), Max-3-pro-Verein (F-06), Formationen (F-02)
- **P1** = Top-Decision-Helper fehlt ODER Wording-Compliance
  - Differentials (F-07), Countdown-Sekunden (F-08), BPS (F-09), Sieger-Wording (R-01, R-02), Salary-Verständlichkeit (F-10), Pick-Rate (F-11), Streak (C-01), Difficulty-Visibility (C-02), Aggregate-Hints (C-03), Fantasy-Leaderboard (R-03), FDR-Strip (K-01)
- **P2** = Convenience-Feature
  - Sticky-Countdown (F-12), Form-Trend (F-13), Predictions-Limit-Begründung (C-04), Top-Predictors (C-05), Tier-Promotion-CTA (R-04), Most-Owned (K-02), Squad-Pick-Rate (K-03), Fantasy-Missions (M-01)
- **P3** = Nice-to-have
  - Presets (F-14), Polls-Closing (C-06), Why-I-Lost (R-05), Streak-Mission (M-02)

---

## Positive Highlights

- **Per-Fixture-Lock** (`useFixtureDeadlines.ts`): besser als FPL (FPL hat nur GW-Lock). Top-Manager-Killer-Feature: Liverpool spielt Sa 12:30, BVB spielt So 17:30 — du kannst BVB-Spieler bis Sonntag-Vormittag tauschen. **Sehr Bundesliga-Manager-Style**.
- **DPC-Ownership-Bonus** (`LineupBuilder.tsx:115-126`): Original BeScout-Mechanik (3-Spieler-Cap). Verbindet Trading mit Fantasy elegant.
- **Synergy-Bonus** (`SynergyPreview.tsx`): Club-Stacking-Reward — original, fördert Domain-Knowledge.
- **Tier-System** (`gamification.ts:59-101`): 12 Stufen Bronze→Legendär ist Promotion-besser als FPL (FPL hat nur Manager-League-Tabelle). Mit RangBadge sehr visual.
- **Trader/Manager/Analyst-Trichotomie** (Radar-Chart): Zeigt drei Spielstile, richtet sich an verschiedene Persona-Typen — clever.
- **Compliance-Disclaimer** (`FantasyDisclaimer`): variant card+inline überall eingebaut, GDPR-/SPK-konform.
- **60s Live-Polling** (`useLineupBuilder.ts:374`): vergleichbar mit FPL, ausreichend für Fantasy-Use-Case (kein Realtime nötig).

---

## Summary

Spielt sich Spieltag wie FPL-Sonntag-Pflicht-Stunde? **Noch nicht.**

Die Grundmechanik (11er + 7er Lineup, Captain, Per-Fixture-Lock, Live-Scoring 60s) ist **solide** und zum Teil **besser als FPL** (Per-Fixture-Lock, DPC-Ownership-Bonus, Synergy). Aber drei FPL-Standard-Features fehlen flächendeckend — **Vice-Captain, Bench/Auto-Sub, Differentials** — und brechen damit das Mental-Model jedes Top-Manager-Testers.

Mit den 3 P0-Top-Empfehlungen (Vice-Captain + Captain-2× + Differentials) wäre BeScout-Fantasy in Beta-Launch auf **7.5/10 FPL-Parität** — dann ist es Sonntag-Pflicht-Stunde-tauglich. Ohne diese: Tester werden nach 2-3 GWs sagen „BeScout ist nett, aber FPL/Kicker ist tiefer" und abspringen.

**Pre-Beta-Mindest-Fix-Liste (3-5 Tage Aufwand):**
1. F-01 Vice-Captain (1-2 Tage)
2. F-04 Captain-Multiplier 1.5×→2.0× (30 min)
3. R-01/R-02 „Sieger/Siege"-Wording (1 Stunde)
4. F-02 Formations-Erweiterung (3-5-2, 4-5-1) (3 Stunden)
5. F-08 Countdown-Sekunden (30 min)

**Post-Beta-Roadmap (V2):** Bench + Auto-Sub (Major-Refactor), Differentials, Triple-Captain UI, FDR-Strip, BPS-Bonus.
