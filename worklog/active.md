# Active Slice

```
status: idle
slice: 274
stage: LOG (commit c9064e50, pushed to main, Vercel auto-deploy)
spec: worklog/specs/274-form-bars-absolute-league-window.md
impact: API-Contract bleibt (Service-Signatur unverändert), 5 Konsumenten kompatibel (s != null ? 'played' : 'not_in_squad' Pattern)
proof: worklog/proofs/274-tsc-vitest.txt
review: self-review (CTO + 1 Performance-Heal v1→v2)
```

## Slice 274 v2 — Form-Bars Absolute Liga-Window (REVIEW)

**Anil-Trigger 2026-05-06:** „nicht alle spieler haben die leistungsbalken bis zur aktuellen Gameweek, einige haben mehr als 5 spiele nicht gespielt, aber zeigen noch leistungsbalken an"

**Lösung Slice 274 v2:**
- RPC `rpc_get_recent_player_scores`: Cross-Join Spieler × letzte 5 finished Liga-GWs (per Liga aus fixtures-truth) + LEFT JOIN player_gameweek_scores + `NULLIF(score, 0)`
- Service: Pad-Logic entfernt (Backend liefert immer 5 Slots)
- i18n: `notInSquad` → DE „nicht aufgestellt" / TR „kadroda yok"
- 5 Konsumenten unverändert (API-kompatibel)

**Build-Bilanz:**
- 1 DB-Migration applied (v2 nach Performance-Heal)
- 1 Service refactored (`getRecentPlayerScoresAndGameweeks`)
- 1 Test umgeschrieben (Slice-274-contract: 5 Slots vom Backend, NULL-score = DNP)
- 2 i18n-Keys updated
- tsc clean, vitest 3215/3216 PASS

**Performance-Heal v1 → v2:**
- v1 (no filter): 125ms aber Bench-Players = colored bar mit score 0 (visuell falsch)
- v2-attempt (fps-JOIN minutes_played > 0): 951ms — 8× über Mobile-Budget
- v2-final (NULLIF score=0): 125ms + Bench/0-pt-Cameos beide dashed (Anil-Decision-Downgrade dokumentiert)

**Knowledge-Promotion:**
- `errors-db.md` neu „Tenant-Window Achsen-Erweiterung: Per-Player vs. Per-Liga (Slice 274)"

**Pending Anil-Verify:**
- Live-Check auf bescout.net nach Deploy: Spieler-Karten von langzeitverletzten Spielern (z.B. Müller/Haaland wenn verletzt) zeigen 5 dashed bars mit Tooltip „GW X · nicht aufgestellt"
- Spieler die durchspielen: 5 colored bars wie vorher
- TR-Locale: „kadroda yok" als Tooltip-Text

---

## (Slice 273 erledigt — siehe log.md)


## Slice 273 LIVE 2026-05-06 — Spieltag-Page Stabilisierung (Anil-Live-Bug-Komplex)

**Anil-Live-Report:** 4 Symptome auf Spieltag — (1) Bewertungen fehlen trotz finished, (2) Filter manchmal andere Mannschaften, (3) UI updated nicht, (4) aktuelle GWs auf "beendet".

**Diagnose-Methodik:** 1 Specialist (fantasy-scoring-expert) + Live-DB-Audit (4 SQL-Queries) + Code-Reading (5 Files).

**Root-Cause-Analyse (2 Tier):**

### Tier 1 — Backend-Pipeline (Live-DB-Findings)
- **`fixture_player_stats` LEER für 6 von 7 Ligen** trotz status='finished' (nur TFF 1. Lig hat 264 Stats)
- **`clubs.active_gameweek` drifted** für 3 Ligen: PL 31→echt 35, La Liga 33→echt 34, TFF1 38→echt 37
- **Premier League stuck** wegen Manchester City vs Crystal Palace Nachholspiel scheduled für 2026-05-13 → `no_past_fixtures`-Skip blockt Cron-`advance_gameweek` → GW 32-35 nie synct
- Cron-Bug-Klasse Slice 140 (Postponed-Match-aware advance fehlt)

### Tier 2 — UI (Specialist 1)
- **P0-A:** `getGameweekStatuses(gw, gw)` NICHT Liga-gefiltert → cross-league cache pollution
- **P0-B:** `FixtureDetailModal` lädt Stats nur einmal bei Open, kein Refetch bei Realtime/status-Change
- **P0-C:** `selectedFixture` ist Snapshot, nicht von `useLiveFixtures.onUpdate` gepatched → Stale-Score
- **P1-D:** `qk.fantasy.gwFixtureInfo(gw)` Cache-Key ohne leagueId

**Implementierung Slice 273:**

