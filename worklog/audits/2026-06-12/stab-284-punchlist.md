# Slice 284 — Core-Domain-Stabilisierung · Punch-List (Phase A Befund)

> Trigger: Anil 2026-06-12 — „Spieltag, Markt, Rankings, Spieltagauswertung, Wettbewerbe:
> 100% fehlerfrei bevor Sommer-Roadmap. Aktuell zu viele Fehler."
> Quellen: DB-Truth-Checks (CTO) · Live-Walkthrough Console+Screenshots (CTO) ·
> fantasy-scoring-expert-Audit · fm-mechanics-expert-Audit · Anil-Fehlerliste (angefragt).
> Kategorien: (a) Code-Bug · (b) Season-End-Edge · (c) Daten-Drift

## DB-Truth-Befunde (CTO, verifiziert)

| ID | Sev | Kat | Befund | Evidenz | Fix-Skizze |
|----|-----|-----|--------|---------|------------|
| DB-01 | P1 | c | **2 Fixtures stuck auf status='live' seit 08.05.** — 2.BL GW33: Kaiserslautern–Bielefeld 2:0, Paderborn–Karlsruhe 2:2. Alles was auf 'live' triggert (Live-Badges, Live-Bucket, isEventLive-Pfade, FixtureDetail-60s-Polling) feuert seit 1 Monat falsch. | SQL fixtures status='live' | DB-Heal → 'finished'; + Cron-Recovery-Guard: live-Fixtures älter als X Stunden ohne API-Echo → finished (live-score-sync kann sie nicht auflösen, API liefert sie nicht mehr) |
| DB-02 | P2 | c | **154 Geister-Fixtures status='scheduled' in der Vergangenheit** (18–40 je Liga; API hat sie nie aufgelöst — postponed/cancelled/Drift). Je nach UI-Filter erscheinen sie als „kommende Spiele" einer beendeten Saison. | SQL open_fixtures je Liga | Triage: echte Nachholspiele vs. API-Drift; Batch auf 'cancelled' o.ä.; Spieltag-Filter robust machen |
| DB-03 | P2 | c | **42 Geister-Score-Zeilen Süper Lig GW 35–37** (Liga spielte nur 34; Zeilen entstanden 11.–29.04.) — kontaminieren GW-basierte Auswertungen/Form-Fenster | SQL pgs gw>34 | Herkunft klären (Fixture-GW-Remapping?) → Zeilen löschen oder remappen |
| DB-04 | P3 | c | Süper Lig `max_gameweeks=38` konfiguriert, real 34 — GW-Navigation/Validierungen können bis 38 laufen | leagues-Row | Config auf 34 (Saison 25/26) — Achtung Season-Rollover ändert das eh |
| DB-05 | — | ✓ | POSITIV: Events-Lifecycle sauber — alle 207 Events 'ended', 0 unscorte Lineups in ended Events | SQL | kein Fix |

## Live-Walkthrough (CTO, jarvis@393px — /fantasy, /market beide Tabs, /rankings, /manager Kader+Historie)

| ID | Sev | Kat | Befund |
|----|-----|-----|--------|
| LW-01 | P3 | a | Console: transiente RSC-Prefetch-Fails + 1 WelcomeBonus-claim-Fail während Netz-Blip — kein reproduzierter App-Bug, beobachten |
| LW-02 | — | ✓ | Keine PAGEERRORs, keine HTTP≥400, alle 5 Bereiche rendern strukturell; Screenshots: qa-screenshots/284-*.png |
| LW-03 | P3 | b | /rankings „Top des Monats: Noch keine Daten" — Saisonende-Empty-State, korrekt aber ggf. Anil-sichtbar als „Fehler" |

## Experten-Audit: fm-mechanics (Markt · Rankings · Manager) — 11 Findings

Verdict: GAPS — kein P0 (Buy/Sell-Critical-Path intakt, Slice-283-Verkabelung sauber verifiziert).