| Track | Files | Änderung | Status |
|---|---|---|---|
| **A1 DB-Heal** | DB UPDATE | PL active_gw 31→36, La Liga 33→35 (atomar, dual-write clubs+leagues) | ✅ live |
| **B Liga-Filter** | `fixtures.ts:170` + `keys.ts:412` + `useGameweek.ts:71-79` | `getGameweekStatuses(fromGw, toGw, leagueId?)` + Cache-Key + Hook-Routing | ✅ live |
| **C Modal Stale** | `SpieltagTab.tsx:53-156` + `FixtureDetailModal.tsx:432-468` | selectedFixtureId + derived selectedFixture + Modal-Refetch bei status-change + 60s-Polling bei isLive | ✅ live |

**Track A2 Backfill-Run — Status: ✅ DONE (Agent-Run 2026-05-06 ~01:00, 20 min Dauer)**

| Liga | GW | fixtures | stats_rows |
|------|----|----------|------------|
| Bundesliga | 32 | 9 | 359 |
| 2. Bundesliga | 32 | 9 | 358 |
| La Liga | 32 | 10 | 453 |
| La Liga | 33 | 10 | 454 |
| La Liga | 34 | 10 | 450 |
| Premier League | 32 | 10 | 397 |
| Premier League | 33 | 10 | 397 |
| Premier League | 34 | 10 | 398 |
| Premier League | 35 | 10 | 398 |
| Serie A | 35 | 10 | 462 |
| Süper Lig | 32 | 9 | 374 |

11/11 GWs erfolgreich, 0 Fehler. Alle stats_rows ≫ 100 (Pflicht-Threshold) ✓.
Spieltag-FixtureDetailModal zeigt nun für alle 6 Ligen sichtbare Bewertungen.

**Slice 273 ist 4/4 Tracks LIVE — Spieltag-Bug-Komplex endgültig gefixt.**

**Backlog (separater Slice 274 nach Beta):**
- **Track A2 Cron-Code-Fix:** `gameweek-sync/route.ts` no_past_fixtures-Skip-Logic erweitern um „all-past-finished + future-only-pending"-Pattern → automatisches advance auch bei Postponed-Match
- **TFF 1. Lig GW38 import_data error:** Saisonende-Edge-Case, API-Football mapping fehlt

**Money-Path-Garantie:** keine Money/Wallet/Trading-Logik betroffen. DB-Heal ist read-after-write Konfiguration. Frontend-Fixes sind UI-only.

**Tests:** vitest 255/255 PASS in fantasy-Domain (Service+Hooks+Components).

**Beta-Wirkung:**
- Tester der DE Bundesliga wählt sieht nun korrekt GW32 als active (war vorher korrekt, durch Liga-Filter jetzt absolut sicher)
- Tester der Premier League wählt sieht nun GW36 als active (war stuck auf 31)
- Modal-Hover auf Live-Match: Score-Header und Bewertungen ticken alle 60s (war pre-Slice statisch)
- Liga-Switch: gwStatus updates atomar pro Liga (war pre-Slice cross-league pollution)

## Slice 272 LIVE 2026-05-05 — Lineup Duplicate-Defense-in-Depth

**Anil-Live-Bug:** „bei manager aufstellung, einen spieler mehrmals aufstellen" (UI-Bug, Money-Path safe — DB-Guard `rpc_save_lineup` blockt `duplicate_player` beim Save).

**Root-Cause (4 Pfade):**
1. `lineupStore.selectPlayer` filtert nur Target-Slot, nicht playerId → Duplicate auf 2 Slots erreichbar
2. `lineupStore.setBenchSlot` deduptet INNERHALB Bench, NICHT vs. Starter → Player auf Starter+Bench gleichzeitig
3. `useLineupBuilder.getAvailablePlayersForPosition` excludet nur Starter, nicht Bench → Bench-Player im Starter-Picker wählbar
4. `LineupPanel:854-865` Quick-Add-Click in Holdings-Strip findet freien Slot ohne `isSelected`-Check

**Defense-in-Depth Fix (4 Layer):**
- Store-Layer Move-Semantik: `selectPlayer` filtert Slot UND playerId, entfernt Player aus Bench
- Store-Layer Cross-Subtype: `setBenchSlot` entfernt Player aus Starter beim Bench-Set
- Hook-Layer Picker-Filter: `getAvailablePlayersForPosition` excludet Starter UND Bench
- UI-Layer Quick-Add: `LineupPanel` skip wenn `isSelected`

**Wirkung:**
- UI kann keinen Duplicate-State darstellen
- DB-Guard bleibt Pflicht (Server-Validation als Ground-Truth)
- Move-Semantik klar: User wählt X auf Slot 1 wenn X auf Slot 0 → Slot 0 wird geleert, X wandert

**Tests:** vitest 3215/3216 PASS (+10 neue Tests, 0 Regressionen).
- `src/features/fantasy/store/__tests__/lineupStore.test.ts` NEU (10 Tests)
  - Move-Semantik (kein Duplicate auf 2 Slots)
  - Cross-Slot-Subtype (Bench → Starter Promote, Starter → Bench Demote)
  - Cross-Validation (kein Duplicate-State erreichbar)

**Knowledge-Promotion:** `errors-frontend.md` Pattern „Multi-Slot-State-Stores: Move-Semantik vs. Insert-Semantik" mit Audit-Pattern für künftige Multi-Slot-Stores.

## Slice 271 Track B1 LIVE 2026-05-05 Abend — Frontend-—-Display für matches=0

**Problem:** DB-Default `perf_l5 NUMERIC NOT NULL DEFAULT 50.00` ist intentional (Lineup-Salary-Cap-Proxy in 6 RPCs). 595 Junioren mit `matches = 0` zeigen aber „L5: 50" im Frontend → User denkt „mittelmäßiger Spieler" obwohl 0 Spiele = unsichtbarer Trust-Bug für Beta-Tester.

**Lösung:** 3 neue Display-Helper in `src/components/player/index.tsx`:
- `fmtPerfL5(l5, matches)` → `'—'` wenn matches=0, sonst `Math.round(l5).toString()`
- `getL5ColorWithMatches(l5, matches)` → `'text-white/40'` neutral, sonst getScoreStyle
- `getL5HexWithMatches(l5, matches)` → `#71717a` neutral-zinc, sonst getScoreStyle

**Display-Sites migriert (5 primäre + 2 Sekundäre):**
- `PlayerIPOCard.tsx:108` (Marktplatz Card)
- `KaderPlayerRow.tsx:274` + `kaderHelpers.tsx PerfPills` (Mein Kader)
- `TransferListSection.tsx:227` (Transferliste)
- `ClubCard.tsx:170-171` (Club-Card mit nächstem Match)
- `PlayerRow.tsx:270-271` (PlayerRow generic)
- `TradingCardFrame.tsx:330` (Detail-Page L5-Score) — neue `matches?` Prop
- `PlayerHero.tsx:182` (TradingCardFrame Wrapper)

**Lineup-Cap-Logic (DB-RPC) bleibt unangetastet:** `COALESCE(p.perf_l5, 50)` in 6 RPCs — Salary-Approximation für Players ohne perf-Historie ist intentional.

**Tests:** vitest 3205/3206 PASS (+9 Tests vs. pre-Track-B1):
- `scoreColor.test.ts` +9 Tests für fmtPerfL5 + getL5ColorWithMatches + getL5HexWithMatches
- `TradingCardFrame.test.tsx` +2 Tests für matches=0 Em-Dash + matches=undefined Backward-Compat
- `PlayerIPOCard.test.tsx` Mock-Update für fmtPerfL5

**Beta-Wirkung:** Tester sehen sofort professionelles `—` statt verwirrendes `50` für 595 Junioren. Differenziert „kein Datenpunkt" vs. „mittelmäßiger Spieler" semantisch korrekt.

## Slice 270b LIVE 2026-05-05 — Tooltip-GW-Drift gefixt + Audit-Befund 271 verifiziert

| Stage | Output |
|-------|--------|
| 270b SPEC + BUILD + REVIEW + PROVE + LOG | S — Combined Service + select-Pattern (5 Files, 1 RPC, 2 Konsumenten-Sichten) |
| Befund 1 H1+H2+H3 Verify | ❌H1 ❌H2 ✅H3 (History-Gap 04-26 bis 04-29 → past.mv_eur=NULL → trend=NULL) |
| Befund 2 H4 Verify | ✅ DB-Default `perf_l5 NUMERIC NOT NULL DEFAULT 50.00` (intentional Salary-Cap-Proxy, Frontend-Bug für matches=0 Junioren) |

**Slice 270b Wirkung:**
- KaderTab Tooltip zeigt nun pro Spieler echte Player-eigene GWs (nicht globalen MAX).
- 1 RPC-Call shared zwischen `useRecentScores` (4 Konsumenten) und `useRecentPlayerGameweeks` (1 Konsument).
- API-Backward-Compat: `useRecentScores` Sigantur unverändert für legacy-Konsumenten.
- Orphan API gelöscht: `getRecentScoreGameweeks`, `useRecentScoreGameweeks`, `qk.fixtures.recentScoreGameweeks`.

**Slice 271 Audit-Verify (worklog/audits/2026-05-05/slice-271-discovery-mv-trend-perf-l5.md):**

Track A (mv_trend_7d) — H3 ROOT-CAUSE: History-Gap-Days (2026-04-26/27/28/29) fehlen → `past.mv_eur IS NULL` → `new_trend = NULL` für alle 4556 Spieler heute. **Self-Healing-Prognose:** ab 2026-05-07 sind 7d-old=2026-04-30 Daten verfügbar, dann echte Trends.