| ID | Sev | Kat | Symptom (User-Sicht) | Location | Fix-Skizze |
|----|-----|-----|----------------------|----------|------------|
| FM-01 | **P1** | a+b | Derselbe Kader zeigt auf /market vs /manager VERSCHIEDENE Werte/P&L (Manager überspringt Server-floor_price in der Fallback-Chain — bei totem Markt P&L≈0 vs echtes P&L) | KaderTab.tsx:189-195 vs playerMath.ts:14-21 | KaderTab auf computePlayerFloor() + Parity-Test-Invariant |
| FM-02 | **P1** | b+c | Spieler-Rankings „Veränderung"/„Volumen": Zufallsliste mit „+0%" überall (alle change=0, Sort=No-Op) | PlayerRankings.tsx:47-57,144-155 | .gt/.neq(0)-Filter + Empty-State „keine Markt-Bewegung" + Em-Dash |
| FM-03 | **P1** | a | Rankings-Liga-Filter: kleine Ligen zeigen 2-3 Spieler/nichts — Server holt global Top-100, Liga-Filter client-seitig auf gekapptem Set | PlayerRankings.tsx:49-83 | Liga in Server-Query + queryKey |
| FM-04 | P2 | a+b | Bulk-Sell überspringt Spieler ohne Listing KOMMENTARLOS („Verkaufen geht nicht") — Silent-Skip §1; verstärkt durch FM-01 | KaderTab.tsx:221-233 | Skip-Counter + Abschluss-Toast „X verkauft, Y übersprungen" |
| FM-05 | P2 | a+b | getRecentlyEndedIpos ohne limit/range → 1000-row-cap-Klasse bei 4720 ended (Badge/Liste still gekappt) | ipo.ts:240-251 | .limit(200)+order; Count via head:true |
| FM-06 | P2 | a | Rankings-Liga-Filter-Header suggeriert Seiten-weite Wirkung, filtert aber NUR Spieler-Rankings (Leaderboards ignorieren ihn) | rankings/page.tsx:34-53 | Header über die PlayerRankings-Card verschieben (kurzfristig) |
| FM-07 | P2 | a | „Letztes Event": eigener Rang zeigt „#0" (rank ?? 0 statt null+Em-Dash) | lineups.queries.ts:230 + LastEventResults.tsx:70 | null durchreichen, Render `—` |
| FM-08 | P2 | a | Nach Marktplatz-Besuch lädt /manager wieder die vollen 4,2 MB (globaler Tab-State; 283-F-07 bestätigt, Backlog-as-Slice-Regel → jetzt fixen) | useManagerData.ts:36-43 | useMarketData(uid,{portfolioOnly:true}) |
| FM-09 | P3 | b | Marktplatz-Default „Club-Verkauf→Laufend" bei 0 IPOs = leere Ansicht ohne Weiterleitungs-CTA | ClubVerkaufSection.tsx:220-233 | Empty-State-CTA „Zur Transferliste"/„Beendete ansehen" |
| FM-10 | P3 | a | Deep-Link ?tab=watchlist landet auf Club-Verkauf (Alias setzt subTab nicht) — latent, 0 interne Links | MarketContent.tsx:45-49,73-81 | Alias-Map um subTab erweitern |
| FM-11 | P3 | a | pnlBsd-Semantik-Drift per-Stück vs Position-Total zwischen BestandView- und KaderTab-Mapping (latent, Konsument rendert Feld nicht) | BestandView.tsx:383 vs KaderTab.tsx:194 | Semantik dokumentieren + ×quantity angleichen |

NOT-CHECKED (fm): Aufstellen-Tab/EventSelector bei 0 offenen Events · Player-Detail PriceChart/Sentiment bei 0 Trades · OffersTab intern · TransferList/Watchlist-Details · MonthlyWinners/Friends · mv_trend_7d-History-Gaps (braucht SQL).

**Top-3-Verdacht was Anil sieht (fm):** (1) FM-01 Zahlen-Widerspruch market↔manager — Vertrauens-Killer. (2) FM-02+03 Rankings wirken doppelt kaputt. (3) FM-04 „Verkaufen geht nicht".

## Experten-Audit: fantasy-scoring (Spieltag · Auswertung · Wettbewerbe) — 14 Findings

Verdict: GAPS — 3×P0, 5×P1. Auto-Sub/Captain-Kern (195d) sauber ✓.

| ID | Sev | Kat | Symptom / Root-Cause | Location | Fix-Skizze |
|----|-----|-----|----------------------|----------|------------|
| FANT-01 | **P0** | a | **Live-Cron kann Spiele strukturell nie beenden:** ±15min-Window AND-verknüpft mit status — laufendes Match ist 15min nach Anstoß außerhalb, FT sowieso. Funktionierte nur bei gestaffelten Anstößen. Root-Cause der stuck-live. | live-score-sync/route.ts:103-111 | Window als OR: status='live' immer syncen, scheduled nur ±15min |
| FANT-02 | **P0** | b | 2 stuck-live von KEINEM Cron mehr auflösbar (API liefert sie nicht mehr; gameweek-sync fasst nur aktive GW an) | live-score-sync:123-132 + gameweek-sync:530-588 | One-shot-Heal + Self-Heal-Branch: live älter 6h → per /fixtures?id nachschlagen → finished |
| FANT-03 | **P0** | b→a | Scoring wertet Spieler nie-beendeter Fixtures als No-Show (0 Pkt, falscher Auto-Sub) → potenziell falsche Rewards | score_event 195d:619-707 | Pre-Scoring-Invariant: 0 past-Fixtures in (scheduled,live) vor score_event. **BLAST-RADIUS VERIFIZIERT: 0 Events auf 2.BL GW33 → KEIN Punkte/Reward-Schaden durch die 2 stuck-Fixtures ✅ (kein Re-Score nötig)** |
| FANT-14 | **P1** | a | mapStatus schreibt postponed/cancelled/halftime — **DB-CHECK erlaubt nur 4 Werte (verifiziert: fixtures_status_check)** → tägliche Status-Updates failen SILENT → **kausaler Enabler von DB-02 (154 Geister bleiben scheduled!)** + HT-Spiele erscheinen nicht im Live-Bucket | sync-fixtures-future:66-74 vs types:1525 | Mapping normalisieren (HT→live; PST/CANC→Union+CHECK erweitern um 'cancelled' o.ä.) + error_sample-Forensik |
| FANT-04 | **P1** | b | Stuck-live pulsiert überall („LIVE 90'", grüner Bucket, Modal-Endlos-Polling 60s) — kein Staleness-Guard obwohl last_live_update_at existiert | SpieltagBrowser:19-83, FixtureCard, FixtureDetailModal:441-565 | isLive = status='live' && last_live_update_at > now-30min, sonst „Ergebnis ausstehend" |
| FANT-05 | **P1** | a | **Ergebnisse-Tab (Best XI/Topscorer/GW-Summary) mischt ALLE 7 Ligen** (eq gameweek ohne league) — Slice-270-Klasse, bei 273 nicht mitgezogen | fixtures.ts:222-285 + ErgebnisseTab:93,109 | leagueId-Param analog getGameweekStatuses |
| FANT-06 | **P1** | c+a | Süper-Lig GW35-37-Drift verzerrt Form-Bars-Window [33..37] + perf_l5 (score_event mittelt ohne GW-Plausibilität). Erzeuger: parseGameweek ohne Cap + max_gameweeks-38-Fallback | sync-fixtures-future:59-63, gameweek-sync:256, RPC 274 | max_gameweeks-Audit, Drift-pgs/Fixtures/evtl. Geister-Events löschen, parseGameweek capen |
| FANT-07 | **P1** | b/c | 154 Geister = ewiges „Ausstehend ?-?" beim GW-Browsen + grüner „Offen"-Pulse am Selector für längst beendete GWs | SpieltagBrowser:33-38, SpieltagSelector:78-80, useGameweek:85-96 | Heal via FANT-14-Fix + Batch-Triage; UI-Bucket „verlegt/abgesagt" |
| FANT-08 | P2 | a | Lineup-Lock UI≠Server: UI markiert scheduled-nach-Kickoff als editierbar, Server lockt ganze GW (kein Exploit, UX-Drift) | fixtures.ts:363 + rpc_save_lineup:159 | isLocked = played_at <= now ohne Status-Bedingung |
| FANT-09 | P2 | a | getRecentPlayerMinutes nutzt globales GW-Window (270-Klasse, bei 274 nicht mitgezogen) → leere Minutes-Slots in 34er-Ligen | fixtures.ts:394-410 | Liga-Window analog RPC 274 |
| FANT-10 | P2 | b | GW-Navigation hart bis 38 in 34er-Ligen (leere/Geister-GWs navigierbar) | SpieltagSelector:20 | leagues.max_gameweeks durchrouten |
| FANT-13 | P2 | a | TopspielCard hat keinen Live-Branch (zeigt „?-?" statt Live-Score) — 267 vergaß sie | TopspielCard:27-80 | Live-Branch analog FixtureCard |
| FANT-16 | P2 | FPL-Gap | Kein Vice-Captain-Fallback (Captain-No-Show → Multiplier verpufft) — bewusst out-of-scope 195d, Top-Manager-Erwartung | 195d:703-717 | Feature-Decision CEO |
| FANT-11 | P3 | b | Kein „Saison beendet"-State/Recap — GameweekStatusBar verschwindet abrupt | helpers.tsx:42-56 | → Sommer-Roadmap (Season-End-Ops) |
| FANT-12 | P3 | b | gameweek-sync läuft täglich ins Leere (Log-Wachstum, 277-Guard hält ✓) — kein Season-Off | advance-helpers:50-52 | → Sommer-Roadmap |

NOT-CHECKED (fant): HistoryTab/EventsTab-Detail · get_top_predictors-RPC · LeaguesSection · simulate_gameweek als pgs-Drift-Pfad · error_sample-Forensik.

**Top-3-Verdacht was Anil sieht (fant):** (1) Pulsierende LIVE-Spiele Wochen nach Saisonende. (2) Spieltag wirkt „nie fertig" (Geister-Ausstehend + grünes „Offen"). (3) Auswertung mischt Ligen / Süper-Lig-Geister-Daten.

## Anil-Fehlerliste

→ angefragt, wird gemappt

## Fix-Wave-Plan (CTO-Vorschlag)

| Wave | Slice | Inhalt | Schwere |
|------|-------|--------|---------|
| 1 | 284a | **Live-Lifecycle-Kette:** FANT-01 Cron-Window-OR + FANT-14 Status-Mapping/CHECK + FANT-02 Heal+Self-Heal + FANT-03 Pre-Scoring-Invariant + FANT-04 UI-Staleness-Guard | 3×P0+2×P1 |
| 2 | 284b | **Daten-Heal:** DB-02 154 Geister-Triage (nach 14-Fix lösbar) + DB-03/FANT-06 Süper-Lig-Drift-Cleanup + DB-04 max_gameweeks + parseGameweek-Cap + FANT-10 | P1/P2 |
| 3 | 284c | **Markt/Rankings:** FM-01 Floor-Parity + FM-02/03 Rankings + FM-04 Bulk-Sell-Toast + FM-06/07 + FM-05 | 3×P1 |
| 4 | 284d | **Fantasy-UI:** FANT-05 Liga-Scope Ergebnisse + FANT-09 + FANT-13 + FANT-08 | P1/P2 |
| 5 | Backlog | FM-08/09/10/11 · FANT-11/12 (→Sommer-Roadmap) · FANT-16 Vice-Captain (CEO-Feature-Decision) · LW-01 | P2/P3 |

**CEO-Punkte:** FANT-16 Vice-Captain ja/nein · FANT-03-Entwarnung (kein Re-Score nötig, 0 Events betroffen) zur Kenntnis.