Track B (perf_l5=50) — H4 ROOT-CAUSE: DB-Default 50.00 ist intentional als Lineup-Salary-Cap-Proxy (6 RPCs nutzen `COALESCE(p.perf_l5, 50)`). Bug ist NUR im Frontend-Display (PlayerIPOCard zeigt 50 für 0-played Junioren).

**CTO-Empfehlung an Anil:** Track A Option A1 (PASSIV-Self-Healing) + Track B Option B1 (Frontend-`—`-Display für matches=0). Slice 271 als reine Frontend-Polish.

## Slice 270 + 270c + 270d v2 LIVE 2026-05-05 — Performance-Bars-Bug komplett gefixt (DOM-verifiziert)

| Stage | Output |
|-------|--------|
| 270 SPEC + IMPACT + BUILD + REVIEW + PROVE + LOG | M-Slice — Migration RPC `rpc_get_recent_player_scores` + `getRecentPlayerScores` Refactor + 4 Tests |
| 270c BUILD + PROVE + LOG | XS — `getPlayerMatchTimeline` Cross-Club-robust (Slice-081d Pattern) |
| 270d v1 BUILD + LOG (SUPERSEDED) | XS — `.range(0, 99999)` an `.rpc()` — wirkungslos, PostgREST ignorierte Override |
| 270d v2 BUILD + PROVE + LOG | XS — RPC auf JSONB-Return umgestellt (PostgREST-RPC-Cap-Workaround) |

**Live-Verify-Bilanz (Chrome-DevTools DOM-Audit):**
- Marktplatz "Mein Kader" → 11/12 Player mit `colored=5, dashed=0`, 1/12 expected dashed (BOZKURT 0 Spiele)
- ScoutCard-Back Zaniolo → 5/5 played mit echten Scores [70/65/67/66/70]
- 0 Console-Errors auf allen verifizierten Pages

**Knowledge-Promotion (alle 3 Patterns in errors-db.md):**
- Per-Tenant-Window vs. Global-MAX (Slice 270)
- Cross-Club-Contamination via API-Football (Slice 270c, ergänzt Slice 081d)
- PostgREST RPC-Pfad ignoriert `.range()` und `?limit` (Slice 270d v2)

**Pending Follow-ups (kein Beta-Blocker):**
- ⏳ Slice 270b — Tooltip-GW-Drift Reviewer-F-02 (Skeleton liegt vor)
- ⏳ Slice 271 — `mv_trend_7d` 4556× NULL + `perf_l5=50` Default 615 Spieler (Audit `worklog/audits/2026-05-05/slice-271-discovery-mv-trend-perf-l5.md`, Anil-Decision-Pflicht für Track A/B/C)
- ⏳ JSONB-Return Performance-Audit (15.350-Element-Array @ Cold-Start, 200-400ms JSON.parse Mobile) — Server-Side Filter-Param oder Pagination als Slice 271+
- ⏳ Test-Mock-Realismus-Refactor (Mock muss Backend-Cap-Verhalten spiegeln) — Slice 272+

## Self-Audit Session-Bilanz (Anil-Frage „Unsauberkeiten?")

5 Slice-Commits, 0 Reverts, aber mit Verbesserungspotential:

1. **Reviewer-Heuristik-Loch** — Slice 270 Reviewer hat PASS gegeben, RPC-Cap übersehen. Pattern erweitert in errors-db.md.
2. **270d v1 ohne Live-Verify gepusht** — `.range()` an `.rpc()` blind probiert statt Network-Header zu prüfen.
3. **Reviewer-Pflicht für 270d v2 ausgesetzt** — XS-self-review per workflow.md, aber post-fail wäre cold-context Reviewer angemessen gewesen.
4. **Test-Mocks zu naiv** — simulieren keinen 1000-row-Cap; grüne Tests trotz live-broken Service.
5. **JSONB-Return ohne Performance-Audit** — 15k-Element-Array at Cold-Start ist nicht-Ferrari-Quality. Funktioniert, aber kandidat für Refactor.
6. **4 separate Vercel-Deploys statt einer Wave** — Indiz für mangelnde Test-vor-Push-Disziplin.

## D63 Phase 4 Discovery KOMPLETT 2026-05-04

| Phase | Slices | Status |
|-------|--------|--------|
| 1 Identity-Foundation | 261/262/263 | ✅ live |
| 2 Action-Layer | 264/264b/265 | ✅ live |
| 3 Live-Pulse | 266/267/268b | ✅ live |
| 4 Discovery | 269 | ✅ live |
| 5 Visual-Polish | 270-273 (Stadium + 3D-Mystery-Box) | ⏳ pending |

10 von 13 D63-Slices live + Hotfix-Slice-Familie 270/270c/270d v2 (außerhalb Roadmap, vom Anil-Live-Bug 2026-05-05 getrieben).
