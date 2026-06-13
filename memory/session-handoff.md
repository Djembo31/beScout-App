<!-- auto:handoff-start -->
# Session Handoff — Auto (2026-06-13 22:22)

> Dieser Block wird vom Stop-Hook aktualisiert. Manueller Rich-Content steht ausserhalb der Marker.

## Working Tree: Clean

## Session Commits: 6
- 9580e52d refactor(market): Slice 305 — Orphan Community-Valuation Removal (S7 Phase-2 #3)
- c9519e24 fix(types): Slice 304 — DbFeeConfig Type-Schema Alignment (S7 Phase-2 #2)
- eb0f146b feat(market): Slice 303 — Floor-Price Source-of-Truth Consolidation (S7 Phase-2 #1)
- cd407b8d docs(audit): Slice 302 — S7 Source-of-Truth & Wiring Registry (Foundation + 3 P0-Domänen)
- f6776119 chore(audit): Slice 301 — S6 Dead-Artifact-Inventory + wildcards-Bridge-Removal
- 6b1ba1b1 docs(decision): D75 — Stabilization-Audit-Slices = Audit + Ratchet-Guard (Session-End 297-300)

<!-- auto:handoff-end -->

---

# 🎯 RESUME-ANKER NÄCHSTE SESSION (2026-06-13 spät — S6 + S7-Registry + S7-Phase-2 #1–#3, 5 Slices)

**Status: idle** · HEAD `9580e52d` · origin/main synchron · Working tree clean. **0 Reverts** (durchgehend seit Slice 261).

## ⚠️ Erste Action: S7 Phase-2 **#4 — Wildcard-Ledger** (Money/Compliance)

Anil hat #4 für die nächste Session reserviert (frischer Kopf für Money/Compliance). **Befund (S7-Registry Fantasy 2.7):** `user_wildcards` hat **35 Balances**, `wildcard_transactions` aber **0 Zeilen** → Balance ohne Audit-Ledger. `getWildcardHistory` liefert immer `[]` + swallowed Errors. Bezahlte/gewährte Wildcards ohne Trail = Compliance-Risiko.

**Vorgehen #4:** (1) DB-Investigation — schreibt `admin_grant_wildcards`/`save_lineup`(p_wildcard_slots) überhaupt in `wildcard_transactions`? `pg_get_functiondef` der wildcard-RPCs prüfen. (2) Entscheiden: Ledger-Schreibpfad reparieren (RPC-Body) ODER dokumentieren warum kein Ledger. (3) `getWildcardHistory` Error-Swallow → throw. Spec-Skelett noch zu schreiben. Money-Path → Pflicht-Review.

## Was diese Session lief (Start: „weiter" → Anil-Direktive „alles harmonisieren")

Aus Anils Gefühl „Repo aus Mocks zusammengewachsen, Brücken/Workarounds, mehrere Datenquellen pro Komponente" wurde ein abgearbeitetes Programm. 5 Slices, alle reviewt, 0 Reverts:

1. **Slice 301** `f6776119` — S6 Dead-Artifact-Inventory: 24 Artefakte klassifiziert + wildcards-Bridge gelöscht (RED/GREEN). **Stabilization S0–S6 komplett.**
2. **Slice 302** `cd407b8d` — **S7 Source-of-Truth & Wiring Registry** (die „Verfassung"): `worklog/audits/2026-06-13/s7-source-of-truth-registry.md`. 3 P0-Domänen (Player/Fantasy/Trading) via 3 parallele Explore-Agents live-schema-gemappt, 8-Achsen-Format. **6 systemische Muster** identifiziert (#1 Floor 5-6-fach · Schema≠Typ · 2-Spalten/2-Impls je Semantik · Audit-Ledger leer · dormant/orphan · externe-Dep-blockiert). Methode = Strangler-Fig + Ratchet (D75), kein Big-Bang.
3. **Slice 303** `eb0f146b` — **S7 #1 Floor-Konsolidierung (Money, größter Hebel).** Root-Cause-Catch: `last_price` Seed-Müll vergiftete `recalc_floor_price` → naiver Backfill hätte 3310 Floors zerschossen (Yamal 200.000→100). A: Hygiene (Divergenz 73%→0,57%). B: cancel_order → Kanon recalc. C: 4 Recompute-Pfade → `players.floor_price` (eine Quelle). Knowledge: errors-db.md „Seed-Wert-Poisoning in Fallback-Formel-Branch".
4. **Slice 304** `c9519e24` — **S7 #2 DbFeeConfig-Typ-Fix.** +6 NOT-NULL-Felder (offer_*_bps + abo_discount_*_bps) gegen Live-Schema. Schema≠Typ-Loch zu, kein Fee-Wert-Change.
5. **Slice 305** `9580e52d` — **S7 #3 Orphan-Value-Removal.** CommunityValuation + valuations.ts + 2 Tabellen + RPC gelöscht (RED/GREEN). Reviewer-CONCERNS-Residuen in-slice (orphan-detector-Allowlist + 9 i18n-Keys). Knowledge: errors-frontend.md „Dead-Feature-Removal 4-Residuen-Achsen".

## S7 Registry — Stand & Roadmap

**Phase 1 (Map):** 3/9 Makro-Domänen gemappt (Player/Fantasy/Trading = alle P0). **Offen (P1–P3, falls je gewünscht):** Club, Social/Community, Gamification/Economy, Creator/Sponsor, Identity, Admin/Ops.

**Phase 2 (Migrieren):** #1✅ #2✅ #3✅ · **#4 Wildcard-Ledger offen** (= erste Action oben). Weitere Registry-Befunde P1 (eigene Slices wenn Anil will): active_gameweek 2-Spalten-Drift (clubs vs leagues) · GW-Status 3× berechnet · last-5-Scores 2 Impls (cross-domain Player#4/Fantasy#6) · Lineup wildcardSlots:Set-Rehydration · IPO-Preis `?? floor_price`-Vermischung · 24h-Change 3 Quellen.

## Offene Folge-Findings (opportunistisch, kein Zwang)

- **S4-F-2/F-3 (P2):** `PlayerRankings.tsx` + `FollowListModal.tsx` direkter Supabase-Zugriff → Query-Facade-Migration (durch boundary-Ratchet eingefroren, noch DRIFT).
- **S5-F-1..4 (P2/P3):** Mock-Heavy-Tests Behavioral-Audit + bug-regression test.skip-Reasons.
- **303 F-1 (pre-existing, doc'd in trading.md):** Display-Floor inkl. eigener Sell-Orders vs buy_player_sc skippt eigene → minimale Display/Charge-Abweichung wenn User selbst günstigster Lister.

## Carry-over (Anil-Action, unverändert)

- **🚨 API-Football-Key suspendiert seit 06.05.** → blockiert Slice 284b (154 Geister + Süper-Lig-GW-Drift: SL active_gameweek=34 bei max=38). dashboard.api-football.com.
- **TR-Review (3 Strings):** `market.bulkSellResult`, `rankings.noMarketMovement`, `fantasy.matchLive` (=„Canlı").
- **Backlog (286):** `clubs.ts` non-reaktives Cache-Pattern (falls render-time `useMemo(() => getClub(...))` → useSyncExternalStore-Fix).
- **Backlog-Slices (kein API-Key):** FM-08..11, FANT-11/12/16 (CEO Vice-Captain). Punch-List: `worklog/audits/2026-06-12/stab-284-punchlist.md`.

---

# 🎯 RESUME-ANKER ARCHIV (2026-06-13 Abend — Session-End nach Slice 297–300, S4+S5 komplett)

**Status: idle** · HEAD `33332654` · origin/main synchron · Working tree clean (nur auto Handoff-Block). 0 Reverts.

## Anil-Direktive (erledigt)

**→ Anil setzt S6 (Dead-Artifact-Inventory) selbst durch.** ✅ Erledigt als Slice 301.

## Was diese Session lief (Start: „weiter im handoff")

1. **Aufräumen:** Handoff sagte fälschlich „origin/main synchron" — der DISTILL-Commit D74 (`21855b40`) hing **unpushed**. Gepusht. Audit-Timestamp-Churn (audit-stale/type-truth) = self-renewing → `git restore` (Pattern bleibt).
2. **Slice 297** `07698c88` — AC-5 Mobile-393px Live-Verify (Playwright @ 393px vs `bescout.net/club/sakaryaspor`): 4 Tabs (Übersicht/Spieler/Spielplan/Mehr), TabBar own-overflow 0px, Page-Overflow 0px, Mehr-Tab-Content live. Proof §7. **S3-Audit komplett (F-1…F-4 ✅).** Anil-Decision: FeatureShowcase bleibt Übersicht.
3. **Slice 298** `787e1719` — Demo-Step-8: `e2e/club-lifecycle.spec.ts` (Slice-293-Blueprint), 2 Contract-Tests (/clubs + /club) own-login gegen bescout.net, **2 passed**. Verkabelt: playwright-Projekt + `test:club-lifecycle` + non-blocking nightly-Step. Schlüssel: Active-Tab-Anker = `aria-selected` (TabBar accentColor → kein text-gold).
4. **Slice 299** `4fed642a` — **S4 Source-of-Truth Boundaries**: `scripts/boundary-check.ts` Baseline-Ratchet (`.boundary-baseline.json`, bridges 46 + direct-supabase 5), pre-commit Step 5. 7 Fantasy-Bridges = reine Re-Exports, wildcards=0 (DEAD?). Master-Audit §11.5/6 Prosa→enforced.
5. **Slice 300** `33332654` — **S5 Test-Confidence**: `scripts/test-confidence-check.ts` Baseline-Ratchet (`.test-confidence-baseline.json`, placeholders 5 + skips 1), pre-commit Step 6. 2 PURE-Placeholder gefixt (ResearchCard del, NotificationDropdown → real Render-Smoke). Master-Audit §11.4 Prosa→enforced.

→ **Stabilization-Track S0–S5 + E2E-Layer (293+298) abgeschlossen.** Nur S6 offen.

## DISTILL diese Session

- **D75** PROCESS — Stabilization-Audit-Slices (S-Serie) liefern Audit-Doc + Baseline-Ratchet-Guard (kein reines Audit-Theater). 3 Ratchets aktiv (silent-fail 092 · boundary 299 · test-confidence 300). Ratchet friert Ist-Stand, blockt nur Neuzuwachs (kein Big-Bang). Re-Visit: bei Count→0 zu ESLint-Hard-Rule promoten / bei zu vielen pre-commit-Steps bündeln.
- **patterns.md #49** erweitert: 3. Ratchet-Instanz + Marker-Falle (`fit(` als CALL matchen, nicht `\bfit\b`; `import()` nicht nur `from`).

## ⚠️ S6 — Dead-Artifact-Inventory (Master-Audit §10 S6) — was Anil/nächste Session angeht

Ziel: Löschkandidaten **beweisbar** machen. Status pro Artefakt: KEEP / BRIDGE / DEPRECATED / DEAD?. **§11.3: kein Blind-Delete — Löschen nur mit RED/GREEN Removal-Proof** (grep 0 Konsumenten + tsc + vitest grün).
- **Konkrete Startpunkte aus S4-Findings:** `wildcards.ts`-Bridge (0 Importer, S4-F-1 = klarster DEAD-Kandidat). `audit:orphan`-Script existiert (Slice 228) — als Discovery nutzen.
- **Werkzeug-Vorschlag:** ggf. 4. Ratchet-Instanz (#49) für orphan-Count, ODER `audit:orphan` als pre-push-Gate verkabeln (D54).
- **Pattern beachten:** Slice 280 „Dead-Wrapper mit transitive Lib-Lock-In" (105 KB pro orphan-Wrapper) — DEAD-Artefakt-Removal hat realen Bundle-Win.

## Offene Folge-Findings (opportunistisch, kein Zwang)

- **S4-F-2/F-3 (P2, Demo-Path):** `PlayerRankings.tsx` + `FollowListModal.tsx` direkter Supabase-Zugriff → Query-Facade-Migration. (Durch Ratchet eingefroren, aber noch DRIFT.)
- **S5-F-3 (P2):** Mock-Heavy-Tests systematisch auditieren (Behavioral vs Mock-against-Mock).
- S4-F-4 (Bridge-Migration inkrementell), S5-F-1/F-2/F-4 (P3).

## Carry-over (Anil-Action, unverändert)

- **🚨 API-Football-Key suspendiert seit 06.05.** → blockiert Slice 284b (154 Geister + Süper-Lig-Drift). dashboard.api-football.com.
- **TR-Review** (3 Strings): `market.bulkSellResult`, `rankings.noMarketMovement`, `fantasy.matchLive` (=„Canlı").
- **Backlog (286):** `clubs.ts` non-reaktives Cache-Pattern (falls render-time `useMemo(() => getClub(...))` → useSyncExternalStore-Fix).
- **Backlog-Slices (kein API-Key):** FM-08..11, FANT-11/12/16 (CEO Vice-Captain). Punch-List: `worklog/audits/2026-06-12/stab-284-punchlist.md`.

---

# 🎯 RESUME-ANKER ARCHIV (2026-06-13 — Session-End nach Slice 294–297, S3-Audit komplett)

**Status: idle** · Slices 294/295/296/297 alle committed & gepusht. origin/main synchron.

## Was diese Session lief (Start: „Session plötzlich beendet, setze nahtlos an")

1. **Slice 294** `3677134f` — Resume: Slice 294 war voll durch alle Stages, nur der Commit fehlte (Session war davor gecrasht). Proof-Gate blockierte zunächst, weil die `proof:`-Zeile in active.md eine `(…)`-Annotation als Teil des Pfads enthielt → bare path gesetzt, dann committed. (Public Club Metadata „Trading"→i18n, S3 F-1.)
2. **Slice 295** `e1963466` — S3 F-2: `/clubs` Page-Contract-Test (`ClubsDiscoveryPage.test.tsx`), 7 Tests (loading/error/empty/follow/activate + 2 Edges). reviewer PASS.
3. **Slice 296** `16e46448` — S3 F-3: Fantasy Unauth-State explizit. Decision: Auth-Enforcement nur via AuthGuard, `&& user`=defensiv, KEIN page-local CTA. Kommentar + `describe('unauth contract')` ×4, Auth-Mock mutable. reviewer PASS.
4. **Slice 297** `4c4f996d` — S3 F-4: Club-Detail Narrative Tab-Split (Anil Option B). Übersicht 17→8 Lead; neuer „Mehr"/„Daha"-Tab (6); FDR+Letzte-Ergebnisse → Spielplan. FeatureShowcase bleibt Übersicht (thin-Club-Onboarding-Fallback). 17/17 Tests, reviewer PASS.

→ **S3 Page-Contract-Audit (Slice 292) komplett geschlossen: F-1 ✅ F-2 ✅ F-3 ✅ F-4 ✅.**

## DISTILL diese Session

- **D74** ARCHITECTURE — Auth-Enforcement Single-Source = AuthGuard; `(app)`-Pages rendern KEINE eigene Sign-In-CTA, `&& user`-Gates sind defensiv (kein zweiter Auth-UX-Pfad). Aus Slice 296.

## ⚠️ OFFEN — zuerst angehen nächste Session

1. **Slice 297 AC-5 Mobile-393px-Playshot (POST-DEPLOY, PENDING).** Sobald Vercel den 297-Commit deployed hat: Playwright/Chrome-DevTools @ 393px gegen `https://bescout.net/club/<slug>` → 4 Tabs (Übersicht/Spieler/Spielplan/Mehr) ohne horizontalen Overflow verifizieren + Screenshot. Ergebnis an `worklog/proofs/297-club-tab-split.txt` §7 anhängen. TabBar ist strukturell mobile-safe (overflow-x-auto + scrollbar-hide + flex-shrink-0, Label „Mehr"=4 chars) → erwartet grün, nur formaler PROVE-Abschluss.
2. **Anil-Frage offen (297):** FeatureShowcase bleibt in Übersicht (statt Mehr) — bewusste Deviation (Onboarding-Fallback). Anil-Bestätigung ausstehend; falls er es doch in Mehr will → 1 kleiner Edit (Ternary auflösen + in Mehr-Block mit `showFeatureShowcase &&`).

## Danach (S3 abgeschlossen → nächste Linie)

3. **Demo-Step-8** — `/club` + `/clubs` Lifecycle-E2E via Slice-293-Blueprint (`testing.md` „Contract-Level E2E gegen Live-Prod"). E2E-Layer obendrauf auf die neuen Page-Tests 295.
4. **S4** — Source-of-Truth Boundaries Audit (nächster Stabilization-Audit-Schritt).

## Carry-over (ältere offene Calls — unverändert)

- **🚨 API-Football-Key suspendiert seit 06.05.** → blockiert Slice 284b (154 Geister-Triage + Süper-Lig-Drift). Anil: dashboard.api-football.com.
- **TR-Review** (3 Strings): `market.bulkSellResult`, `rankings.noMarketMovement`, `fantasy.matchLive` (=„Canlı").
- **Backlog (286 Reviewer):** `clubs.ts` hat dasselbe non-reaktive Cache-Pattern wie leagues.ts (pre-286). Falls render-time `useMemo(() => getClub(...))` entsteht → gleiche Cold-Load-Race, useSyncExternalStore-Fix.
- **Backlog-Slices (kein API-Key nötig):** FM-08..11, FANT-11/12/16 (CEO Vice-Captain). Punch-List: `worklog/audits/2026-06-12/stab-284-punchlist.md`.

---

# 🎯 RESUME-ANKER ARCHIV (2026-06-13 — Session-End nach Slice 285 + 286, beide LIVE)

**HEAD `e50e8852`** · Status: **idle** · Working tree clean · origin/main synchron.

## Was diese Session lief (Start: „konnte Session nicht sauber schließen")

1. **Session-Cleanup** — 3 offene Auto-Artefakte (Handoff-Block + Audit-Timestamps) sauber committed. Kein Code verloren, Slice 284d war vollständig durch. Selbst-erneuernde Audit-Timestamp-Churn (Pre-Commit-Hook schreibt `Generated:` neu) als Pattern erkannt → `git restore` statt committen.
2. **Slice 285 (FM-06)** `682e99f8` — Liga-Header (`LeagueScopeHeader`) von Page-Top runter direkt über `PlayerRankings` (rankings/page.tsx). Header filtert nur Spieler-Rankings, nicht die 5 Leaderboards → seitenweite Platzierung war irreführend. Anil-Decision Option 1. XS, live, DOM+visuell verifiziert.
3. **Slice 286** `b1262ebe` — **der Hauptgewinn.** Bei 285-Verifikation entdeckt: Liga-Filter (CountryBar+LeagueBar) rendert **app-weit LEER** bei Hard-Nav/Hard-Refresh/PWA-Cold-Start. Root: async-League-Cache + useMemos mit stale deps → captured leere Liste, recomputet nie → `length<=1 return null`. Fix (root-cause): reaktives Cache-Ready-Signal in `leagues.ts` via `useSyncExternalStore`-Hook (`useLeagueCacheVersion`), als dep in 3 Konsumenten. Live-verifiziert Cold-Load **buttonCount 0→9** auf /rankings + /clubs + /fantasy, 0 Hydration-Errors. Reviewer PASS.

## DISTILL diese Session

- **D73** PROCESS — PROVE für conditional-render/filter-Components = **Cold-Load (`page.goto`) + DOM-Assertion**, nicht warmer Screenshot. (285 wäre mit warmem Screenshot „done" gewesen — DOM-Assertion auf Cold-Load fand den 286-Blocker.)
- **errors-frontend.md** neue Bug-Klasse: „Non-reaktiver Module-Cache + useMemo-stale-deps Cold-Load-Race" (Slice 286) — Fix-Pattern useSyncExternalStore + Detection-grep + Test-Mock-Pflicht.

## Offen für nächste Session (Anil-Calls)

1. **🚨 API-Football-Key suspendiert seit 06.05.** → blockiert Slice 284b (154 Geister-Triage + Süper-Lig-Drift). Anil: dashboard.api-football.com Abo/Zahlung prüfen.
2. **TR-Review** (3 Strings): `market.bulkSellResult`, `rankings.noMarketMovement`, `fantasy.matchLive` (=„Canlı").
3. **Backlog-Notiz (286 Reviewer):** `clubs.ts` hat dasselbe non-reaktive Cache-Pattern wie leagues.ts (pre-286). Falls je render-time `useMemo(() => getClub(...))` entsteht → gleiche Cold-Load-Race, gleiches Fix-Pattern.
4. **Backlog-Slices (kein API-Key nötig):** FM-08 (P2, /manager lädt nach Marktplatz-Besuch wieder 4,2 MB — Punch-List „jetzt fixen"), FM-09/10/11, FANT-11/12/16 (CEO Vice-Captain).

Punch-List: `worklog/audits/2026-06-12/stab-284-punchlist.md`

---

# 🎯 RESUME-ANKER ARCHIV (2026-05-06 ~21:50 — Slice 280 + 281)

**HEAD `71cfe7d6`** Status: idle. Slices 279 + 280 + 281 alle LIVE auf main. Beta läuft mit Taki/Nail Mo (D71). Cold-Start-Track in Phase-2-Wartemodus.

## Letzter Stand bei Session-End (Anil 2026-05-06 ~21:50: „rocht für heute")

**3 Slices heute LIVE:**
- **Slice 279** `66e6208d` — Lighthouse-CI Baseline + GHA-Gate (Cold-Start Foundation Phase 1)
- **Slice 280** `c9a36469` — Bundle-Analysis + Tree-Shaking (Cold-Start Phase 2). **Total -374 KB FLJS-Sum**, Discovery-Story DropdownMenu-Dead-Wrapper.
- **Slice 281** `21af2e74` — Synthetic-User-Daily-GHA-Verkabelung (D54-Recovery). Manual-Dispatch live verifiziert (run-id 25462649034).

**2 neue Decisions (DISTILL):**
- **D71** PROCESS — Beta-Launch-Status korrigiert: LIVE mit Taki/Nail Mo statt Pre-Launch
- **D72** ARCHITECTURE — `optimizePackageImports`-Lehre: 0 KB Win für moderne ESM-Libs, Hauptwin = Dead-Wrapper-Delete

## Erste Action nächste Session — Track-Auswahl (Anil-Direktive)

### Track A — Slice 282 (Cold-Start Phase 3, `useHomeData`-Konsolidierung) — DEFERRED bis Lighthouse-Baseline da
**Voraussetzung:** Slice 279 lighthouse.yml-Workflow hat 3-5 Runs gesammelt (D70 anti-Pattern „Optimieren ohne Baseline" vermeiden).

**Verify pre-Start:**
```bash
gh run list --workflow=lighthouse.yml --limit=10
# Wenn ≥ 3 SUCCESS-Runs: Phase-2-Baseline schreibbar, Track A startfähig.
```

**Spec-Skelett:** Noch zu schreiben. Erstes Reading: `useHomeData`-Hook + alle Konsumenten + bestehende RPCs für Home-Data-Bündelung.

**Hinweis Slice-Numbering:** Cold-Start Phase 3 ist nun Slice 282 (Slice 281 wurde Synthetic-Daily-GHA). D70 Re-Numbering: Slice 282 = Phase 3 (`useHomeData`), Slice 283 = Phase 4 (Vercel Edge-Caching).

### Track B — Phase-D Beta-Pflicht ✅ ERLEDIGT (D71 dokumentiert)
Beta läuft live mit Taki/Nail Mo. Phase-D-BLOCKER-Tracker stale. Live-Bug-Reports von Anil = Tester-Befund hohe Prio.

### Track C — Slice 280b (Wave 3, Dialog/AlertDialog dynamic-Wrap) — DEFERRED
Risk/Reward ungünstig nach Slice 280 Wave-0-Win (-374 KB). Wave 3 würde User-Side Loading-Spike auf Modal-Open einführen. Empfehlung: defer bis Phase 2 Lighthouse-Daten zeigen ob LCP-Verbesserung ausreicht.

### Track D — Slice 281 Live-Run-Triage (1× pro Tag morgens)
**Pflicht für Anil:** `gh run list --workflow=synthetic-users.yml --limit=3` morgens checken. Master-Tracker-Issue mit `synthetic-fail` Label = Live-Bug-Report aus Tester-Surrogate. Sofort triagen.

### Track E — Notion-Integration-Drift heilen
Notion-MCP DB-ID `57670082f03a4ac4a305f68186c981a0` returnt 404. Anil-Action: Integration-Permissions checken oder DB-ID in CLAUDE.md aktualisieren.

## Slice 280 Recap — was passierte

Bundle-Win-Headline: **-17 KB FLJS auf JEDER der 22 tracked Pages = -374 KB Total**. Stretch-Goal -200 KB massiv übertroffen.

**Discovery-Story:** Pre-Implementation `grep -rln "DropdownMenu" src/` ergab Wrapper hat **0 Konsumenten** in Production-Code (Slice-181-Foundation, nie konsumiert). Delete eliminiert 105 KB transitive `@radix-ui/react-dropdown-menu`-Bundle pro Page-Chunk.

**Wave-Bilanz:** Wave 0 (Dead-Wrapper-Delete) brachte ~100% des Wins. Wave 1 (`optimizePackageImports`-Erweiterung) + Wave 2 (Sentry Namespace → Named-Imports) waren 0 KB direkt — Lehre: moderne ESM-libs sind bereits tree-shaken, Hauptwin liegt in Dead-Wrapper-Removal + Lazy-Loading + API-Surface-Reduktion. Wave 3 (Dialog/AlertDialog dynamic-Wrap) DEFERRED.

**Reviewer:** PASS, 4 NIT/MINOR alle im LOG behoben. Knowledge-Promotion live in `errors-frontend.md` neu „Dead-Wrapper-File mit transitive Lib-Lock-In (Slice 280)" — Bug-Klasse + Detection-Pattern + Fix-Pattern + Bundle-Win-Erwartung. Cross-Cutting D54 + D46.

**Files-Changed:** 22 Files, +522 / -774 = Net -252 Zeilen.

## Slice 279 Phase-2-Sammlung (läuft parallel)

Workflow `lighthouse.yml` läuft auto bei jedem `deployment_status: success`. Nach 3-5 Live-Runs:
- `worklog/audits/2026-05-06/lighthouse-baseline.md` schreiben (Mean ± StdDev pro Metric pro URL)
- Phase-3-Schwellen ableiten (baseline + 1.5×StdDev)
- Anil-Approval → `lighthouserc.json` `assert.assertions` auf `error`-Level switchen → hard-fail Gate aktiv

**Verify-Commands für Phase-2-Sammlung:**
```bash
gh run list --workflow=lighthouse.yml --limit=5
gh run view <run-id> --log
gh run download --name lhci-results-<sha-short> <run-id>
```

## Notion-Drift erkannt 2026-05-06 ~21:25

Notion-MCP Slice-Database (DB-ID `57670082f03a4ac4a305f68186c981a0` aus CLAUDE.md) returnt 404. Search-Query nach "Slice 279 280 Lighthouse Bundle" returnt 0 Hits. Mögliche Ursachen:
- Notion-Integration verlor Zugriff auf Slice-DB (Permissions-Drift)
- DB-ID in CLAUDE.md ist stale (DB umbenannt/gelöscht/migriert)
- Workspace-Switch in Notion-Integration

**Action für Anil:** Notion-Integration prüfen, ggf. DB-ID in `CLAUDE.md` Sektion „Notion-Integration" aktualisieren. Kanban-Sync für Slice 279 + 280 manuell auf „Erledigt" setzen falls Sync nicht automatisch greift.

## Slice 279 Phase-2-Sammlung (läuft parallel zu Slice 280)

Workflow `lighthouse.yml` läuft auto bei jedem `deployment_status: success`. Nach 3-5 Live-Runs:
- `worklog/audits/2026-05-06/lighthouse-baseline.md` schreiben (Mean ± StdDev pro Metric pro URL)
- Phase-3-Schwellen ableiten (baseline + 1.5×StdDev)
- Anil-Approval → `lighthouserc.json` `assert.assertions` auf `error`-Level switchen → hard-fail Gate aktiv

**Verify-Commands für Phase-2-Sammlung:**
```bash
gh run list --workflow=lighthouse.yml --limit=5
gh run view <run-id> --log
gh run download --name lhci-results-<sha-short> <run-id>
```

## Was passierte heute (9 Slices, 11 Commits, 0 Reverts)

| Slice | Commit | Was |
|-------|--------|-----|
| 274 | `c9064e50` | Form-Bars Absolute Liga-Window (DNP-Spieler dashed bars) |
| 275 | `04d84641` | Sync-Injuries Date-Filter + 1862 false-positive Heal |
| 276 | `0ee22fc8` | Club-Logo short-Code-Konflikt-Resolution (Wolfsburg/Wolves etc.) |
| 276b | `0eb4365b` | DB-Heal 4 stuck Ligen Cron-Drift |
| 277 | `86f29d87` | Cron-Code-Fix advance_gameweek in Skip-Branches (276b recurrent verhindern) |
| 278 | `5f5e15a4` | MysteryBox-Doppel-Render-Suppression (Slice 266 Multi-Slot-Drift) |
| 279 | `66e6208d` | Lighthouse-CI Baseline + GHA-Gate (Cold-Start-Track Phase 1 Foundation) |
| 280 | `c9a36469` | Bundle-Analysis + Tree-Shaking — Total -374 KB FLJS (Cold-Start-Track Phase 2) |
| **281** | **`21af2e74` + `71cfe7d6`** | **Synthetic-User-Daily-GHA-Verkabelung (D54-Recovery, live verifiziert)** |

Plus Hygiene:
- TR-Pre-Verify Anil-confirmed (commit `68e73257`) → RISK-5 endgültig CLOSED
- Strategic-Advisory entfernt (Anil-Anweisung)
- D70 Cold-Start-Track dokumentiert
- errors-frontend.md erweitert um Cross-Section-Coupling-Drift Pattern (Slice 278)
- Slice 279 verkabelt pre-existing orphan `lighthouserc.json` (commit 8aad8428 vom 2026-04-19, 17 Tage Build-without-Wire — D54-Recovery)

## Beta-Launch Status: LIVE (Status-Update 2026-05-06)

Anil testet bereits live mit Taki/Nail Mo. Phase-D-BLOCKER-Tracker ist stale → wird in nächster Session aus `worklog/beta-phase.md` korrigiert. Slice 270+ Live-Bug-Fixes kommen aus Tester-Feedback:
- Slice 274: Form-Bars DNP-Spieler dashed bars
- Slice 275: Sync-Injuries 1862 false-positive Heal
- Slice 276/276b/277: Club-Logo + Cron-GW-Drift
- Slice 278: MysteryBox-Doppel-Render-Suppression (Anil-Live-Bug Report)

Cold-Start-Track (Slice 279/280/281+) parallel — Performance-Win für aktive Live-Tester relevanter als für hypothetische 50-Mann-Pipeline.

## Knowledge-Promotion heute

- `errors-frontend.md` neu „Cross-Section-Coupling-Drift bei Multi-Slot-Refactors" (Slice 278)
- `errors-frontend.md` neu „Dead-Wrapper-File mit transitive Lib-Lock-In" (Slice 280)
- `errors-infra.md` neu „Cron-Skip-Branch ohne advance_gameweek-Aufruf" (Slice 273+276b)
- `errors-db.md` neu „Tenant-Window Achsen-Erweiterung Per-Player vs. Per-Liga" (Slice 274)
- `errors-scraper.md` neu „External-API liefert historische Daten als aktuelle" (Slice 275)
- `errors-frontend.md` neu „Lookup-Map indexed by ambiguous Key" (Slice 276)
- Slice 279 Knowledge-Promotion-Kandidaten (post-Phase-3): Pattern „Phase-Plan in 1 Slice (BUILD-now + LOG-tasks-deferred)" + „GHA-Workflow im D54-Recovery-Modus verkabelt orphan Config"

## Decisions heute

- **D69** Backlog-Sub-Track MUSS nächster Slice sein, nicht „separater Slice nach Beta"
- **D70** Cold-Start-Latency als nächster Strategic-Track (Slice 279+)
- **D71** Beta-Launch-Status korrigiert: LIVE seit ≤2026-05-06 mit Taki/Nail Mo (statt Pre-Launch)
- **D72** `optimizePackageImports`-Lehre: 0 KB Win für moderne ESM-Libs, Hauptwin = Dead-Wrapper-Delete (Slice 280 empirisch)

## Tests final state

- 3215+ tests grün im Branch
- vitest 13/13 in advance-helpers (Slice 277)
- vitest 135/135 in Home + Hooks (Slice 278)
- Slice 279 keine neuen Tests (Workflow-File + Config, by-design kein Unit-Test-Target)
- 0 Reverts seit Slice 261

---

# 🎯 RESUME-ANKER VORHERIGE SESSION (2026-05-06 ~00:40 — Schluss nach Spieltag-Stabilisierung)

**HEAD `4e8200a0`** Status: idle. Slice 273 Spieltag-Stabilisierung 3/4 Tracks live, Track A2 Backfill-Run im Hintergrund (Agent läuft).

## Slice 273 ENDGÜLTIG ABGESCHLOSSEN — Backfill-Run erfolgreich

Backend-Agent `a0ce80579fb4a81de` Multi-Liga-Backfill DONE (~20 min, 11/11 GWs erfolgreich, 0 Fehler).

**Erste Action morgen:** keine. Slice 273 ist 4/4 Tracks live. Anil's Anweisung „endgültig aus der welt haben" erfüllt.

**DB-Smoke Verify-Query (kopier-fertig):**
```sql
SELECT l.name, f.gameweek, COUNT(DISTINCT f.id) AS fixtures, COUNT(DISTINCT fps.id) AS stats_rows
FROM fixtures f
JOIN clubs c ON c.id = f.home_club_id
JOIN leagues l ON l.id = c.league_id
LEFT JOIN fixture_player_stats fps ON fps.fixture_id = f.id
WHERE f.status IN ('finished','simulated')
  AND ((l.name = 'Bundesliga' AND f.gameweek = 32)
    OR (l.name = '2. Bundesliga' AND f.gameweek = 32)
    OR (l.name = 'La Liga' AND f.gameweek IN (32,33,34))
    OR (l.name = 'Premier League' AND f.gameweek IN (32,33,34,35))
    OR (l.name = 'Serie A' AND f.gameweek = 35)
    OR (l.name = 'Süper Lig' AND f.gameweek = 32))
GROUP BY l.name, f.gameweek
ORDER BY l.name, f.gameweek;
```

Erwartung: stats_rows > 100 pro Zeile. Wenn 0 → Re-Run via `node scripts/slice-273-backfill-fixture-stats.mjs`.

## Was passierte heute Abend (4 Slices, 5 Commits, 0 Reverts)

| Slice | Commit | Was |
|-------|--------|-----|
| 270b | `97ac5b1a` | Tooltip-GW-Drift Fix — Combined Service + select-Pattern (5 Files) |
| 271 B1 | `3c967ba0` | Em-Dash für matches=0 Junioren (8 Files, +9 Tests) |
| 272 | `6b8ecb27` | Lineup Duplicate-Defense-in-Depth (4 Files, +10 Store-Tests, Anil-Live-Bug) |
| 273 | `0b76346a` + `4e8200a0` | Spieltag-Stabilisierung — Track A1 DB-Heal + B Liga-Filter + C Modal Stale + Track A2 Backfill-Script |

## Slice 273 Detailstand

| Track | Status |
|-------|--------|
| A1 DB-Heal active_gameweek (PL 31→36, La Liga 33→35, dual-write atomar) | ✅ live |
| B Liga-Filter `getGameweekStatuses` + Cache-Key + Hook | ✅ live |
| C Modal Stale-Fix (selectedFixtureId derived + Refetch + 60s-Polling) | ✅ live |
| A2 Backfill-Run für 11 lagged Liga+GW-Kombos | ✅ done (11/11, 0 Fehler) |

## Knowledge-Promotion heute Abend

- `errors-frontend.md` — "Multi-Slot-State-Stores: Move-Semantik vs. Insert-Semantik" (Slice 272)
- `errors-frontend.md` — "Selected-Item-Snapshot vs. Realtime-Update-Drift" (Slice 273)
- `errors-db.md` — "History-Gap-Tag-Sensitivität bei strict-7d-LEFT-JOIN" (Slice 271 Audit)

## Beta-Phase D Status (unverändert)

- `last_signoff: PASS-PENDING-IPHONE-VISUAL-VERIFY`
- iPhone-Verify mit Power-Account am WE pflicht (45 min)
- TR-Pflicht-Review 11 Slice-266+269-Keys (5 min)
- Beta-Mails an Taki/Nail Mo (Templates fertig)

## Slice 274 Backlog (post-Beta)

- Cron-Code-Fix `gameweek-sync/route.ts` für Postponed-Match-Aware advance (Slice 140 Pattern-Familie generalized)
- TFF 1. Lig GW38 Saisonende-API-Mapping
- Wenn `clubs.active_gameweek` zukünftig drifted: gleicher Pattern, evtl. Auto-Reconcile via Cron

## Tests final state

- 3215+ tests grün im Branch
- Slice 273 Frontend: 255/255 fantasy-Domain
- Slice 272: +10 Store-Tests
- Slice 271 B1: +9 Helper-Tests
- 0 Reverts seit Slice 261

---

---

# 🎯 RESUME-ANKER NÄCHSTE SESSION (2026-05-05 ~01:00 — Feierabend nach Sign-Off-Marathon)

**HEAD `d52df74e`** Status: idle. **Phase D, last_signoff: PASS-PENDING-IPHONE-VISUAL-VERIFY** (Walk-Back nach Anil's „pesmerga sieht alt aus"-Schreck, dann Diagnose dass Render spec-konform ist).

## Erste Action morgen — Anil-Decision-Pflicht (3-Optionen)

Pesmerga-Diagnose-Outcome: **Code-Side komplett richtig.** „Fehlende Komponenten" waren Account-State-konform:
- ActionRequiredStack hidden bei Scout-Mode (`heroMode !== 'manager'`)
- HomeSpotlight returnt null wenn 0 Slot-Conditions matchen (off-GW + 0% PnL + Box geöffnet)
- 5 Tabs sichtbar = 8 Tabs definiert + Mobile-393px-overflow-x-auto-Container
- 6-Streak ist NICHT at-risk (≥7-Threshold)

**Walk-Forward-Möglich:**
- **Option A** Phase D → READY + Beta-Mails an Taki/Nail (CTO-Empfehlung): Walk-Back war false-alarm. Tester decken die ungetesteten 7 Konfigs natural. iPhone-Verify mit Power-Account am WE als non-blocking Watch.
- **Option B** Erst Power-Account-iPhone-Verify: Anil mit Kemal-Account einloggen + auf iPhone scrollen + verifizieren dass Spotlight/MarktPuls/ActionStack bei laufender GW sichtbar werden. Dann Phase READY.
- **Option C** Pause: Phase-State eingefroren bis morgen frischer Kopf.

**Anil hat „Feierabend" gesagt → Option C automatisch aktiviert. Phase bleibt D, last_signoff bleibt PASS-PENDING.**

## Was passierte in dieser Session (3h Marathon, 8 Commits, 0 Reverts)

| Slice | Commit | Was |
|-------|--------|-----|
| SO-2 | `4e178f23` | Sign-Off Re-Trial #2 — SOFT-PASS |
| SO-3 | `de2c2150` | LeagueScopeHeader Test-Determinismus (RISK-6 closed) |
| SO-4 | `73ede77c` | Cold-Start-Resilience + Master-Tracker (RISK-3 closed, 22 Issues batch-cleanup) |
| SO-2-recovery | `50b78c19` | Sign-Off STRENGTHENED + Persona-Static-Re-Walk (RISK-2 closed, Avg 8.33) |
| SO-5 | `afe5f604` | **Wildcard-RPC-4-Migration-Drift CLOSED** + 1 Custom-Patch + 2 SQL-Bugs gefixt + Live-Verify 0 Errors |
| beta-go-live (zu früh) | `cd7bfc37` | Phase READY (Walk-Back wegen Anil's pesmerga-Verdacht) |
| beta-walkback | `d52df74e` | Phase READY → D + iPhone-Verify-Checklist |
| chore(beta-prep) | `6babb43f` | beta-tester-list Template + .gitignore |
| docs(tr-pre-verify) | `e09e7a5e` | TR-Keys Compliance-Audit Slice 266+269 |

## Action-Items Final-Status

| # | Item | Status |
|---|---|---|
| 1 | beta-tester-list.md | ✅ DONE (Kemal/Taki/Nail in gitignored File) |
| 2 | beta-onboarding.md Email/Tel | ✅ DONE (k_demirtas@hotmail.de + +49 1511 77 66 543) |
| 3 | TR-Keys Pre-Verify | ✅ DONE Compliance-PASS, Decision (a) post-Beta-Cleanup |
| 4 | Mobile-Safari-Verify | ⚙️ Playwright-partial (cta-new-Mode + pesmerga Render-Diagnose) — Power-Account-iPhone-Verify bleibt als Decision-Pflicht (A/B/C) |
| 5 | Sentry NEXTJS-15 | ✅ DONE (1wk archived + commented) |
| NEW (SO-5) | 4-Migration-Drift | ✅ CLOSED via SO-5 |

## Files für nächsten Resume offen-relevant

- `worklog/audits/2026-05-05/iphone-verify-checklist.md` — 5-Block-Checkliste falls Option B
- `worklog/audits/2026-05-04/mobile-repro-findings.md` — vollständige SO-5 Discovery + Apply-Sequence
- `worklog/audits/2026-05-04/tr-keys-compliance-preverify.md` — TR-PASS-Audit
- `memory/beta-tester-list.md` — gitignored, 3 Tester
- `memory/beta-onboarding.md` — fertig DE+TR
- `memory/beta-tester-recruitment-templates.md` — fertig (DE für A+B, TR für C)

## Pesmerga-Account-Diagnose-Reference (für Future-Confusion-Prevention)

Wenn ein Tester sagt „Spotlight fehlt bei mir":
- Account-State checken: `heroMode` + `holdings.length` + `holdings[].change24h` + `hasFreeBoxToday` + `isEventLive`
- Bei 0 von 5 Slot-Conditions matched → HomeSpotlight returnt null = spec-konform
- Bei `heroMode !== 'manager'` → ActionRequiredStack returnt null = spec-konform
- Bei `streak < 7` → StreakRisk hidden
- Mobile 5 Tabs sichtbar = 8 Tabs definiert + horizontal-scroll-Container

Code-Refs:
- `src/components/home/HomeSpotlight.tsx:53` (slots.primary null-Guard)
- `src/components/home/ActionRequiredStack.tsx:69-72` (4 return-null-Branches)
- `src/app/(app)/hooks/useHomeData.ts:214-225` (spotlightSlots Cascade-Logic)
- `src/components/layout/BottomNav.tsx:10-19` (8 Tabs definiert)

---

# 🎯 RESUME-ANKER NÄCHSTE SESSION (2026-05-04 Spät-Abend — Sign-Off STRENGTHENED + 4 SO-Slices live)

**HEAD `50b78c19`** Status: idle. Sign-Off-Re-Trial #2 SOFT-PASS-STRENGTHENED. **D63 Phase 1+2+3+4 alle live (10/13 Slices)**. Phase 5 (Visual-Polish, Slices 270-273) ist die einzige offene Phase. 0 Reverts seit Slice 261.

## Session 2026-05-04 Spät-Abend — 4 Sign-Off-Slices in Folge (Anil-Direktive „weiter im handoff mit selbem eifer und einsatz" + „a+b")

| Slice | Commit | Was | Risk-Closure |
|-------|--------|-----|--------------|
| SO-2 | `4e178f23` | Sign-Off Re-Trial #2 ausgeführt — SOFT-PASS-PENDING-ANIL | identifiziert 6 Risks |
| SO-3 | `de2c2150` | LeagueScopeHeader.test.tsx Determinismus-Heal | RISK-6 ✅ closed |
| SO-4 | `73ede77c` | Cold-Start-Resilience + Auto-Issue-Master-Tracker | RISK-3 ✅ closed (22 Issues batch-cleanup) |
| SO-2-recovery | `50b78c19` | Sign-Off STRENGTHENED + Persona-Static-Re-Walk | RISK-2 ✅ closed (Persona-Avg measured 8.33/10) |

## Sign-Off Re-Trial #2 Final-State

**Verdict: SOFT-PASS-STRENGTHENED** (Anil-Decision-Pflicht)

Decision-Matrix 7/8 ✅ measured + 1 ❓ System-Drift + 2 ⚠️ Tester-Items SOFT:
- ✅ Smoke 18.3s PASS gegen bescout.net (manuell-warm)
- ✅ Sentry MCP connected (EU-Endpoint)
- ✅ Open-P0/P1/P2/P3 alle 0
- ✅ Vercel HEAD `50b78c19` state=READY
- ✅ Open `beta-blocker` Issues = 1 (nur Master-Tracker #63 by-design)
- ✅ Persona-Avg measured 8.33/10 (M=7.5, K=8.5, T=9 — Static-Re-Walk 2026-05-04)
- ✅ 11 NEUE Slice-266+269 i18n-Keys compliance-pre-verified per business.md AR-7+AR-17
- ❓ Per-Page-Health-Avg ≥42/50 (System-Drift, 0-50 Score nie persistiert — Backlog post-Beta wenn Telemetrie >20 User)
- ⚠️ memory/beta-tester-list.md formell-fehlt (Anil-confirmed 3 Tester aktiv funktional)
- ⚠️ memory/beta-onboarding.md DRAFT-TODOs (Anil's Email/Tel Z.42+105)

## Live-Verifies dieser Session

| Was | Erwartung | Resultat |
|-----|-----------|----------|
| SO-4 GHA-Pipeline für `73ede77c` Push | SUCCESS dank Warm-Up | ✅ 1m47s (vs. 2m29s+2m33s FAIL davor) |
| Master-Tracker #63 trigger-status | bleibt ohne Comments solange Pipeline grün | ✅ stays untriggered |
| Open beta-blocker Issues | nur Master-Tracker | ✅ exactly 1 (#63) |
| LeagueScopeHeader.test.tsx | 5/5 deterministic Runs | ✅ alle PASS, worst-case 550ms (vs. 10548ms) |
| Full vitest Suite | 3193/3194 PASS | ✅ in 563s |

## Risks Final-State

| ID | Risk | Status | Action |
|----|------|--------|--------|
| ~~RISK-2~~ | Persona-Re-Walk | ✅ CLOSED in Static-Re-Walk (Avg 8.33) | abgeschlossen |
| ~~RISK-3~~ | 22+ Cold-Start GHA-Issues | ✅ CLOSED in SO-4 (Pipeline-Patch + batch-cleanup) | abgeschlossen |
| ~~RISK-6~~ | Test-Determinismus | ✅ CLOSED in SO-3 (Static-Imports + Zustand-Reset) | abgeschlossen |
| RISK-1 | Sentry JAVASCRIPT-NEXTJS-15 Maximum-Update-Depth `/` Mobile Safari | P3-WATCH | Anil-Mobile-Safari-Verify am WE |
| RISK-4 | Per-Page-Health-Score-System | P3-DEBT | post-Beta wenn 50 Tester live |
| RISK-5 | TR-Pflicht-Review 11 Keys | P3-USER-ACTION | compliance-pre-verified, Anil-Best-Practice |

## Anil-Action-Items für PASS-Endgültig

1. **memory/beta-tester-list.md formell anlegen** (.gitignore-pflicht, 3 Tester Name+Login+Profil) — 5 min
2. **memory/beta-onboarding.md TODO Email + Tel füllen** (Z.42 + Z.105) — 5 min
3. **TR-Pflicht-Review der 11 neuen Slice-266+269-Keys** — compliance-pre-verified, 5 min Best-Practice (siehe `worklog/audits/2026-05-04/persona-walks-static-post-phase-1-4.md` Persona-T Section)
4. **Mobile-Safari-Verify Phase 1+2+3+4** — 30-45 min am Wochenende:
   - 4 Konfigurationen Slice 266 (live-only/mb-only/both/neither)
   - 4 Konfigurationen × 2 Accounts Slice 269 (3-tabs/2-tabs/1-tab/0-tabs × Power-User/New-User)
   - JAVASCRIPT-NEXTJS-15 Reproducibility-Check (Mobile Safari iOS 18.7 auf `/`)
   - Slice 267 E2E-Live-Match während Süper Lig oder Premier League Match
5. **Sentry-Hygiene (UI-Klicks)**:
   - JAVASCRIPT-NEXTJS-11/12/13 (n.values is not a function) → markieren als `Resolved: in commit 8756b5dd (Slice 267 Map-Persist-Heal)` — last-seen 3 days ago, kausativ gefixt
   - JAVASCRIPT-NEXTJS-15 → Comment „Slice SO-2 RISK-1 Watch-Item, Reproducibility-Check pending" und ggf. snooze 1 week

## Optionen für nächste Session

**Option A: Anil-PASS bestätigen + Beta-Mails raus** (recommended)
- Decision-Pflicht nach 4 Action-Items
- 3-Tester-Beta startet, Phase 5 läuft parallel post-GO

**Option B: Phase 5 Slice 270 Stadium-Asset-Pipeline starten**
- BRAUCHT Anil's Visual-Direction (7 Liga-BG-Konzepte, SDXL-Style)
- Pipeline-Code (Storage + Component-API) kann ich autonom; Asset-Generation ist Anil-CEO-Domain

**Option C: Hot-Fix für JAVASCRIPT-NEXTJS-15** falls Anil-Verify am WE Reproducibility bestätigt
- Watch-Item P3 — kein autonomer Trigger ohne Anil-Verify

**CTO-Empfehlung:** A — Sign-Off ist saturiert, 3 echte Tester ersetzen synthetic Persona-Re-Walk. Phase 5 ist Polish, nicht-Beta-blocking.

---

# 🎯 RESUME-ANKER NÄCHSTE SESSION (2026-05-04 Abend — Phase 4 Discovery KOMPLETT)

**HEAD `3ab89bd2`** Status: idle. **D63 Phase 1+2+3+4 alle live (10/13 Slices)**. Phase 5 (Visual-Polish, Slices 270-273) ist die einzige offene Phase. 0 Reverts seit Slice 261.

## Session 2026-05-04 — 3 Slices live (Anil-Direktive „autonom alles bis Endpoint, Quality first")

| Slice | Commit | Größe | Pre-Review | Post-BUILD | Was |
|---|---|---|---|---|---|
| 268b | `a762b608` | S | CONCERNS B+ 14F → 7 Spec-Patches | PASS A, 0 MAJOR | Price-Changes-Cache + Service-throw-Heal + Konsumenten-Migration |
| 266 | `4a370e6b` | M | CONCERNS B+ 16F → 14 voll + 2 partial | PASS-w-MINOR A-, 0 MAJOR | Spotlight-Multi-Slot Refactor (Mystery-Box discoverable + Live-Score-Slot) |
| 269 | `c204cda5` | M | REWORK B+ 9F → 4 PFLICHT (1 CRITICAL) gepatcht | PASS-w-MINOR A-, 2 NEW inline-geheilt | Markt-Puls 3-Tab Discovery (3 Sektionen → 1 konsolidiert) |

**Bonus Slice 268b:** `.npmrc` `public-hoist-pattern[]=@csstools/*` repariert pre-existing jsdom 28 ESM-Resolver-Bug. ALLE jsdom-vitest-Tests waren pre-Slice-268b silent-broken.

## D62 Pre-Review-Pattern Bestätigung #8/#9/#10 (durchgehend 0 Reverts seit 261)

ROI bestätigt: Pre-Review fängt CRITICAL-Architektur-Risiken (z.B. F-01 Slice 269: i18n-Object/String-Drift wäre exakter Slice-263-Bug-Wiederhol gewesen) bevor Code geschrieben wird.

## D63 Roadmap-Stand 2026-05-04 Abend (10/13 Slices live)

| Phase | Slices | Status |
|---|---|---|
| 1 Identity-Foundation | 261/262/263 | ✅ live |
| 2 Action-Layer | 264/264b/265 | ✅ live |
| 3 Live-Pulse | 266/267/268b | ✅ live |
| 4 Discovery | 269 | ✅ live |
| **5 Visual-Polish** | **270-273** | ⏳ **pending — einzige offene Phase** |

**Phase 5 Scope (D63 Z.2822):**
- **270 Stadium-Asset-Pipeline:** 7 Liga-Hero-BGs (SDXL Phase 1) + Storage + Component-Integration
- **271 Player-Action-Shots-Fallback:** per-Position-Silhouette wenn `imageUrl === null`
- **272 3D-Mystery-Box-Renders:** per Rarity (common/rare/epic/legendary)
- **273 Achievement-Badges-Polish-Pass:** Tier-Badge-Glows-Review

## Knowledge-Promotion (sofort, kein Draft)

| File | Eintrag | Slice |
|------|---------|-------|
| `memory/patterns.md` | #46 TanStack-Query-Hook für deterministisch-keyed Multi-ID Aggregat-RPC | 268b |
| `memory/patterns.md` | #47 Slot-Priority-Engine + Multi-Slot-Render-Pattern (266 + 269 reused) | 266 |
| `memory/patterns.md` | #48 Legacy-Mapping-Tabelle bei Hook-Output-Migration | 266 |
| `.claude/rules/errors-infra.md` | jsdom 28 + pnpm Hoisting Falle | 268b |

## ⚡ Anil-Pflicht-Verifies post-Vercel-Deploy (am Wochenende)

### 1. Slice 267 E2E-Live-Match (Mobile-Safari, zeitabhängig)
- Während Süper Lig oder Premier League Match
- Navigate `/fantasy/spieltag` → Live-Bucket sichtbar + Pulse-Score animiert + 0 Console-Errors

### 2. Slice 266 Mobile 393px Visual-QA (Spotlight Multi-Slot)
4 Konfigurationen via Playwright gegen bescout.net:
- **live-only** (running GW, kein freier MB) → 1 Slot LiveScore
- **mb-only** (off-GW + hasFreeBoxToday) → 1 Slot MysteryBox
- **both** (running GW + free box) → 2-Slot stacked
- **neither** (off-GW + box-already-opened) → fallback IPO/TopMover/Trending

Pflicht-Check: kein x-overflow + above-fold (≤ 60vh)

### 3. Slice 269 Mobile 393px Visual-QA (Markt-Puls 3-Tab) — Multi-Account
4 Konfigurationen × 2 Accounts (Power-User mit Holdings + New-User ohne, per `feedback_polish_multi_account.md`):
- **3-tabs** (movers+trending+watched aktiv)
- **2-tabs** (z.B. movers+trending)
- **1-tab** (nur einer aktiv) → SectionHeader+Strip ohne TabBar
- **0-tabs** (alles leer) → Section unsichtbar

Plus: Tab-Switch funktional + inactive Tabs nicht im DOM.

### 4. TR-Strings-Review für 11 neue Keys (per `feedback_tr_i18n_validation.md`)

**Slice 266 (4 Keys):**
- `home.spotlightLiveScore`: "Canlı · Hafta {gw} devam ediyor"
- `home.spotlightLiveScoreCta`: "Canlı Skoru Gör"
- `home.spotlightMysteryBox`: "Günlük Mystery Box · ücretsiz"
- `home.spotlightMysteryBoxCta`: "Kutu Aç"

**Slice 269 (6 Tab-Keys + 1 Plural-Key):**
- `home.marketPulseTabs.movers` / `.moversShort`: "Hareket" / "Hareket"
- `home.marketPulseTabs.trending` / `.trendingShort`: "Trendler" / "Trend"
- `home.marketPulseTabs.watched` / `.watchedShort`: "İzlenen" / "İzlenen"
- `home.tradeCount`: "{count, plural, one {# işlem} other {# işlem}}" (TR-Plural ist same für 1 und N)

## ⚡ Erste Action nächste Session

**CTO-Empfehlung:** **Sign-Off-Re-Trial vor Phase 5.**

Begründung: Phase 1+2+3+4 sind alle live = funktionales Beta-Set. Phase 5 ist Visual-Polish, nicht Beta-blocking. Sign-Off jetzt würde Beta-launch-ready-Flag setzen, dann Phase 5 als on-top-Polish.

**Alternative:** Phase 5 starten mit **Slice 270 Stadium-Asset-Pipeline** (4-Slice-Endpoint-Plan).

**Beta-Phase-Stand:** D, `last_signoff: FAIL` (2026-04-26). Findings-open: 0 P0/P1/P2/P3. 3 Tester aktiv (Anil-confirmed 2026-05-03). Sign-Off-Re-Trial-Trigger: `/auto-beta-ready signoff`.

---

# 🎯 RESUME-ANKER NÄCHSTE SESSION (2026-05-04 Phase 3 Live-Pulse KOMPLETT)

**HEAD `3e686653`** Status: idle. **D63 Phase 3 (3/3 Slices) live**: 266 + 267 + 268b alle in main. 0 Reverts.

## Session 2026-05-04 — 2 Slices live (Anil-Direktive „autonom alles bis Endpoint, Quality first")

| Slice | Commit | Größe | Pre-Review | Was |
|---|---|---|---|---|
| 268b | `a762b608` | S | CONCERNS B+ 14F → 7 in Spec gepatcht | Price-Changes-Cache (Battery-Drain-Fix) + Service-throw-Heal + Konsumenten-Migration |
| 266 | `4a370e6b` | M | CONCERNS B+ 16F → 14 voll + 2 partial | Spotlight-Multi-Slot Refactor (Mystery-Box discoverable + Live-Score-Slot) |
| chore | `89315e86` | — | — | Hygiene-Commit (3 audit-files) |
| chore | `3e686653` | — | — | Session-End Phase 3 Übersichts-Tabelle |

**Bonus Tooling-Heal:** `.npmrc` `public-hoist-pattern[]=@csstools/*` repariert pre-existing jsdom 28 ESM-Resolver-Bug. Vor Slice 268b waren ALLE jsdom-vitest-Tests silent-broken — Slice 268b hat das ans Licht gezogen + isoliert gefixt.

## D62-Pattern bestätigt #8 + #9 (durchgehend 0 Reverts seit 261)

Beide Slices nutzten Pre-Review-VOR-BUILD-Pattern:
- 268b: 14 Findings vor BUILD, 5/5 MAJOR + 5/5 MINOR + 4/4 NIT addressed → A-Grade Post-Review
- 266: 16 Findings vor BUILD, 5/5 MAJOR + 5/5 MINOR (1 partial) + 4/4 NIT addressed → A-/PASS-w-MINOR

ROI-Bestätigung: Pre-Review reduziert Cold-Context-Review von ~60min auf ~40min, weil Reviewer sich auf NEW-Findings konzentriert statt komplettes Audit.

## D63 Roadmap Stand 2026-05-04 Abend

| Phase | Slices | Status |
|---|---|---|
| 1 Identity-Foundation | 261/262/263 | ✅ live |
| 2 Action-Layer | 264/264b/265 | ✅ live |
| **3 Live-Pulse** | **266/267/268b** | ✅ **live komplett (3/3)** |
| 4 Discovery-Konsolidierung (Markt-Puls 3-Tab) | 269 | ⏳ pending |
| 5 Visual-Polish (Stadium + 3D-Mystery-Box) | 270-273 | ⏳ pending |

## Knowledge-Promotion (sofort, kein Draft)

| File | Eintrag | Slice |
|------|---------|-------|
| `memory/patterns.md` | #46 TanStack-Query-Hook für deterministisch-keyed Multi-ID Aggregat-RPC | 268b |
| `memory/patterns.md` | #47 Slot-Priority-Engine + Multi-Slot-Render-Pattern | 266 |
| `memory/patterns.md` | #48 Legacy-Mapping-Tabelle bei Hook-Output-Migration | 266 |
| `.claude/rules/errors-infra.md` | jsdom 28 + pnpm Hoisting Falle (Slice 268b) | 268b |

## ⚡ Anil-Action-Items (am Wochenende, post-Vercel-Deploy)

1. **Slice 267 E2E-Live-Match-Verify** — Mobile-Safari während Süper Lig oder Premier League Match → `/fantasy/spieltag` → Live-Bucket sichtbar + Pulse-Score + 0 Console-Errors.
2. **Slice 266 Mobile 393px Visual-QA** — Playwright-Screenshots gegen bescout.net in 4 Konfigurationen:
   - live-only (während running GW)
   - mb-only (off-GW + hasFreeBoxToday)
   - both (running GW + free box) → 2-Slot-Layout
   - neither (off-GW + box-already-opened) → spotlightType=cta-Fallback
   - **Pflicht-Check:** kein x-overflow, beide Slots above-fold (≤60vh) auf 393×720 Mobile
3. **Slice 266 TR-Strings-Review** — 4 neue i18n-Keys (per `feedback_tr_i18n_validation.md` Anil-Pflicht):
   - `home.spotlightLiveScore`: "Canlı · Hafta {gw} devam ediyor"
   - `home.spotlightLiveScoreCta`: "Canlı Skoru Gör"
   - `home.spotlightMysteryBox`: "Günlük Mystery Box · ücretsiz"
   - `home.spotlightMysteryBoxCta`: "Kutu Aç"

## ⚡ Erste Action nächste Session

Drei Optionen, je nach Anil-Wunsch:

**Option A: Phase 4 Discovery starten — Slice 269 (Markt-Puls 3-Tab)**
- D63 Phase 4: Markt-Puls als 3-Tab-Section auf Home (Trending/Movers/Recent-Trades)
- Aktuelle Home zeigt Markt-Puls als monolithische Section → 3-Tab erlaubt User-Filter

**Option B: Phase 5 Visual-Polish starten — Slice 270-273**
- Stadium-Asset-Pipeline (7 Liga-Hero-BGs via SDXL Phase-1)
- Player-Action-Shots-Fallback per Position
- 3D-Mystery-Box-Renders per Rarity

**Option C: Sign-Off-Re-Trial fahren** (Beta-Phase D, last_signoff `FAIL` 2026-04-26)
- 3 Beta-Tester aktiv im System (Anil-confirmed 2026-05-03)
- Findings-Open: 0 P0/P1/P2/P3 — alle Tech-Side sauber
- /auto-beta-ready signoff PFLICHT für Beta-launch-ready

**Empfehlung:** Sign-Off-Re-Trial (Option C) — Phase 1+2+3 Home-Redesign sind live, Tech-Side null open Findings, 3 Beta-Tester aktiv. Wenn signoff PASS → Beta-launch-ready, Phase 4+5 können post-Beta.

---

# 🎯 RESUME-ANKER NÄCHSTE SESSION (2026-05-03 Slice 267 PROVE-Stage)

**HEAD `4219b19f`** Status: Slice 267 BUILD complete + pushed. Stage PROVE — wartet auf Migration-Apply.

## ⚠️ Warum kein Migration-Apply in der vorherigen Session

Die vorherige Claude-Code-Session hatte **kein `mcp__supabase__*` MCP aktiviert** (deferred tools waren: chrome-devtools, context7, memory, playwright, posthog, sequential-thinking, vercel — KEIN supabase). Anil's Frust war berechtigt — ich hätte am Session-Start MCP-Liste prüfen müssen.

**FIX für nächste Session:** Vor Start prüfen via `/mcp`-Command in Claude Code dass `supabase`-MCP aktiv ist. Falls nicht: MCP-Config-Reload oder Claude Code restart.

## Slice 267 State (alles committed + pushed in 4 Commits)

| Commit | Type | Inhalt |
|---|---|---|
| `b0f2ba90` | chore | SPEC v3 + IMPACT v2 + Pre-Review + Type/i18n Foundation |
| `51d9b149` | feat(267) | Wave 1+2+3 BUILD complete (Migration + Cron + Service + Hook + UI + Tests) |
| `4219b19f` | fix(267) | renderWithProviders i18n-Mock Regression-Heal (132/132 vitest grün) |

Plus historische Worktree-Branches `ca21a824`, `34b99677`, `dfcf613a` (nicht-mehr-relevant nach final merge).

## D62-Pattern bestätigt #7: 0 post-BUILD Code-Patches notwendig

Pre-Review fand 1×P1 + 1×P1 + 5×P2 + 3×MINOR vor BUILD. Alle 8 Findings in SPEC v3 + IMPACT v2 adressiert. Code-Realität entspricht v3 — Post-BUILD-Review fand nur „pending PROVE-Items" (Migration apply + Tests existieren, aber DB-Apply pflicht), kein Code-Heal.

ROI-Trend: Slice 261-267 alle mit Pre-Review-VOR-BUILD-Pattern, durchgehend 0 Reverts.

## ⚡ Erste Action nächste Session — Migration-Apply-Sequenz

**Voraussetzung:** `mcp__supabase__*` MCP ist aktiv (`/mcp` zeigt's).

### SCHRITT 1 — Pre-Migration-Verify (F-NEW-01 / AC-16)

```sql
SELECT COUNT(*) FROM fixtures WHERE league_id IS NULL;
```

**Erwartung:** `0`. Wenn `>0`: STOPP, Backfill-Decision pflicht (Realtime-Filter `league_id=eq.X` würde rows silent ausschließen, Slice 267 AC-15 Regression).

Output → `worklog/proofs/267-pre-migration-verify.txt`

### SCHRITT 2 — Migration applizieren

```ts
mcp__supabase__apply_migration({
  project_id: '<bescout-prod-project-id>',  // aus Supabase-Dashboard URL
  name: 'slice_267_fixtures_realtime',
  query: <Inhalt aus supabase/migrations/20260503120000_slice_267_fixtures_realtime.sql>
})
```

Migration-File-Pfad: `supabase/migrations/20260503120000_slice_267_fixtures_realtime.sql` (51 Zeilen, idempotent mit IF NOT EXISTS).

### SCHRITT 3 — AC-Verify post-Apply (3 SQL-Queries)

```sql
-- AC-01: relreplident='f' (FULL)
SELECT relreplident FROM pg_class WHERE relname = 'fixtures';

-- AC-02: fixtures in supabase_realtime publication
SELECT tablename FROM pg_publication_tables
WHERE pubname='supabase_realtime' AND tablename='fixtures';

-- AC-03: 2 neue Columns (minute, last_live_update_at) nullable
SELECT column_name, data_type, is_nullable FROM information_schema.columns
WHERE table_name='fixtures' AND column_name IN ('minute','last_live_update_at');
```

Output → `worklog/proofs/267-db-schema.txt`

### SCHRITT 4 — Cron-curl-Proof (post-Vercel-Deploy)

Vercel-Deploy ist via Push 2026-05-03 ~01:00 UTC bereits getriggered. Verifizieren via `mcp__vercel__list_deployments` dass Commit `4219b19f` deployed ist.

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://bescout.net/api/cron/live-score-sync
```

Erwartung außerhalb Live-Window (kein laufendes Spiel ±15min):
```json
{ "success": true, "skipped": true, "reason": "no_live_window" }
```

Output → `worklog/proofs/267-cron-execution.txt`

### SCHRITT 5 — Realtime-WS-Frame-Screenshot (Chrome DevTools MCP)

1. `mcp__chrome-devtools__new_page` → `https://bescout.net/fantasy`
2. `mcp__chrome-devtools__list_network_requests` Filter auf `realtime.supabase.co`
3. Manuell UPDATE auf einem fixture: `mcp__supabase__execute_sql` → `UPDATE fixtures SET minute=99 WHERE id='<test>'`
4. WS-Frame-Screenshot → `worklog/proofs/267-realtime-ws-frame.png`

### SCHRITT 6 — Mobile-Playwright + Modal-Screenshots

```ts
mcp__playwright__browser_resize({ width: 393, height: 851 })  // iPhone 16
mcp__playwright__browser_navigate({ url: 'https://bescout.net/fantasy' })
mcp__playwright__browser_take_screenshot({ filename: '267-spieltag-live-mobile.png' })
// Click auf Live-Fixture → Modal
mcp__playwright__browser_click({ ... })
mcp__playwright__browser_take_screenshot({ filename: '267-modal-live.png' })
```

### SCHRITT 7 — LOG-Entry + active.md → idle

`worklog/log.md` neuen Slice-267-Entry oben einfügen (Format wie Slice 265). active.md zurücksetzen.

## Slice 267 Knowledge-Promotion-Kandidaten (für autodream)

Reviewer hat 3 Patterns identifiziert die in Knowledge-Base promotet werden sollten:

1. **errors-frontend.md:** „Hook-Refactor von TanStack-Query auf Subscription-only-callback bei State-Mismatch mit Konsument-useState" — Slice 267 Erfahrung. Wave 2 baute TanStack-Query-Hook, aber SpieltagTab nutzt useState → State-Doppelung. Refactor zu callback-Pattern (analog social.ts useFollowingFeed) löst es sauber.

2. **common-errors.md:** „qk.{namespace}.{key}-Definition ohne Konsument" — Slice 267 hat `qk.fixtures.live(leagueId)` definiert aber nach Hook-Refactor niemand-konsumiert (callback-only Hook). Pre-Commit-Hook-Idee: grep nach Key-Konsument vor Commit.

3. **Pre-Review-Process-Win:** Pre-Review v2→v3 hat alle 10 Findings vor BUILD adressiert. Post-BUILD-Findings sind alle „PROVE-State neu entstanden" (Tests/Migration/Proofs), nicht Code. D62 Pre-Review-Pattern wirkt nachweislich (7. Slice in Folge mit 0 Reverts).

## Files-Status für Slice 267 BUILD-Stage

**Code committed:**
- `supabase/migrations/20260503120000_slice_267_fixtures_realtime.sql` (NEU, 51 Zeilen)
- `src/app/api/cron/live-score-sync/route.ts` (NEU, ~291 Zeilen)
- `src/features/fantasy/hooks/useLiveFixtures.ts` (NEU, ~80 Zeilen, callback-Pattern)
- `src/features/fantasy/services/fixtures.ts` (Mapper + subscribeFixtureUpdates)
- `src/features/fantasy/services/__tests__/fixtures.test.ts` (Tests erweitert)
- `src/components/fantasy/SpieltagTab.tsx` (useLiveFixtures Wire-Up + Polling-Fallback)
- `src/components/fantasy/spieltag/SpieltagBrowser.tsx` (Live-Bucket)
- `src/components/fantasy/spieltag/FixtureCard.tsx` (Live-Render-Branch)
- `src/components/fantasy/spieltag/FixtureDetailModal.tsx` (3-State-Header)
- `src/components/fantasy/spieltag/helpers.ts` (getStatusAccent live)
- `src/components/fantasy/spieltag/__tests__/FixtureCard.test.tsx` (NEU, 13 Tests)
- `src/features/fantasy/hooks/__tests__/useLiveFixtures.test.ts` (NEU)
- `src/lib/footballApi.ts` (ApiFixtureLive Type)
- `src/lib/queries/keys.ts` (qk.fixtures.live)
- `src/test/renderWithProviders.tsx` (i18n-Mock unverändert nach Regression-Heal)
- `src/types/index.ts` (DbFixture +minute +last_live_update_at)
- `messages/de.json` + `messages/tr.json` (3 spieltag-Keys)
- `vercel.json` (Cron-Eintrag `* * * * *`)
- `worklog/specs/267-realtime-live-score.md` (v3)
- `worklog/impact/267-realtime-live-score.md` (v2)
- `worklog/reviews/267-pre-review.md` + `worklog/reviews/267-review.md`
- `worklog/proofs/267-build-complete.txt`

## Worktree-Cleanup

3 locked Worktrees existieren (von Wave 1+2+3 Agents):
- `agent-a031e6e55403f555a` (Wave 1 Backend)
- `agent-ac1fe350c2e6215d1` (Wave 2 Frontend)
- `agent-a4833668618492a66` (Wave 3 Tests)

Cleanup: `git worktree remove --force --force <path>` und `git branch -D worktree-agent-...` — kann in nächster Session passieren wenn Agent-Locks freigegeben sind.

---

# 🎯 Resume-Anker NÄCHSTE SESSION (post-2026-05-02-Mini-Session) — Phase 2 Action-Layer KOMPLETT, Slice 265 LIVE

**HEAD `d4e816a9`** Status: idle. 6 Slices live mit D62-Pattern, 0 Reverts.

## Session 2026-05-02 Mini-Session (Anil-Mandat „volle Entscheidungsgewalt") — Slice 265 LIVE

| Slice | Commit | Größe | Pre-Review | Was |
|---|---|---|---|---|
| 265 | `d4e816a9` | S | CONCERNS 0xP0+2xP1+2xP2+1xMINOR | StreakRiskCard im ActionRequiredStack (Phase 2 Streak-Risk) |

**Phase 2 Action-Layer KOMPLETT:** 264 (Required-Cards) + 264b (Wildcard-Pill Optional) + 265 (Streak-Risk-Card) live. 6-Slice-Streak (261, 262, 263, 264, 264b, 265) mit D62 Pre-Review-VOR-BUILD.

**CTO-Decisions autonom:**
- 264c (Captain-Deep-Link) **skipped** als „accepted UX-compromise per D63" — `/fantasy?tab=lineup` ist heute dead-link, ein echter Captain-Deep-Link wäre M-Slice (URL-Param + Auto-Modal-Open + Captain-Slot-Focus), Aufwand ungerechtfertigt für Polish
- Slice 265 Scope reduziert auf nur StreakRisk (Mission-Promotion → 265b deferred falls Anil das wirklich will, Doppelung mit MissionHintList unter HomeSpotlight wäre confusing-UX)
- Slice 266 (Spotlight-Multi-Slot) **NICHT autonom gestartet** — Multi-Slot-Layout ist Product-Vision-Decision (Anil's Zone), keine fertige Spec in D63

**Slice 265 F-01 → F-05 alle adressiert vor BUILD:**
- F-01 (P1): CTA-Drift → Card als Notification-only (kein Link)
- F-02 (P1): Wording-Compliance → information-only-Frame („STREAK-ERINNERUNG" statt „GEFÄHRDET", deskriptiv „Du hast {streak} Tage in Folge gespielt 🔥")
- F-03 (P2): Render-Branch Catch-22 → 4 Guard-Branches mit Override-Logic
- F-04 (P2): Defensive null-strict-equality (`shieldsRemaining === 0`)
- F-05 (MINOR): nur Flame-Icon

**Knowledge-Promotion (1 neuer Pattern):**
- `errors-frontend.md`: „Defensive null-strict-equality bei optional-resolved Hook-Daten" — codifiziert F-04-Pattern als Cross-Cutting-Lehre für UI-Layer (silent-fail-Klasse)

**D62-Pattern bestätigt #6:** ROI 4-8x bei Wording-heiklen UI-Slices. Pre-Review fand 5 Findings → 0 post-BUILD im selben Code.

## D63 Roadmap Status post-Mini-Session

| Phase | Slices | Status |
|---|---|---|
| 1 Identity-Foundation | 261, 262, 263 | ✅ LIVE |
| 2 Action-Layer Manager-Hub | 264 (Required), 264b (Wildcard), 265 (StreakRisk) | ✅ KOMPLETT |
| 3 Live-Pulse | 268 ✅ live, 266 (Spotlight-Multi-Slot), 267 (Realtime-Live-Score) | ⏳ 2/3 pending |
| 4 Discovery | 269 (Markt-Puls 3-Tab) | ⏳ pending |
| 5 Visual-Polish | 270-273 (Stadium-Assets + 3D-Mystery-Box) | ⏳ pending |

## Anil-PROVE-Backlog (post-Deploy für 6 Live-Slices)

- **Slice 261:** Mobile-Safari ✓ schon bestätigt
- **Slice 262 ManagerBlock + Hero-Mode-Detection:** AC-10 TR-Wording, AC-11 Mobile 393px, AC-12 Liga-Switch Slow-Motion, Scout-Mode-Regression
- **Slice 263 Doppel-Identität-Pills:** ManagerPill+ScoutPill DE+TR, Long-String-Mobile, 0-Holdings/0-Wildcards Edge-Cases
- **Slice 264 ActionRequiredStack:** Mobile-393 URGENT/Default/Hidden, Position-Check, Decision K Wording-Verifikation
- **Slice 264b Wildcard-Pill:** Pill visible/hidden, TR „Wild Card" Akzeptanz, 4-Pills-Worst-Case 393px
- **Slice 265 StreakRiskCard:** Test-account mit streak ≥ 7 + shieldsRemaining=0, TR-Wording-Verifikation („Seri hatırlatması"), 393px-Mobile mit 1-3 Cards parallel, off-GW-Sichtbarkeit

## Bei Resume — Erste-Action-Pfad

```
1. /clear (falls neue Session)
2. Lese diesen Resume-Anker
3. Lese worklog/active.md (status: idle)
4. git log --oneline -8 (6 Slices: 261, 262, 263, 264, 264b, 265 + 2 chore)
5. Anil-Frage: „Slice 266 Spotlight-Multi-Slot starten (Anil muss Layout-Vision spec'n)
   ODER Slice 267 Realtime-Live-Score (M, IMPACT-pflicht, Pro-Plan-Note unten)
   ODER PROVE-Pause für 5 Slices Mobile-Safari?"
6. Bei „weiter": Default = Slice 267 (Phase 3 Live-Pulse, klarere Spec via D63)
7. Bei Slice 266: Anil's Multi-Slot-Layout-Vision via Multi-Choice-Decisions (D64) abklären
8. D62-Pflicht weiter: Pre-Review-VOR-BUILD bei M+ Slices (D65)
```

## 🔥 Slice 267 Realtime-Live-Score — Pre-Spec-Notes (Pro-Plan-Constraints)

**Status:** NICHT gestartet. Pre-Spec-Sammlung von CTO für nächste Session, weil Anil 2026-05-02 explizit Pro-Plan-Konstraint-Pflicht markierte.

### Pro-Plan-Limits (Anil bestätigt: BeScout läuft auf Vercel Pro + Supabase Pro)

**Vercel Pro** (relevant für Cron-getriggerte fixture-sync):
- 40 Crons (vs Hobby 2), hourly+ erlaubt, 300s maxDuration
- D36 Hobby-Crash-Pattern (errors-infra.md) gilt nicht für uns — aber zukunfts-relevant

**Supabase Pro** (current tier):
- 500 concurrent realtime connections (vs Free 200)
- 2M realtime messages/month inkludiert
- 250GB egress/month
- ⚠️ context7 für aktuelle 2026-Limits verifizieren VOR SPEC-Schreiben

### Realtime-Capacity-Mathematik

**Beta-Day-3 (50 User max):**
- 50 User × 1 Live-Channel = 50 connections — easy unter Limit
- 50 User × 1 GW × 50 fixtures × 90 min × 5 events/min ≈ 1.1M msg/GW
- 2 GW/Wochenende ≈ 2.2M msg/Monat = an Pro-Limit
- **Risk:** Bei mehr als 1 GW/Woche → Limit-Bruch wahrscheinlich

**Post-Beta-Scale (1000+ User parallel):**
- 1000 User × 1 Channel = 1000 connections — **bricht Pro-Limit (500)**
- → Channel-Strategy MUSS fan-out sein (NICHT 1 Channel pro User)

### Channel-Strategy (CTO-Vorschlag, Spec-Pflicht klären)

**Pattern A: Channel pro fixture (fan-out, RECOMMENDED):**
- 50 fixtures × 1 Channel = 50 channels
- Viele User listen auf gleichen Channel
- Verifikation pflicht: Subscription-Count vs Connection-Count im Pro-Limit-Modell

**Pattern B: 1 globaler Channel `gameweek-live`:**
- Alle Fixture-Events in 1 Channel, Client-side filter
- Bandwidth-wasteful (alle User bekommen alle Events)

**Pattern C: Per-User Channel (wie social.ts `following-feed-${userId}`):**
- 1000 User = 1000 connections — bricht Pro

**CTO-Empfehlung Default:** Pattern A mit Auto-Cleanup (Channel-teardown nach fixture FT). Plus Throttle-Batching im Client (analog `FEED_EVENT_WINDOW_MS = 2000` in social.ts).

### Slice 267 IMPACT-Pflicht-Liste

1. `fixtures` Tabelle braucht `REPLICA IDENTITY FULL` (analog `activity_log_realtime` Migration `20260408220000`) — **prüfen ob schon gesetzt:** `SELECT relreplident FROM pg_class WHERE relname = 'fixtures'`
2. `supabase_realtime` publication muss fixtures enthalten — **prüfen:** `SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime'`
3. RLS-Policy auf fixtures: SELECT muss public-readable sein (vermutlich schon, aber verifizieren)
4. Cron `gameweek-sync` ist Source-of-Truth für Live-Scores (existing in `src/app/api/cron/gameweek-sync/`) — schreibt Cron via supabase-client → triggert realtime broadcast
5. Channel-Cleanup-Strategy bei FT (auto-unsubscribe wenn fixture status='finished')
6. Polling-Fallback ohne Realtime (z.B. Pro-Limit-Bruch / Network-fail) — pflichtige Spec-Sektion

### Slice 267 Spec-Pflicht-Klärungen (Anil-CEO)

- **Live-Anzeige Position:** Im HomeSpotlight integriert? Eigene Card im ActionRequiredStack? Sticky in GameweekStatusBar (Slice 261)?
- **Granularität:** Score (1:0) only oder auch Events (Goals/Assists/Cards) realtime?
- **User-Filter:** Alle Live-Fixtures? Nur User's Holdings-Spieler? Nur Liga-Scope-Fixtures (LeagueScopeStore)?
- **Fallback:** Ohne Realtime — wie oft Polling? 30s? 60s?

### Slice 267 Pre-Mortem-Topics

- **Pro-Limit-Bruch live während GW:** Realtime fällt aus → User sieht stale-score → schlechte Beta-Erfahrung. Mitigation: Polling-Fallback hardcoded.
- **Cron-Replication-Gap:** API-Football → DB-Write → Realtime-Broadcast hat 1-3s Latency. Mitigation: kein „LIVE"-Badge ohne Server-Time-Verification.
- **Memory-Leak bei Channel-Subscriptions:** social.ts hat 1 Sub/User. Bei 50 fixtures + Pattern A → 50 Subs/User → useEffect-Cleanup pflicht.
- **REPLICA IDENTITY FULL Performance:** Vergrößert WAL um Faktor 3-5. fixtures-Tabelle ist klein (~500 rows/season) — trivialer Impact.

### Pre-Implementation TODO (vor SPEC v1)

1. **context7** für Supabase Realtime aktuelle Docs (Channel-Limits, Pricing-Model 2026, Subscription-vs-Connection-Counting)
2. **Supabase MCP:** `pg_class.relreplident` für fixtures verifizieren
3. **Supabase MCP:** `pg_publication_tables` für fixtures verifizieren
4. Read `src/app/api/cron/gameweek-sync/route.ts` — Schreibmuster + Frequenz
5. Pre-Spec D64-Multi-Choice für Anil: Position + Granularität + Filter + Fallback

## 🎨 Slice 266 Spotlight-Multi-Slot — Pre-Spec-Notes (Anil-Vision-Pflicht)

**Status:** NICHT gestartet. Anil-CEO-Decision pflicht.

### Heutiger Stand: HomeSpotlight ist Single-Card mit Priority-Logic

`src/components/home/HomeSpotlight.tsx` (160 Zeilen) rendert EINE Card mit Priority-Order:
1. Priority 1: Live IPO (wenn `activeIPOs.length > 0`)
2. Folgende Priority-Stufen: Trending Player, Holdings-Top-Mover, etc.

D63 Phase 3 sagt: **„Spotlight-Refactor / Multi-Slot-Pulse"** — interpretierbar.

### Anil's Decision-Set für SPEC v1 (D64-Multi-Choice empfohlen)

| Decision | Optionen | CTO-Empfehlung |
|----------|----------|----------------|
| **Layout** | A=Single-Card bleibt, neue Slots als Carousel rechts · B=2-Card-Grid · C=3-Card-Horizontal-Scroll | A (least Big-Bang-Risk, additive zu existing) |
| **Slot-Auswahl** | a=Live-IPO + Live-Score + Trending · b=Live-IPO + Top-Holding-Mover + Trending · c=Multi-Sources priorisiert | a (Phase-3-Live-Pulse-Theme dominant) |
| **Rotation** | x=statisch (alle parallel) · y=Auto-Rotate alle 5s · z=Swipeable | x (least Cognitive-Load Beta) |
| **Mobile (393px)** | m1=Vertical-Stack · m2=Horizontal-Scroll · m3=Swipeable-Pages | m2 (Phase 2 nutzt schon `overflow-x-auto scrollbar-hide` Pattern, Konsistenz) |

**Risk-Note:** Slice 266 ist M-L-Refactor. D63 Section C Lehre: „Multi-File-Big-Bangs sind Risk-Klasse, Slice-für-Slice mit D62". → Inkrementell schneiden (Slice 266a Layout-Refactor + 266b neue Slots).

### Pre-Implementation TODO (vor SPEC v1)

1. Anil's Decision-Set abfragen via D64-Multi-Choice-Format
2. context7 für React-Layout-Patterns (Carousel-State, Swipe-Gesture-Handling) falls Decision z gewählt
3. Read `HomeSpotlight.tsx` voll + alle Konsumenten in `page.tsx`

## Anti-Pattern-Reminder

- **Stale-Status:** Bei „was ist offen?"-Fragen IMMER `git log --oneline -10` + `worklog/active.md` lesen, NICHT aus Memory raten (`feedback_verify_before_claiming_open.md`)
- **Multi-Choice-Spam:** D64 Format nur bei ≥2 offenen CEO-Decisions. Bei klar-enumerierbaren Standards: CTO-Empfehlung autonom + Anil-„weiter"-Greenlight
- **Worktree-Escape-Risk:** Bei Frontend-Agent-Worktree-Spawns IMMER `cd <worktree-path> && git status -s` self-verify (errors-db.md §0)
- **i18n-Object/String-Konflikt:** Bei neuen Sub-Object-Namespaces in messages/{locale}.json prüfen ob gleicher Top-Level-Key bereits als String existiert (errors-frontend.md neuer Eintrag, Slice 263 case study)

## Pre-Push-Hook Erinnerung

Pre-Push-Hook läuft `CI=true pnpm exec vitest run` (~7-15 Min). Nach `git push` mit `run_in_background: true` arbeiten + Monitor-Pattern für Push-Confirm. Slice 263-Push hatte 1 sporadischen Test-Fail (timing-sensitive); 2. Push direkt durchgegangen. Nicht-deterministische Test-Failures = retry, nicht panik.

---

# 📋 Vor-heute Resume-Anker (post-2026-05-01) — Phase 1 Identity-Foundation gestartet, Slice 261 LIVE

**HEAD `3aae52c9` (+ `chore(session-end)` Folge-Commit)** Status: idle.

## Session 2026-05-01 Bilanz — Beta-Day-3 Live + Home-Redesign Phase 1 Start

| Slice | Status | Was |
|---|---|---|
| **268** M | ✅ live (Vortag) + Anil PROVE PASS heute | Cold-Start Cache-Mirror Wallet+Tickets — Mobile-Safari 5-Step-Verify ✓ |
| **261** S | ✅ live (commit `3aae52c9`) | Home Layer 0 Gameweek-Status-Bar — Phase 1 Identity-Foundation startet |

## Heute neu etabliert

**D63 (decisions.md): Home-Ultimate-Redesign-Plan — 5-Phasen-Roadmap**
- Vision: „BeScout-Identität in 5 Sekunden — Manager + Scout parallel above-the-fold"
- ~13 Slices über 5 Phasen (261-273): Identity-Foundation → Action-Layer → Live-Pulse → Discovery → Visual-Polish (Bilder)
- Kontextueller Hero: aktive GW = Manager-Block primär, Off-GW = Scout-Block primär, 0-Holdings = CTA-Block
- Anil-approved 2026-04-30, Phase 1 startet Slice 261

**D64 (decisions.md): Multi-Choice-Decisions Format — Spec-Iteration-Speedup**
- Bei ≥ 2 offenen CEO-Decisions: kompakte Tabelle mit Optionen-Buchstaben + CTO-Empfehlung
- Anil antwortet kompakt z.B. „A=b · B=a · C=ja"
- Empirisch: Slice 261 Spec-Iteration brauchte 3 Decisions, alle in 1 Round-Trip statt 3
- Anwendbar nur bei klar enumerierbaren Decisions, NICHT bei open-ended Strategy

**Slice 261 Lehrstoff (D62 Pay-Off bestätigt):**
- 2 Pre-Review-Iterationen haben mind. 1 BUILD-Revert + 1 Heal-Slice gespart
- Cold-Context-Reviewer fand Spec-Faktenfehler die Author durch Habit-Blindspots übersah:
  - TopBar `z-30` (Author dachte z-40+) → Bar muss non-sticky sein
  - DbEvent hat nur `league_id` (Author dachte `league` String) → Filter-Pattern korrigiert
  - `getTimeUntil` nicht locale-aware → ACs angepasst
  - `eventMapper.ts` schreibt `leagueId` heute NICHT → 1-Zeilen-Patch hinzugefügt
  - HomeStoryHeader `-mx-4 -mt-4` Edge-zu-Edge → Bar mountet INNERHALB Wrapper

**errors-frontend.md neuer Eintrag:** `gold-pulse-bg` ist statischer Gradient, Pulse-Animation braucht zusätzlich `motion-safe:animate-pulse`. Pattern-Source: `HomeSpotlight.tsx:311` (NextEvent-Card kombiniert beide).

## Anil-Action-Items für nächste Session

### Höchste Priorität — Phase 1 fortsetzen
1. **Slice 262 starten** — Hero-Mode-Detection-Hook + Manager-Block-Component (für aktive GW)
   - Spec-Anchor: D63 Hero-State-Matrix (Manager primär bei aktive GW, Scout primär off-GW, CTA bei 0-Holdings)
   - State-Source: `useHomeData()` Derived-Wert `heroMode: 'manager' | 'scout' | 'cta-new'`
   - D62-Pflicht: Reviewer-VOR-BUILD weiterhin Standard
2. **Slice 263 anschließen** — Liga-Rang-Pill + Streak-Risk + Scout-Block-Component (Off-GW)
   - Brauche neuen Service `getLeagueRank(userId, leagueId)` (existiert heute nicht)

### Wenn Phase 1 done
3. **Phase 2 Action-Layer starten** — ActionRequiredStack vor Spotlight (Captain/Lineup/Wildcard)

### Bei neuen Tester-Findings
4. **Friction-Punkte als Healer-Slice triagieren** — root-cause-first (kein Symptom-Reflex), Defense-in-Depth-Pattern

## Bei Resume — Erste-Action-Pfad

```
1. /clear (falls neue Session)
2. Lese diesen Resume-Anker
3. Lese worklog/active.md (status: idle)
4. git log --oneline -5 (Commits dieser Session)
5. Anil-Frage: „Slice 262 starten oder anderes Thema?"
6. Bei „262": SHIP-Loop SPEC mit D63 Hero-State-Matrix + D62 Reviewer-VOR-BUILD
```

# 📋 Vor-heute Resume-Anker (Beta-Day-3 Vormittag, 2026-05-01)

**HEAD `8756b5dd`** post-Sentry-Auto-Resolve-Commit. Status: idle.

## Session 2026-04-30 Abend Bilanz — Beta-Day-3 (5 Slices, 2 Reverts, 2 saubere Erfolge)

| Slice | Status | Was |
|---|---|---|
| **265** P1 | ❌ REVERTED (vorherige Session) | TopBar Wallet+Tickets localStorage-Mirror — broke Page-Render |
| **266** P1 | ❌ REVERTED diese Session | TopProgressBar NProgress-Style — broke Spieltag + Manager. Eigentliche Ursache war NICHT 266 sondern Slice 267 Map-Persist-Bug der parallel manifestierte. |
| **267** P0 EMERGENCY | ✅ live | **Map-Persist-Korruption Heal** — Defense-in-Depth Layer 4 in QueryProvider.tsx (`data instanceof Map/Set` deny) + Defensive Reconstruction in useFixtureDeadlines + Buster-Bump v1→v2-slice267. 9 Services generisch geschützt. |
| **268** M | ✅ live | **Cold-Start Cache-Mirror Wallet+Tickets** (Slice-265-done-right) — UID-keyed localStorage-Mirror mit `placeholderData` (NICHT initialData), `staleTime: 0`, AuthProvider clearCachedAllSlots SYNCHRON neben lsClear. 59/59 Tests grün. **Reviewer-VOR-BUILD-Stage zum ersten Mal architektonisch durchgezogen**. |

## Was heute verstanden wurde

**Slice 266 → Slice 267 → Slice 268 als Lehr-Sequenz:**

1. **Slice 266 wurde fälschlich revertet als Bug-Quelle.** Echter Bug war Slice 267 (Map-Persist) — Manifestation parallel mit Slice 266 hat Verwirrung erzeugt. Ohne Anil's Wut-Trigger ("lös mir endlich dieses fucking Problem") wäre ich auf der Slice-266-Spur geblieben.

2. **Anil's neuer Default-Standard etabliert** (`memory/feedback_root_cause_eifer.md`): root-cause-first, defense-in-depth, user-state-migration mit Buster-Bump, Pattern-Promotion ohne Aufforderung.

3. **Reviewer-VOR-BUILD-Pattern (D62) etabliert.** Bei Re-Doing-Reverted-Slices Reviewer-Agent **VOR** Code prüft die Spec — Slice 268 hatte 3 MINORs gefunden bevor Code geschrieben (15 min Spec-Edit statt 1-2h Code-Rewrite).

## Sentry-Status (post-Session)

**Pre-Slice-268 Issues (Release `909bc9b4`):**
- #11/#12/#13 (n.values is not a function, /manager) — **Auto-Resolved** via Commit `8756b5dd` Annotation. Slice 267 hat die Bug-Klasse generisch gefixt.
- #14 Timeout auf `/` (78 events, 1 user = 3rd Tester `cloud` iPhone iOS 18.5) — Pre-Slice-268. **Sollte stark reduziert** durch Slice 268 placeholderData-Mirror (instant-render statt 10s-Wait). **WATCH:** Ob neue Events post-Slice-268-Deploy entstehen.
- #10/#Z AbortError auf `/`, `/fantasy` — Mobile-Safari SDK-Quirks, `handled: yes` graceful-degraded.

**Sentry-Sample-Rate = 0.01** (1%). Wenn morgen Beta-Tester live sollen, erwägen → 1.0 (100%) bumpen für Beta-Day-3.

## Anil-Action-Items für morgen früh

### Höchste Priorität
1. **Live-Verify Slice 268** (5-Step Mobile-Safari Inkognito Test, siehe Spec Sektion 8):
   - Cold-Start warm-cache → Wallet+Tickets INSTANT (<200ms)?
   - Cold-Start no-cache → 4-9s Skeleton dann normal?
   - User-Switch User-A→User-B → keine Cross-User-Leaks?
   - SIGNED_OUT → bs_wallet_<uid>+bs_tickets_<uid> sofort entfernt?
   - Sentry-Watch 30s → 0 neue Errors?

2. **Wenn 1 PASS:** Pesmerga + 3rd Tester live einladen für Beta-Day-3 Echtzeit-Feedback.

3. **Wenn 1 FAIL:** Sofort Console-Output + Screenshot + Sentry-Issue-ID sammeln (NICHT raten/reverten ohne Beweis — Slice-265+266-Lehre).

### Optional
4. **Sentry-Sample-Rate 0.01 → 1.0** in Vercel Env-Vars für Beta-Day-3 (mehr Visibility bei echten Tester-Sessions).
5. **Issues #11/#12/#13 in Sentry-UI checken** — Sentry-Webhook sollte sie nach `8756b5dd` Deploy als resolved markieren. Wenn nicht: Issue-Status manuell setzen (3 Klicks).

## Bei Resume morgen — Erste-Action-Pfad

```
1. /clear (falls neue Session)
2. Lese diesen Resume-Anker
3. Lese worklog/active.md (status: idle)
4. git log --oneline -10 (heute 9 commits + 8756b5dd Sentry-Auto-Resolve)
5. Anil-Frage: "Hast du Slice 268 Live-Verify gemacht? PASS oder FAIL?"
6a. Bei PASS: Beta-Day-3 Tester live, Sentry-Sample-Rate-Bump erwägen, Real-Time-Feedback sammeln
6b. Bei FAIL: Console+Sentry Beweis sammeln, root-cause-first triage (NICHT Slice 268 reverten ohne Diagnose)
```

# 📚 Lessons Learned aus Session 2026-04-30 Abend (für patterns.md / errors-frontend.md candidates — bereits drin)

## Pattern #45 (patterns.md): Cold-Start UID-keyed Cache-Mirror
- Helper-Module + Hook-Augmentation + AuthProvider-Sync (3-Layer)
- placeholderData (NICHT initialData!) für Money-Path-Schutz
- UID-keyed Slots gegen Cross-User-Pollution

## Decision D62 (decisions.md): Reviewer-VOR-BUILD bei Re-Doing-Reverted-Slices
- Empirisch: 100% Hit-Rate bei Slice 268 (3 MINORs gefunden)
- Stage-Chain: SPEC → IMPACT → REVIEWER-VOR-BUILD → BUILD → REVIEWER-POST-BUILD → PROVE → LOG

## errors-frontend.md neu: TanStack v5 initialData vs placeholderData Decision-Tree
- `initialData` markiert als data persistiert, dataUpdatedAt = Date.now() → Money-Path-Risk
- `placeholderData` rendert UI ohne data zu persistieren, dataUpdatedAt = 0 → Money-Path geschützt

## errors-frontend.md (Slice 267): Map/Set-typed React-Query-Data + Persist/SSR
- Service-Layer NIEMALS Map direkt returnen wenn Persist/SSR involviert
- Defense-in-Depth Layer 4 in QueryProvider als generischer Schutz

---

# 📋 Vor-heute Resume-Anker (Beta-Day-2 Abend, 2026-04-30 vor dieser Session)

**Anil-Direktive Session-Ende 2026-04-30:** "passt, wir setzen morgen bei b an!" — bezieht sich auf **Option B** aus der Audit-Empfehlung: **architektonischer Provider-Cascade-Refactor** (Smoking-Gun #3 ECHTER Fix).

## Bei `/clear` morgen früh — lese in dieser Reihenfolge

1. `worklog/active.md` — `status: idle`, HEAD `f4dbcd33`
2. Diese Datei (Resume-Anker oben + System-Audit-Sektion unten)
3. `git log --since="2026-04-30 00:00" --oneline` (16 commits heute, davon 2 reverts)
4. `worklog/log.md` Top 6 Einträge (259→264, je full Stage-Chain)
5. **Bug-Liste** (Sektion unten "Anil-gemeldete Symptome heute")

## Was heute passiert ist (Beta-Day-2, 6 Slices + 1 Revert)

| Slice | Status | Was |
|---|---|---|
| **259** P0 EMERGENCY | ✅ live | SW Cache-Pollution Heal — Smoking-Gun #1 (1899 stale → 0 verifiziert) |
| **260** P1 | ✅ live | Auth-Hydrate Hardening — Smoking-Gun #5 + #7 (sessionStorage→localStorage + idle-callback) |
| **261** P2 | ✅ live | TanStack Persist-Cache — Smoking-Gun #6 (3-Layer-Defense Allowlist) |
| **262** P3 | ✅ live | Middleware Public-Route-Bail-Out — Smoking-Gun #4 |
| **263** P0 | ✅ live | loadProfile Mobile-Safari Timeout-Bump (3s→10s, 8s→15s, 5s→12s) |
| **264** P0 | ✅ live | AuthGuard Architektur-Refactor — Smoking-Gun #3 (TEIL-fix) |
| **265** P1 | ❌ REVERTED | TopBar Wallet+Tickets Cold-Start Mirror — broke generelle Page-Render |

## Anil-gemeldete Symptome heute (chronologisch)

1. **Vormittag (vor 259):** "Initial Load funktioniert schrott — jedes Mal Refresh nötig damit App lädt. Nach Refresh OK." → Slice 259 SW-Heal
2. **Nach 259+260 deploy:** "selbes schroot verhalten bei incognito fenster auf safari! 1 alle, 2 muss reload machen mehrmals, 3 skeleton" + Sentry-Console "loadProfile RPC slow Timeout" → Slice 263 Timeout-Bump + Slice 264 AuthGuard-Refactor
3. **Nach 263+264 deploy:** "schon deutlich besser, aber beim kalt start home hat geladen, geld und tickets waren nicht geladen, konnte auch nicht klicken bzw navigieren, musste wieder refreshen, danach ging es"
4. **Nach 265 deploy (BROKE):** "irgendwas ist schief gegangen, die seiten laden nicht mehr die contents, und nach dem ersten start kam Geld und Tickets nicht und ein refresh hat da nichts gebracht" → Slice 265 REVERT

## Verbleibende Bugs (Beta-Day-3 Backlog)

**Symptom #3 (post-264, vor 265-Revert):** Cold-Start zeigt Page sichtbar aber Wallet+Tickets leer + Click-Navigation queued. Wahrscheinliche Ursache: **Mobile-Safari Initial Query-Storm** — viele parallele queries beim Mount, Connection-Pool exhausted, kritische queries (wallet, tickets) hängen in queue. Kann nach 5-15s Refresh nötig.

**Smoking-Gun #3 nur TEIL-gefixed:** Slice 264 hat AuthGuard-Block entfernt, aber **Provider-Cascade selbst** ist noch sequentiell:
```
AuthProvider → loadProfile (10s timeout) → setProfile/setPlatformRole/setClubAdmin (3 setStates)
ClubProvider → wartet auf user → initClubCache + initLeagueCache (parallel) → followedClubs query → activeClub hydration → leagueScopeHydrated cascade
```
Alles **sequentiell statt parallel**.

## 🎯 Option B — Morgen's Plan (Architektur-Refactor)

**Slice 266 P0 — Provider-Cascade Parallelisieren** (~4-6h, Reviewer-Pflicht)

**Konkrete Hypothese was zu fixen ist:**
1. **`(app)/layout.tsx` Mount-Order**: Aktuell `<TourProvider><BackgroundEffects /><SideNav /><TopBar /><AuthGuard>{children}</AuthGuard></TourProvider>`. TopBar+SideNav sind außerhalb AuthGuard und feuern eigene Queries (useWallet, useUserTickets, useFollowedClubs, useNotifications) — alle gegated auf `user?.id`. Beim Mount: AuthProvider lädt user (10s), parallel feuern TopBar/SideNav-Queries sobald user da ist. Auf Mobile-Safari: Connection-Pool-Limit → queue.
2. **Lösungsansatz A:** Stagger queries — kritische zuerst (wallet, holdings, profile), non-kritische in idle-callback (notifications, sponsors, equipment-defs, mystery-box-drop-rates).
3. **Lösungsansatz B:** Server-Component RSC Auth-Hydrate — `get_auth_state` als Server-Action im RootLayout, dehydrate via `<HydrationBoundary>` → Client kriegt Profile sofort, kein 10s wait.
4. **Lösungsansatz C:** Persist-Cache erweitert um wallet+tickets via SAFE Pattern (per-user-keyed mit User-Switch-Detect-Cascade — was Slice 265 versuchte aber broke). Slice-265-Bug muss FIRST diagnosed sein.

**Empfohlener Sub-Plan:**
- **Slice 265 Post-Mortem ZUERST** — was hat Slice 265 BROKEN? Browser-Console-Output von Anil's Test fehlt. Hypothesen:
  - `initialData` + `initialDataUpdatedAt: 0` + `enabled: !!userId` + Key-Wechsel `['wallet', 'no-user']` → `['wallet', uid]` Race
  - lsClear-Loop mit `localStorage.length` während Modifikation (sollte safe sein wegen `keysToRemove`-Array)
  - Konflikt mit Slice 261 persist-cache (wallet ist USER_SCOPED denied)
  - TypeScript-cast `as DbWallet` mit minimal-shape — runtime-OK aber TopBar-consumer könnte NumTick-loop triggern?
- **Slice 266 Fokus:** Cold-Start-UX endgültig. Ansatz B (RSC Auth-Hydrate) ist sauberer als A (Stagger). Aber RootLayout-Touch-Risk wenn Anil parallel Home-Arbeiten macht.

## System-Audit Findings (Open Risiken — defer post-Beta wenn nicht akut)

1. **gcTime 24h** (Slice 261) — Memory-Bloat-Risk Tab-stayer, bis 500MB
2. **localStorage-Bloat** (260+261) — Mobile-Safari ~5MB quota, kein monitor
3. **User-Switch-Detect-Cascade** (260) — queryClient.clear() + persist-clear in 1s window
4. **Provider-Cascade sequentiell** (#3 nur teilgelöst) — Slice 266
5. **Test-Coverage-Gap** — kein Mobile-Safari-Simulation, keine Network-Stress-Tests

## Tech-Side-Status

- **Beta-Phase-Tracker:** Phase D, Anil-Mensch-Action-Block (3 Tester live, Tech-Block weg)
- **Findings_open:** P0=0 (alle gefixt), P1=1 (kalt-start Wallet leer — Slice 266 Backlog), P2=4 (Audit-Findings open), P3=3
- **Vercel:** HEAD `f4dbcd33` Live (post-Revert)
- **Sentry Production:** 0 unresolved letzte 2h post-Revert verifiziert
- **3rd Tester:** `cloud` (f3267e0d-149c) signed up 2026-04-30 08:34 UTC, has profile, signed-in iPhone Safari iOS 18.7

## Bei Resume morgen — Erste-Action-Pfad

```
1. /clear (falls neue Session)
2. Lese diesen Resume-Anker
3. Frage Anil: "Wie war Slice-264-Stand bei euch im Test gestern Abend? Refresh-Bug erledigt? Welche Bugs noch sichtbar?"
4. Slice 265 Post-Mortem (15-30 min):
   a. git show d76007f8 (revert-source) anschauen
   b. Hypothesen mit context7 TanStack-Query v5 verifizieren (initialData+enabled-Race)
   c. Browser-Test in Safari mit Slice-265-Code-temporär-applied → DevTools Console
5. Slice 266 SPEC schreiben: Provider-Cascade Refactor
   - Ansatz wählen (A Stagger | B RSC-Hydrate | C Persist-Mirror-mit-Mitigations)
   - CEO-Approval falls RSC Money-Path-betreffend
6. SPEC → IMPACT → BUILD (Reviewer-Agent VORHER, nicht nachher diesmal!) → PROVE → LOG
```

# 📚 Lessons Learned aus Beta-Day-2 (für Wiki / patterns.md candidate)

## Anti-Pattern: Quick-Fix-Cascade unter Live-User-Druck

**Was passiert ist:** Anil-Bug-Report → Deep-Dive identifiziert 7 Smoking-Guns → 6 Slices in 6 Stunden → Slice 265 broke (1 revert).

**Pattern:** Wenn Live-User auf Production testen und Reports kommen rein, ist der Reflex "schnell fix-forward". Aber: jeder Slice nach #4 hat exponentiell mehr Cross-Cutting-Risk weil vorherige Slices Architekturänderungen sind.

**Lehre für die Zukunft:**
1. **Erste 1-2 Slices** (P0 Emergency): fix-forward OK, akzeptiertes Risk
2. **Slice 3+:** Reviewer-Agent **VORHER** in spec-stage, nicht nach. Plus Live-Verify-on-actual-Mobile.
3. **Slice 5+:** STOP, audit, dann strategic refactor. Nicht weiter quick-fixes.
4. **Live-User ≠ Test-Env:** Sentry-Sample-Rate aufdrehen für Beta. Behavior-Tests mit echtem mobile-emulation.

## Pattern: Slice 265 Live-User-Bug-ohne-Diagnose

**Was passiert ist:** Slice 265 implementiert localStorage-Mirror für wallet/tickets. Tests 49/49 grün. Pushed. Anil testet → "Seiten laden nicht mehr die contents". Revert ohne Diagnose-Daten (kein Console-Output, kein Screenshot, keine Stack-Trace).

**Lehre:** Bei Live-User-Bug-Reports ZUERST Beweise sammeln (Console F12, Screenshot, optional Sentry-Event), DANN revert/fix. Das macht den Bug morgen findbar.

**Konkret morgen:** Slice 265 Code in git show — manuell durchsehen, hypothesen-getestet auf Test-Page deployen (NICHT Production), Console-Output capturen, dann gezielt fix.

---

# 📋 Vor-Heute Resume-Anker (Beta-Day-1, 2026-04-29 abends)

**HEAD `42badf34`** post-Slice-260 Live-Verify-Push. Status: idle.

**Bei `/clear` morgen früh — lese in dieser Reihenfolge:**
1. `worklog/active.md` — `status: idle`
2. Diese Datei (Resume-Anker oben + Day-2 Summary unten)
3. `git log --oneline -8` (heute 5 commits)
4. `worklog/log.md` Top 2 Einträge (260, 259)

## Was heute passiert ist (Beta-Day-2)

| Zeit | HEAD | Slice | Was |
|---|---|---|---|
| Vormittag | `d4583303` + `c3305fd4` | **259 P0 EMERGENCY** | Anil-Report "Initial Load funktioniert schrott — Refresh nötig". Deep-Dive identifizierte SW Supabase-REST stale-while-revalidate-Cache als Smoking-Gun #1 (URL-keyed ohne JWT → cross-auth-pollution). Fix subtraktiv: REST-Cache raus, CACHE_NAME v3→v4, catch-all-filter. Live-Verify gegen bescout.net: **1899 stale Supabase-REST-Responses → 0**. |
| Nachmittag | `5412ac43` + `30ec7dd9` + `42badf34` | **260 P1** | Auth-Hydrate Hardening (Smoking-Gun #5 + #7). AuthProvider+ClubProvider sessionStorage→localStorage (cross-tab warm cache). User-Switch-Detect-Block (Cross-User-Pollution-Schutz mit Sentry-Breadcrumb). Welcome-Bonus + ActivityLog in `requestIdleCallback`. Provider-Tests 25/25, Reviewer PASS. Live-Verify: AuthProvider-Chunk + Layout-Chunk haben Slice-260-Markers in deployed JS. |

## Tester-State Update

| Tester | Wallet | Status |
|---|---|---|
| **Anil** | 2M CR ✓ | Bekommt 1-time PWA-Update-Event next visit (skipWaiting + clients.claim für SW v4 + lsClear-falls-nötig). Danach permanent stabilisiert. |
| **Pesmerga** | 2M CR ✓ | Same — 1-time-update next visit. Plus: display_name + favorite_club via Settings nachholen. |
| **3rd Tester** | TBD | Frischer Account → baseline-clean experience direkt mit SW v4 + saubere localStorage. Bei Signup: 2M CR via SQL-Template (siehe unten). |

## Action-Items für morgen

### Höchste Priorität
1. **3rd Tester signup checken** — falls heute angekommen, 2M CR via SQL geben (Template unten)
2. **Live-Behavior Anil + Pesmerga** — Refresh-Bug weg? Sentry quiet?
3. **Sentry-Health-Watch** — heute 0 unresolved errors letzte 2h verifiziert post-Deploy

### Open Backlog (post-Beta nicht heute)
4. **Slice 261 P2** — TanStack `persistQueryClient` mit localStorage + Server-Component RSC `get_auth_state` Auth-Hydrate. RootLayout-Touch → Beta-Day-3-Risk zu hoch ohne 24h Soak von Slice 259/260 zuerst.
5. **Slice 262 P3** — Middleware Public-Route-Bail-Out + Admin-Checks aus Middleware in RSC-Layout. Edge-Function-Test-Aufwand, post-Beta.
6. **Pattern-Promotion in errors-frontend.md** — die 3 patterns.md-Einträge (#40 SW-Cache-Strategie, #41 Cross-Tab-Cache, #42 idle-callback) könnten optional auch als errors-frontend.md/errors-pwa.md Detection-Patterns crossfiled werden. Optional cleanup.

### Optional Cleanup (Day-2-Reste)
7. **handle_new_user_wallet() Function** ist orphan im Schema seit Slice 258 v2 (von gestern). Cleanup-Slice optional.

## SQL-Template: 3rd Tester 2M CR (für morgen)

```sql
-- Replace <UID> mit der auth.users.id des 3rd Testers (find via email):
SELECT id FROM auth.users WHERE email = '<email>';

-- Dann atomic UPDATE + transactions:
BEGIN;
UPDATE wallets SET balance = 200000000 WHERE user_id = '<UID>';
INSERT INTO transactions (user_id, type, amount, description, balance_after)
VALUES ('<UID>', 'admin_adjustment', 200000000 - <current_balance>,
        'Beta-Tester Initial-Balance 2M CR (Anil-Direktive 2026-04-29)', 200000000);
COMMIT;
```

## Kritische Befunde Beta-Day-2 für Knowledge

**Bug-Klasse-Pattern:**
> **Service Worker Cache muss JWT-aware sein oder authenticated-Endpoints überhaupt nicht cachen** (Slice 259):
> Cache-API keyed by URL only. Cachen authenticated Endpoints (Supabase REST) → cross-auth-pollution + stale-on-first-load + cross-user-leak-Risiko. Symptom-Decoder: User-Report "Refresh fixt App-Load" → SW serviert stale Anon-Response → background-fetch füllt Cache → 2. Load fresh.

**Promoted in:** memory/patterns.md #40, #41, #42 + memory/decisions.md D61.

## Tech-Side-Status post-Day-2 Beta

- **Beta-Phase-Tracker:** Phase D, last_signoff: FAIL (Anil-Mensch-Action-Block, NICHT Tech)
- **Findings_open:** P0=0 (Slice 259 closed), P1=0 (Slice 260 closed), P2=0, P3=0
- **Vercel:** 5 commits live in main (`d4583303 c3305fd4 5412ac43 30ec7dd9 42badf34`)
- **Sentry Production:** 0 unresolved last 2h post-Deploy verified ✓
- **Cron-Health:** All 7 Ligen healthy
- **Audit-Pipeline:** 10 Tools daily nightly-audit
- **Knowledge:** patterns.md +3 (#40/41/42) + decisions.md D61

## Bei Resume morgen — Erste-Action-Pfad

```
1. /clear (falls neue Session)
2. Lese diesen Resume-Anker
3. Frage Anil: "Hat sich Refresh-Bug erledigt? Beta-Tester aktiv?"
4. Optional Slice 261 P2 starten (TanStack persist) NUR wenn 24h Soak von 259/260 ohne Sentry-Drift
5. Sonst: Beta-Tester-Watch-Mode + Reactive auf Anil-Direktive
```

---

# Vor-Heute Resume-Anker (Beta-Day-1, 2026-04-29 abends)

> Dieser Block dokumentiert was gestern Abend für heute geplant war — heute durchgeführt mit Slice 259+260.

**HEAD `37c78d28`** post-Slice-258 EMERGENCY-Fix. Status: idle.

**Bei `/clear` morgen früh — lese in dieser Reihenfolge:**
1. `worklog/active.md` — `status: idle`
2. Diese Datei (Resume-Anker oben)
3. `git log --oneline -8` (heute 11 Commits)
4. `worklog/log.md` Top 4 Einträge (256, 257, 258 + Pre-256-Stand)

## Was heute passiert ist (3 Slices in 1 Tag)

| Zeit | HEAD | Slice | Was |
|---|---|---|---|
| Vormittag | `a73b0e1a` | **256** | StalePipelineBanner Cron-Health UI-Sentinel — User-facing Detection-Communication. 3-Layer (Service+Hook+Banner) auf /fantasy + /market. 12 Tests. Pattern-Wiederholung MissionBanner Slice 161. |
| Mittag | `39d561ff` | **257** | Hardening-Bundle — F-4 nightly-audit cron-health in aggregate + F-8 rotate-secret escapeRegex + D60-Hook ship-verify-completeness-gate.sh. Schließt Slice-256-Backlog. |
| Abend | `37c78d28` | **258 EMERGENCY P0** | Signup-Bug 13-Tage-latent gefixt. Pesmerga signup blockiert mit FK-Violation 23503 (wallets→profiles). Root: Slice 002 fügte FK ohne Baseline-Trigger-Drop. v1 Auto-Profile-Trigger → v2 Heal (Drop für Wizard-Restore). |

## Tester-State (für morgen wichtig)

| Tester | Email | Profile-ID | Wallet | Onboarding | Notes |
|---|---|---|---|---|---|
| **Anil** | kemal_demirtas@gmx.de | `557d1145-3397-465e-8ea0-e2c602c0de6b` | **2M CR** ✓ | Done (alter Account seit Feb) | Voller Funktions-Tester |
| **Pesmerga** | pesmerga@gmx.de | `ef2257c0-700e-4148-8d33-c7d1f2264d78` | **2M CR** ✓ | **SKIPPED** (durch v1-Trigger Profile auto-erstellt mit handle=`user_ef2257c0`) | display_name=NULL, favorite_club=NULL — soll via Settings nachholen. Anil-Decision Option A: belassen, kein Wizard-Re-Run. |
| **3rd Tester** | (TBD) | — | — | Wartet auf Signup | Wizard läuft post-v2 KORREKT — bei seiner Anmeldung 2M CR per admin_adjustment-tx aufladen. |

## Action-Items für morgen

### Höchste Priorität
1. **3rd Tester signup checken** — sobald angemeldet: 2M CR via SQL geben (Template unten)
2. **Live-Behavior von Anil + Pesmerga checken** — sind Bugs aufgetaucht? Sentry quiet?
3. **Pesmerga reminder** — Settings → display_name + favorite_club ergänzen

### Open Backlog (aus Slice 257 LOG)
4. **Live-Verify Slice 256 StalePipelineBanner** — Mock-Drift via Supabase-MCP (UPDATE leagues SET active_gameweek = X WHERE id = '<TFF1>'), Banner sichtbar prüfen, Dismiss-Persistence cross-Page
5. **Reviewer-254-P2#1** — Optional Slice 258 wenn Anil das UX-Trade-Off (Manual-GW-Override-per-Liga-Memory) anders haben will

### Optional Cleanup
6. **handle_new_user_wallet() Function** ist orphan im Schema seit Slice 258 v2. Cleanup-Slice optional post-Beta (kein Effekt, nicht eilig).

## SQL-Template: 3rd Tester 2M CR (für morgen)

```sql
-- Replace <UID> mit der auth.users.id des 3rd Testers (find via email):
SELECT id FROM auth.users WHERE email = '<email>';

-- Dann atomic UPDATE + transactions:
BEGIN;
UPDATE wallets SET balance = 200000000 WHERE user_id = '<UID>';
INSERT INTO transactions (user_id, type, amount, description, balance_after)
VALUES ('<UID>', 'admin_adjustment', 200000000 - <current_balance>,
        'Beta-Tester Initial-Balance 2M CR (Anil-Direktive 2026-04-29)', 200000000);
COMMIT;
```

## Kritische Befunde für Knowledge

**Bug-Klasse-Pattern (errors-db.md Kandidat):**
> "FK-Add ohne Baseline-Trigger-Drop" — Slice 002 fügte wallets→profiles FK hinzu (2026-04-16) aber ließ Supabase-Baseline-Default-Trigger `on_auth_user_created_wallet` aktiv. Trigger inserted Wallet aus auth.users → FK requires profile first → 23503 Signup-500. Latent 13 Tage weil 0 echte Real-Signups in dem Zeitraum (alle 124 existing profiles vor 2026-04-16). Erste Real-User-Signup-Versuche heute deckten Bug auf.

**Lehre:** Bei FK-Adds auf zentralen User-Tables (wallets, profiles, holdings) MUSS man pre-existing Baseline-Trigger checken die Insertion-Order erzwingen. Audit-Command:
```sql
SELECT t.tgname, pg_get_triggerdef(t.oid) FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public', 'auth') AND NOT t.tgisinternal
  AND c.relname IN ('users', '<targeted_table>');
```

Pattern-Promotion-Backlog (für Slice 259 oder spätere autodream-Konsolidierung):
- common-errors.md "Silent Latent Bugs after FK-Add" Section
- errors-db.md "Baseline-Trigger Drop Pflicht bei FK-Constraints"

## Tech-Side-Status post-Day-1 Beta

- **Beta-Phase-Tracker:** Phase D, last_signoff: FAIL (war Anil-Action-Block, jetzt aktiv durchläuft)
- **Findings_open:** P0=0 (Slice 258 closed), P1=0, P2=0 (Live-Verify 256 backlog), P3=0
- **Vercel:** Latest deploy `dpl_84Ktd6...` (HEAD 3b87c5c7 = Slice 257). Slice 258 ist DB-only, kein Vercel-Deploy nötig.
- **Sentry Production:** 0 unresolved last 24h (vor Beta-Empfang gemessen).
- **Cron-Health:** All 7 Ligen healthy. StalePipelineBanner silent für Tester.
- **Audit-Pipeline:** 10 Tools daily nightly-audit (cron-health jetzt mit explicitem Auto-Issue-Title via Slice 257 F-4).

## Bei Resume morgen — Erste-Action-Pfad

```
1. /clear (falls neue Session)
2. Lese diesen Resume-Anker
3. Frage Anil: "Hat sich der 3. Tester registriert?"
4a. Wenn JA: SQL-Template oben → 2M CR aufladen → bestätigen
4b. Wenn NEIN: warten auf Signal
5. Frage Anil: "Sentry/Sessions checken oder direkt zu nächstem Slice?"
6. Optional: Live-Verify 256 (Mock-Drift) ODER neuer Slice 259 (Pattern-Promotion + Cleanup-orphan-function)
```

## Knowledge-Status

**Decisions** (memory/decisions.md):
- D58 Wave-Bridge-Cleanup-Pflicht (Slice 251)
- D59 BeScout-Character-Spec, kein FPL-Klon (Slice 253)
- D60 Wave-Verify-Re-Switch-Pflicht (Slice 255)
- (Optional D61 Kandidat morgen: "FK-Add ohne Baseline-Trigger-Drop" Bug-Klasse → memory/decisions.md PROCESS oder common-errors.md)

**Patterns** (errors-frontend.md neu seit Session 2026-04-29):
- "Liga/Context-Switch State-Reset via prevRef" (Slice 254)
- "Cache-Invalidation: Root-Prefix vs enumerated Keys" (Slice 254)
- "Filter-as-audience-choice vs Filter-as-result-filter" (Slice 254)

**Hooks**:
- 35 hooks insgesamt (war 34 vor heute)
- NEU heute: `ship-verify-completeness-gate.sh` (Slice 257 D60-Implementation)

---

# Vor-Heute Resume-Anker (Slice 256-Backlog) — gestern abend nicht mehr aktuell

**Bei `/clear`:** Lese in dieser Reihenfolge:
1. `worklog/active.md` — `status: idle`, HEAD `d4c1c0a9`
2. Diese Datei (Top-Block + Slice-256-Backlog unten)
3. `git log --oneline -10` (8 commits diese Session)
4. `worklog/log.md` Top 4 Einträge (255 / 254 / 253 / 252)
5. `memory/decisions.md` D59 + D60 (NEU diese Session)
6. `worklog/reviews/255-review.md` (Slice 256 Backlog-Items)

## Was diese Session erreicht hat (chronologisch, ~6 Stunden)

| Phase | HEAD | Slice | Was |
|---|---|---|---|
| Vormittag | `b8179270` | **252 PR #36 MERGED** | Wave 6 Cleanup — legacy Liga-State entfernt (fantasyStore + marketStore + managerStore + LEAGUE_FALLBACK) |
| Vormittag | `78516af1` | Smoke-fix | Step-4 Tab-Fallback + 25s Buffer (Issue #25 Master-Tracker closed) |
| Mittag | `d2326606` | **253** | Money-Path-CEO-Decisions WONT-FIX — D59 PRODUCT-Decision "BeScout-Character-Spezifikation, kein FPL-Klon" |
| Nachmittag | `e5c03e56` + `36679510` | **254 v1+v2** | Fantasy-Deep-Dive 5-Layer-Kaskade + 3 Frontend-Heals (useGameweek + leagueScopeStore + FantasyContent) + v2-Heal Init-Effect entfernt nach Live-Verify Re-Switch-Bug |
| Nachmittag | `0451690b` | 254 LOG | 3 Pattern-Promotions in errors-frontend.md |
| Spätnachmittag | (operations) | Cron-Reanimation | Anil rotated Service-Role-Key (3-Iter-Drama wegen `\n`-suffix-Drift), Vercel auf Pro-Plan, gameweek-sync via curl: 37s Run, alle 7 Ligen advanced (TFF1 28→38 Saison-End, BL/SL/BL2 30→32, SA 33→35, LL 32→33) |
| Abend | `d4c1c0a9` | **255** | Workflow-Hardening 4-Layer-Architektur (Detection / Operations / Process / Test-Infra) |

## Slice 256 Backlog (Anil-Direktive: nahtlos weitermachen)

Aus `worklog/reviews/255-review.md` Reviewer-Findings + Slice 255 Defered-Item:

| Pri | Item | Source |
|---|---|---|
| **P2** | **StalePipelineBanner UI-Sentinel** auf /fantasy + /market — client-side Hook + RPC für Drift-Detection mit anon-key. Komplexität >30min, in Slice 255 defered. | Slice 255 Item 5 (defered) |
| **P2** | **F-4 cron_health in aggregate-Detection-Step** — `nightly-audit.yml:215-234` aggregate-Step erweitern damit Auto-Issue-Title `cron-health` explizit nennt (statt im "new audit-report files"-Noise verschluckt). | Reviewer 255 F-4 |
| **P3** | **F-8 keyName-Regex-Escape** in `rotate-secret.ts:55` — `key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')` vor RegExp-Construction. Defensive Code-Hygiene. | Reviewer 255 F-8 |
| **P3** | **D60 Hook-Implementation** `ship-verify-completeness-gate.sh` — warnt wenn `worklog/proofs/<slice>-postdeploy-verify.md` für State-Switch-Slice nicht alle 3 Phasen (fresh / forward / re-switch) dokumentiert. | D60 Re-Visit-Trigger |
| **P3** | **Reviewer 254 P2 #1 Manual-GW-Override-Concern** — User picks GW=15 in BL → Liga-Switch zu TR überschreibt manuelle Wahl. Bewusste UX-Trade-Off, aber: bei Liga-Switch B→A zurück gibt es kein "remember". Optional second useRef für tracking ob `selectedGameweek` von User manuell ODER auto gesetzt wurde. | Reviewer 254 P2 #1 |
| Future | **`scripts/cron-health-check.ts` Severity-Tuning** post-Beta — wenn Beta 5+ Wochen läuft ohne False-Positives, drift>=2 von HIGH auf MEDIUM downgraden. | D52 Iteration |

## Bei /clear Resume-Pfad

```
1. worklog/active.md → status: idle, HEAD d4c1c0a9
2. Diese Datei → Resume-Anker oben + Slice-256-Backlog
3. git log --oneline -10 (Session-Commits)
4. worklog/reviews/255-review.md (Reviewer-Concerns für Slice 256)
5. /ship new "Slice 256 Cron-Health-UI-Sentinel + Reviewer-Followups"
   ODER pick einzeln je nach Lust:
   - StalePipelineBanner (UI-fokus, ~1-2h)
   - F-4 nightly-audit aggregate (Process-fokus, 15min)
   - F-8 + D60-Hook (Hardening-Bundle, 30min)
```

## Tech-Side-Status post-Slice-255

**Beta-Phase-Tracker `worklog/beta-phase.md`:**
- phase: D
- last_signoff: FAIL (Anil-Mensch-Action-Block, NICHT Tech)
- findings_open: P0=0, P1=0, P2=0, P3=0
- ceo_pending: 0 (Slice 253 D59 alle WONT-FIX)
- wont_fix: 6 (FM-RR-1, BRAND-NEU-1, FM-NEU-5, FANTASY-NEU-1, F-09 BPS, UX-20 Membership)

**Audit-Pipeline (10 Tools):**
- silent-fail, stale, orphan, type-truth, mutation-race, i18n, compliance, wiring, **cron-health (NEU Slice 255)**, rpc-security
- Daily 03:00/04:00 UTC im nightly-audit.yml

**Pre-Push-Hook entblockt** post-Slice-255 — integrationGlobs erweitert um 6 Service-Test-Files die Live-Supabase brauchen (heute 22-Test-Fail-Episode).

**4-Layer-Workflow-Hardening live:**
1. **Detection:** audit:cron-health daily
2. **Operations:** pnpm rotate-secret atomic-sync
3. **Process:** D60 Re-Switch-Pflicht
4. **Test-Infra:** integrationGlobs

**Money-Path:** alle 3 ceo_pending → wont_fix per D59 (BeScout ist nicht FPL-Klon).

## Anil-Mensch-Action (einziger Beta-READY-Blocker)

- 3 Beta-Tester organisieren (Templates fertig in `memory/beta-tester-recruitment-templates.md`)
- TR-Native-Reviewer organisieren
- `memory/beta-tester-list.md` schreiben (.gitignore-Pflicht)

---

## Session 2026-04-29 12:00-14:50 UTC — Wave 3 Live-Verify ALL-PASS + Slice 252 Wave 6 PR #36

**Stand 2026-04-29 14:50 UTC:** Wave 3 Live-Verify komplett, Wave 6 Cleanup-PR offen.

### Was diese Session ablief
1. Routine `wave-3-live-verify` (trig_01GpLLssvCemqUQCbEkLa5KC) feuerte 00:36 UTC, lief 9 min, ended `run_once_fired` — **hat aber kein Output persistiert** (kein Verify-File, kein PR, kein Issue mit `wave-3-postdeploy-fail`-Label). Re-Trigger via `RemoteTrigger run` API zeigte Trigger-Config unverändert.
2. **Manual Live-Verify durch Primary-Claude** via Playwright MCP + Supabase MCP gegen `bescout.net` (HEAD `e1d17f94`). Alle 7 V-Steps PASS. Report `worklog/proofs/251-wave-3-postdeploy-verify.md` + 2 Mobile-Screenshots committed in `7264dc25`.
3. **Slice 252 Wave 6 Cleanup** (chore, post-Verify-Action laut Routine-Briefing): Branch `slice/251-wave-6-cleanup` mit 8 Files (+17/-99). PR #36 offen.

### Verify-Results (alle PASS)
- **V-1** Cascade Stage 1: TFF1 set per favorite_club, no Hydration-Mismatch
- **V-2** Atomic Liga-Switch: BL→TFF1→BL atomar, Network-Refetch je Switch
- **V-3** Async-Liga-Cycle: BL=GW30, TFF1=GW28 (natürliche DB-Daten), kein MIN-Aggregation-Drift
- **V-4** Mobile 393px: 6 Country-Pills, min-h 44px, kein viewport overflow
- **V-5** Cross-Page-Persistence: localStorage v1 hält über /market /fantasy /clubs /rankings
- **V-6** anon→login Edge: Cascade-Caller R-02 setzt Liga sofort post-Login
- **V-7** Single-League-Auto-Select: ES → La Liga atomar applied

### Slice 252 Wave 6 PR #36 — was er deletet
- `fantasyStore.fantasyCountry/.fantasyLeague` + Setter
- `marketStore.selectedCountry/.selectedLeague` + Setter (clubVerkaufLeague KEEPS)
- `managerStore.kaderCountry/.kaderLeague` + Setter
- `SpieltagTab.tsx`: LEAGUE_FALLBACK + availableLeagues/selectedLeagueId/activeLeague/hasMultipleLeagues + dead Liga-Selector-Button + ADMIN-Row-Restructure
- `SpieltagTab.test.tsx`: "TFF 1. Lig" Badge-Test entfernt
- `leagueScopeStore.ts` JSDoc: References zu deleted Symbols neu formuliert

### tsc + vitest (alle grün)
- `npx tsc --noEmit` clean
- `CI=true pnpm exec vitest run` 3084/3084 + 1 skip + 13 todo
- Pre-commit-Hooks (audit:type-truth/stale/wiring): GREEN
- Pre-push-Hook (full vitest 4:25 min): GREEN

### Anil-Action-Items
1. **PR #36 reviewen + mergen:** https://github.com/Djembo31/beScout-App/pull/36 — saubere chore-Commit, alle Tests grün
2. **Post-Merge:** Smoke gegen bescout.net (Issue #25 Master-Tracker-Klasse separat)
3. **Routine-Reliability untersuchen:** `wave-3-live-verify` hat output-loss, vor zukünftigen Routine-Trigger-Designs CTO-Backlog für Diagnose

### CTO-Backlog post-Slice-252
- **Routine-Output-Loss Investigation:** warum `wave-3-live-verify` (Run #1 + Run #2 retrigger) keinen Push/PR/Issue hinterließ — vermutlich kein Push-Permission oder mid-execution-Abbruch ohne Output. Wichtig für zukünftige Auto-Verify-Routines.
- **Backlog vom Wave 3 Live-Verify Bonus-Findings:**
  1. AuthProvider-Slow-Warning post-Login (pre-existing, kein Wave-3-Bug)
  2. /fantasy `eventCountries` filtert dynamisch — UX-Counterintuitiv für End-User wenn Liga-Scope = TFF1 (DE-Bundesliga unsichtbar). Backlog UX-NEU für Wave 4+.

### Bei `/clear` — Resume-Pfad
1. `worklog/active.md` (idle, **HEAD nach Stash-Drop noch sauber**)
2. `git log --oneline -5` zeigt: 7264dc25 (Verify-Proofs) + 2886d69a (Stop-Hook chore) + e1d17f94 (D58) + ...
3. `gh pr view 36` für Slice 252 Status
4. Wenn Anil "merge PR 36" sagt: `gh pr merge 36 --squash --auto` ODER manuell mit `gh pr merge 36 --squash`
5. Nach Merge: localStorage `bescout-league-scope-v1` muss live weiter funktionieren (es ist nur DELETE von toten Stores, keine Behavior-Changes)

---

## Slice 251 Spieltag Liga-Scope-Reform — Wave 3 LIVE (Session-Ende 2026-04-29 ~01:36)

**Stand:** Wave 1 + Wave 2 + Wave 3 alle LIVE in main. HEAD `5cb28200`. Manual-Verify post-Deploy ist scheduled in **1 Stunde** als remote-agent.

### Wave 3 Track C — was steht

- **Commits (4):** `687bcb91` feat (Track C 18 files +1742/-152) → `55f52417` chore (PROVE+LOG) → `66842611` fix (ClubProvider Test-Mock-Heal) → `5cb28200` fix (INV-25 WHITELIST drift Wave-2-Track-F-Debt)
- **NEU:** `src/features/shared/store/leagueScopeStore.ts` (209 lines, 17 Tests, versioned localStorage `bescout-league-scope-v1` + 3-Stage Cascade + Smart-Collapse + 5-Key Cache-Invalidate + EC-03 silent-reset) + `src/components/layout/LeagueScopeHeader.tsx` (103 lines, 5 Tests, Sticky/non-sticky-Wrapper)
- **MIGRATE 8 Konsumenten:** FantasyContent + MarktplatzTab + ClubVerkaufSection + KaderTab + rankings/page + clubs/page (6 Briefing) + TransferListSection + TrendingSection (2 D54-driven)
- **R-02 Heal:** ClubProvider.tsx +39 (Cascade-Caller useEffect mit 4 Guards + 9 deps)
- **F-01/F-02 Heal post-Reviewer-REWORK:** useGameweek-Bridge `activeClub?.league_id` → `useLeagueScope(s => s.leagueId)` + dashboardStats `events.filter` → `filteredGwEvents.filter`
- **Tests:** 22/22 store+header grün lokal; CI nach INV-25-Fix grün
- **Wave-2-Drift-Audit:** Worktree-Base 4cef6b95 (vor Wave 2). Rebase auf main HEAD f867cd44 sauber (1 active.md-Konflikt + 1 Bonus-Edit SpieltagTab leagueId-prop von activeClub-bridge auf leagueScopeId)

### Spec/Impact/Review/Proof

- **Spec:** `worklog/specs/251-spieltag-liga-scope-reform.md`
- **Impact:** `worklog/impact/251-store-consumers.md` (Annex 2026-04-29: 6 REPLACE + 2 CREATE D54 + 4 DELETE Wave 6 + Datentyp-Brücke leagueId/leagueName/countryCode)
- **Pre-Review-Memo:** `worklog/reviews/251-wave-3-pre-review.md` (frontend-Agent Self-Audit)
- **Review:** `worklog/reviews/251-wave-3-review.md` (cold-context reviewer-Agent: REWORK → PASS post-Heal F-01+F-02; Race-Condition-Audit + Wave-2-Drift-Audit + 7 Manual-Verify-Pflichten post-Deploy)
- **Proof:** `worklog/proofs/251-wave-3-track-c.txt`
- **Journal:** `memory/episodisch/journals/251-wave3-track-c-leaguescope-journal.md`

### DISTILL — neue Decision (D58)

`memory/decisions.md` D58: **Wave-Bridge-Cleanup-Pflicht in Multi-Wave-Slices** — bei Multi-Wave-L-Slices wo eine Wave Bridge-Code via Hook/Prop einführt, MUSS die nachfolgende Wave (die den finalen Mechanismus implementiert) den Bridge-Code aktiv ersetzen. Spec-Sektion 1.4 Migration-Map muss „Wave-X-Bridge?"-Spalte enthalten. Pre-Review-Memo muss „Migration-Surface beyond Konsumenten"-Sektion enthalten. Pattern-Familie D43→D46→D54→D58 („Existenz ≠ Verwendung", jetzt mit Time-Axis innerhalb Multi-Wave-Slice).

### Routine: wave-3-live-verify (in 1h)

Remote agent geschedult als one-shot, fires `2026-04-29T00:36:00Z` (~02:36 Berlin):
- **ID:** `trig_01GpLLssvCemqUQCbEkLa5KC`
- **URL:** https://claude.ai/code/routines/trig_01GpLLssvCemqUQCbEkLa5KC
- **Aufgabe:** 7 Manual-Verify-Steps (V-1 Cascade-Stage-1, V-2 atomar Liga-Switch, V-3 async-Cycle BL=10/TFF1=8, V-4 Mobile 393px, V-5 Cross-Page-Persistence, V-6 anon→login Edge, V-7 single-league-auto-select) gegen bescout.net mit jarvis-qa-Login
- **Output:** strukturierter Report `worklog/proofs/251-wave-3-postdeploy-verify.md`
- **Branching:**
  - All-PASS (oder PASS+SKIP-V-3) → automatisch Wave-6-Cleanup-PR draften (delete fantasyStore.fantasyCountry/fantasyLeague + marketStore.selected* + managerStore.kader* + LEAGUE_FALLBACK)
  - 1+ FAIL → GH-Issue mit `wave-3-postdeploy-fail` Label öffnen

### Bei `/clear` — Resume-Pfad

1. `worklog/active.md` (idle, **5cb28200** HEAD) — Wave 3 KOMPLETT-Block oben
2. `worklog/log.md` Top-Eintrag (251 Wave 3) + Slice 251 Wave 1+2-Einträge
3. `memory/decisions.md` D58 (Wave-Bridge-Cleanup-Pflicht — Pattern-Familie D43/D46/D54/D58)
4. Diese Datei (Resume-Anker)
5. Routine-Status checken: `RemoteTrigger get trig_01GpLLssvCemqUQCbEkLa5KC` ODER ggf. `worklog/proofs/251-wave-3-postdeploy-verify.md` (falls Routine schon gelaufen)
6. Falls Routine PASS: Wave-6-Cleanup-PR-Draft reviewen + mergen
7. Falls Routine FAIL: GH-Issue triagieren, ggf. Slice 252+ Heal-Wave

### Backlog post-Wave-3 (CTO-Tracking)

- **i18n-Migration `errors.rpcNoResponse`:** Wave-2-Track-F-Debt aus INV-25-Heal — `rpc_no_response` als KNOWN_KEYS + DE/TR i18n-Key, dann WHITELIST-Eintrag entfernen.
- **Wave 4 Track D + E:** SpieltagTab-Reform (LEAGUE_FALLBACK weg + selectedLeagueId-State weg + Sponsor-Match-Topspiel-Logic) + SaisonRangTab als 5. Fantasy-Tab.
- **Wave 5 Track G:** PlayerPicker UX-Filter (CEO-Decision Variante B lenient mit Warning-Pill).
- **Wave 6 Cleanup:** in der Routine in 1h auto-gedrafted falls Wave 3 PASS.
- **F-03 Hydration-Mismatch monitor:** falls Anil oder Routine in Console mismatch-Warnings sieht → Zustand `persist`-middleware migrieren.
- **F-05 anon→login Edge:** falls Routine-V-6 FAIL → ClubProvider-useEffect erweitern um anon→login-Trigger.

### Was Wave 3 NICHT abdeckt (per Spec)

Wave 3 ist Frontend-SSOT-Konsolidierung. Wave 4+ bringt:
- Spieltag-UI-Reform (Track D)
- SaisonRangTab (Track E)
- PlayerPicker UX-Filter (Track G)
- Wave-6-Cleanup (legacy Liga-Felder weg)

---

## Vorheriges (archiviert)

## Slice 251 Spieltag Liga-Scope-Reform — Wave 1 + Wave 2 LIVE

**Stand Session-Ende 2026-04-28 (post-Wave-2):** Wave 1 + Wave 2 sind komplett live in main + Anil hat alle 4 Migrations applied (Wave 1: leagues.active_gameweek-Backfill + Wave 2: 3 wildcards-Migrations).

### Was steht (Wave 1 + Wave 2 cumulative)
- **Wave 1 Track A** (Cron + Service-SSOT): Commit `71f4efb2` + active.md idle `4cef6b95`. Migration `20260428175547_slice_251_leagues_active_gameweek_backfill.sql` applied.
- **Wave 2 Track B** (Service-Layer Liga-Scope): Commit `62bbcb29`. 6 Code + 1 Pre-Review-Memo. 43/43 Tests grün.
- **Wave 2 Track F** (Wildcards Composite-PK + 4 RPCs): Commits `7563761b` + `46df861d` + `91e60a44`. 13 Files. 6/6 Tests grün. 3 Migrations applied: `20260428120000`, `20260428120500`, `20260428121000`.
- **Wave 2 chore**: Commit `f867cd44` (PROVE + LOG + Pre-Wave-3-Probe + Reviewer-Output).
- **HEAD: f867cd44** auf origin/main.
- **Tests:** tsc clean + vitest 49/49 (43 fixtures + 6 wildcards) post-merge.
- **Reviewer:** REWORK → Healer 6 Fixes (2 P0 + 3 P1 + 1 P2) → PASS-mit-Anil-Action.

### Nächste Session — Wave 3 Briefing

**Wave 3 Track C** = useLeagueScope-Store + 5-Page-Migration (cross-domain L-Slice).

**KRITISCH — Spec-Update vor BUILD:** Pre-Wave-3-Probe (`worklog/impact/251-store-consumers.md`) fand:
- **fantasyStore.fantasyCountry/fantasyLeague sind UNUSED** (0 Reads im gesamten Code) → Wave 3 Track C kann LÖSCHEN statt MIGRATE
- **3 echte Reads-Liga: yes** Konsumenten: `MarktplatzTab.tsx`, `ClubVerkaufSection.tsx`, `KaderTab.tsx`
- **23 reads-Liga: no** (Feature-state-only, SKIP)
- **1 unclear** (`TradeSuccessCard.tsx` — vor Wave 3 manuell verifizieren)
- Spec 1.4 listet 5 Page-Konsumenten: `/fantasy`, `/market`, `/manager`, `/rankings`, `/clubs/page.tsx` — Pre-Wave-3-Probe deckte nur features/ ab, `/rankings` + `/clubs/page.tsx` als Pages out-of-scope für Probe → Wave 3 muss expliziten Audit dieser 2 zusätzlichen Pages tun.

**Reviewer Wave-3-Voraussetzungen (aus `worklog/reviews/251-wave-2-review.md`):**
1. ✅ Track F Migrations applied — Anil bestätigt
2. ⚠ Empfohlene Verify-Smokes (manual-run im Supabase-Dashboard SQL-Editor):
   ```sql
   -- Composite-PK Verify
   SELECT a.attname FROM pg_index i JOIN pg_attribute a
     ON a.attrelid=i.indrelid AND a.attnum=ANY(i.indkey)
   WHERE i.indrelid='public.user_wildcards'::regclass AND i.indisprimary;
   -- Expected: 2 rows (user_id, league_id)

   -- RPC-Body Verify
   SELECT pg_get_functiondef('public.earn_wildcards(uuid,int,text,uuid,uuid,text)'::regprocedure)
     ILIKE '%auth.uid() IS NOT NULL%' AND
     pg_get_functiondef('public.earn_wildcards(uuid,int,text,uuid,uuid,text)'::regprocedure)
     ILIKE '%invalid_league%';
   -- Expected: TRUE
   ```

**Wave 3 Plan-Skizze:**
- **NEU**: `src/features/shared/store/leagueScopeStore.ts` (Zustand mit localStorage-Persistence)
- **NEU**: `src/components/layout/LeagueScopeHeader.tsx` (Sticky Header sticky top-0 z-30)
- **MIGRATE**: 3 reads-Liga Konsumenten + 2 Pages (rankings, clubs/page.tsx)
- **DELETE**: fantasyStore.fantasyCountry/fantasyLeague (UNUSED, Pre-Wave-3-Probe)
- **DELETE**: marketStore.selectedCountry/selectedLeague + managerStore.kaderCountry/kaderLeague (REPLACE durch SSOT)
- **Cascade**: profile.favorite_club_id → clubs.league_id → ggf. activeClub.league_id → first active league
- **Cache-Invalidation**: setLeagueScope triggert invalidate von qk.events.leagueGw + qk.events.wildcardBalance + qk.fantasy.gwFixtureInfo

**Worktree-Strategy für Wave 3:**
- 1 Worktree für Track C (Frontend cross-page) — kein Backend-Konflikt
- Optional: Track D (Spieltag-Reform) + Track E (SaisonRang-Tab) parallel als Wave 4, NICHT in Wave 3

### Token-Budget-Lehre Wave 2
- Diese Session (Wave 2 + Heal + Merge): ~750k-800k Tokens (Plan + 3 Agents + Reviewer + Healer + Merge + Push)
- Wave 3 braucht frische Session — `/clear` empfohlen vor Start.

### Bei `/clear` Resume-Pfad

1. `worklog/active.md` (idle, **f867cd44** ist HEAD)
2. `worklog/beta-phase.md` (Phase D, last_signoff: FAIL — Anil-Action-Block)
3. Diese Datei (Resume-Anker, DAS hier — **Wave 3 Briefing-Block oben**)
4. `worklog/log.md` Top 2 Einträge (251 Wave 2 + 251 Wave 1)
5. `worklog/specs/251-spieltag-liga-scope-reform.md` (komplette Spec, vor allem 1.4 Migration-Map + Pillar 1-5)
6. `worklog/impact/251-store-consumers.md` (Pre-Wave-3-Probe Findings — pflicht-Read vor Track C BUILD)
7. `git log --oneline -8` (Wave 1 + Wave 2 = 6 commits)

---

## Vorheriger Stand (vor Wave 2 — archiviert)

**Stand Session-Ende 2026-04-28:** Wave 1 BUILD fertig, wartet auf Migration-Apply durch Anil + Merge.

### Was steht
- **Audit:** `worklog/audits/spieltag-liga-architektur-2026-04-28.md` (14 Findings, 6 P0)
- **Spec:** `worklog/specs/251-spieltag-liga-scope-reform.md` (L-Slice, 7 Tracks, 13 Sektionen, 24 ACs, 16 Edge-Cases) — Anil-Approved
- **Impact:** `worklog/impact/251-spieltag-liga-scope.md` (4 Refinements eingespielt: clubs/page als 5. Konsument, Wave 1 Backfill, Pre-Wave-3-Probe, Track F minimal Frontend)
- **Worktree:** `.claude/worktrees/agent-aec73207c3b95a285` Branch `slice/251-wave-1-track-a` (15 Files, +190/-39, NICHT committed)
- **Reviewer-Verdict:** PASS with CONCERNS · Bridge ✓ gefixt (FantasyContent.tsx:83) · Pattern-Promotion ✓ in common-errors.md §0 (4. Mitigation-Layer) · Review-File ✓ persistiert
- **Tests:** 73+6+12 = 91 grün im Worktree, tsc clean

### CEO-Decisions (alle 4 approved)
1. Liga-Default = `profile.favorite_club.league` Cascade
2. Wildcards pro-Liga (Track F)
3. Lineup-Eligibility Pre-Verify ergab P2 (UX-Falle, kein Money-Path-Bug) — Track G refit zu PlayerPicker-Filter Wave 5
4. Topspiel = Sponsor-Match-Logic

### Anil-Action vor Wave-2-Start (PFLICHT)
1. **Migration manuell applien** im Supabase-Dashboard SQL-Editor:
   ```sql
   UPDATE public.leagues l
   SET active_gameweek = sub.min_gw
   FROM (
     SELECT league_id, MIN(active_gameweek) AS min_gw
     FROM public.clubs
     WHERE league_id IS NOT NULL AND active_gameweek IS NOT NULL
     GROUP BY league_id
   ) sub
   WHERE l.id = sub.league_id
     AND COALESCE(l.active_gameweek, -1) IS DISTINCT FROM sub.min_gw;
   ```
2. **Verify** (erwartet: 0 Rows):
   ```sql
   SELECT l.id, l.name, l.active_gameweek, MIN(c.active_gameweek)
   FROM leagues l LEFT JOIN clubs c ON c.league_id = l.id
   WHERE l.is_active = true GROUP BY l.id, l.name, l.active_gameweek
   HAVING l.active_gameweek != MIN(c.active_gameweek)
      AND MIN(c.active_gameweek) IS NOT NULL;
   ```
3. Anil sagt "applied" → Primary-Claude merged Worktree → main + Stage PROVE/LOG → Wave 2 starten (Track B ‖ Track F parallel in 2 neuen Worktrees)

### Nächste Session — Erste Action
1. Diesen Handoff-Block lesen
2. `worklog/active.md` lesen (slice 251, stage build-pending-apply)
3. Anil fragen: "Migration applied?" — wenn ja: merge + Wave 2. Wenn nein: nur drüber sprechen.
4. Wave 2 = Track B Service-Layer (`getFixturesByGameweek(gw, leagueId)` + Service-Tests) ‖ Track F Wildcards Composite-PK + RPCs (`get_wildcard_balance(uid, leagueId)` etc.)

### Wave-2-Briefing-Skizze (für nächste Session)

**Track B Backend-Agent (Worktree):**
- `getFixturesByGameweek(gw)` → `(gw, leagueId?)` mit `.eq('league_id', leagueId)`
- `pickTopspiel(fixtures, clubId)` → `(fixtures, clubId, leagueId, sponsorClubId?)` Sponsor-Match-Priorität
- `dashboardStats` Update in FantasyContent (events → filteredGwEvents)
- 3 Konsumenten: SpieltagTab.tsx:81, events.mutations.ts:133, fixtures.ts:316
- Tests: fixtures.test.ts (5 Tests), events-v2.test.ts, lib-services-fixtures.test.ts
- AC-22-Cross-Check: Cron Dual-Write läuft korrekt nach 1 GW-Cycle

**Track F Backend-Agent (paralleler Worktree):**
- Migration: `user_wildcards` PK von `(user_id)` → `(user_id, league_id)` Composite. ADD league_id NULLABLE → Backfill split per Cascade-Default-Liga (rest-handling) → ALTER PK
- 3 RPCs: `get_wildcard_balance(p_user_id, p_league_id)`, `earn_wildcards(...,p_league_id)`, `spend_wildcards(...,p_league_id)`. AR-44 REVOKE-Block pflicht.
- `rpc_save_lineup` Z.359+364: `event.club.league_id` reinholen + an spend/earn passen (CREATE OR REPLACE-Migration)
- `refund_wildcards_on_leave(p_user_id, p_event_id)`: gleiche league-id Lookup
- Frontend Read: `useWildcardBalance(uid, leagueId)` Hook erweitern + qk.events.wildcardBalance(uid) → (uid, leagueId)
- AC-24 Backfill-Sum-Smoke: pre/post Sum-Diff = 0

**Wave 2.5 Pre-Wave-3-Probe** (parallel zu Wave 2 als Read-Only-Audit-Task):
- 26 Sub-Components in `src/features/<market|manager|fantasy>/` per grep auf Liga-Reads klassifizieren
- Output: `worklog/impact/251-store-consumers.md` mit Annotation "Reads-Liga: yes/no/transient" pro File
- Sonst Wave 3 Track C scope-creept

### Token-Budget-Lehre Session 2026-04-28
- Diese Session hat ~850k Tokens verbraucht (Audit + 3 Agents + Spec + Impact + Wave 1 BUILD + Reviewer + Bridge + Pattern-Promotion)
- Wave 2 + 3 brauchen frischen Context — `/clear` vor Start, Handoff-Block oben dient als Restart-Punkt

---

# Resume-Anker (2026-04-28 — Tech-Cleanup-Session: 4 Slices D52-Refinement-Wave + GH-Issue-Cleanup, autonom)

**Wenn `/clear` oder Token-Limit:** Lese in dieser Reihenfolge:
1. `worklog/active.md` — `status: idle`, HEAD `f412b396`
2. `worklog/beta-phase.md` — Phase D, last_signoff: FAIL (Anil-Action-Block, NICHT Tech), last_phase_run aktualisiert
3. Diese Datei (Resume-Anker, Top-Block — DAS hier)
4. `git log --oneline -10` (4 Slices = 9 commits diese Session + 1 chore-phase-tracker)
5. `worklog/log.md` Top 4 Einträge (242 / 240 / 241 / 238)
6. Dann ggf. älterer Resume-Anker (2026-04-27→28 unten)

## Session-End 2026-04-28 — 4 Slices D52 Refinement-Wave + 7 GH-Issues batch-closed

**Anil-Direktive im Verlauf der Session:**
1. "weiter im handoff, mit voller konzentration, fokus und eifer!" → Slice 238 (Triage echter Drift)
2. "autonom weiter, bis du erschöpft bist" → Slices 241 + 240 + 242 + GH-Issue-Cleanup + Phase-Tracker
3. "mache alle updates und sicherungen für den clear, wir machen dann nahtlos weiter" → DIESE Pre-Clear-Vorbereitung

## 4 Slices — was diese Session erreicht hat

**Slice 238** — silent-fail-audit Chunked-Detection + Test-File-Skip (XS, Tool, **D52 Refinement #2**). Triage echter Drift im baseline 93/103/196:
- +1 HIGH `wallet.ts:241` war FALSE-POSITIVE: Code IST chunked (`CHUNK=100`, for-loop), Audit-Window (-2/+3) fand CHUNK-Statement 8 Zeilen oberhalb nicht.
- +2 MEDIUM `__tests__/club-most-owned-batch.test.ts:64,286` waren Test-File-Mock-Pattern (Pattern 4 hatte keinen test-skip wie Pattern 1).
- Fix: Pattern 1 lookback -2 → -10 + Pattern 4 test-file-skip analog Pattern 1/7/8.
- Drift: -28 total / -17 HIGH / -11 MEDIUM. Bonus: ganze Klasse pre-existing for-loop-CHUNK-false-positives in src/lib/services/* die seit Slice 088+092 unsichtbar geflagged waren.
- Baseline 196/93/103 → 168/76/92. CI-Gate exit 0. 7/7 ACs PASS. Commit 630c15a6.

**Slice 241** — errors-infra.md Knowledge-Capture (XS, Doc, Knowledge-Flywheel-Pflicht). 4 Lehren aus Slice 234 review.md codifiziert:
1. Spec-Drift-im-Drift-Heal-Anti-Pattern (D54-Slice hatte F-01/F-07 in eigener Spec)
2. MSYS Git Bash `tr '[:upper:]' '[:lower:]'` ist NICHT UTF-8-aware → LC_ALL=C.UTF-8 + dual-Pattern
3. Issue-Closing != Bug-Resolved → Master-Tracker für recurring Failure-Klassen (Issue #25)
4. settings.json-Edit > 3 Hooks → IMPACT-Stage-Pflicht (Cross-Cutting wie DB-Migration)
- 1 Section erweitert (Shell/Hooks) + 3 NEU (Cross-Cutting/Operational). 6/6 ACs PASS. 9 Slice-234-Refs. Commit a7198f5e.

**Slice 240** — TM-Once-Off-Scripts Triage (XS, Doc/File-Move, **D54 Allowlist-Cleanup**). 13 KNOWN_ORPHANS triagiert:
- ARCHIVE (5): tm-club-id-discovery (S141 Phase-B done), tm-squad-scrape-local (S144 Phase-B done), tm-html-inspect (debug-helper), fix-bug-004 (BUG-004 done), fix-migration-history (Migration-Repair done) → `scripts/archived/2026-04-28-once-off/`
- KEEP (8): operational manual-tools (tm-parser-sanity/verify, tm-profile-local, tm-rescrape-stale, tm-search-local, tm-search-scrape-unknown, enrich-nationality-tm, verify-nationality-coverage)
- DELETE (0): Archive ist sicherer (git mv preserves history)
- KNOWN_ORPHANS in wiring-check.ts: 14→10 entries. 0 Production-Refs auf archived. README.md mit Restore-Anleitung. 6/6 ACs PASS. Commit e1294307.
- Bonus-Discovery: tm-html-inspect.mjs war pre-Slice-240 nicht in KNOWN_ORPHANS-allowlist (latent silent allowlist-drift) — resolved de-facto via Archive.

**Slice 242** — orphan-component-detector Allowlist (XS, Tool, **D52 Refinement #3**). KNOWN_ORPHANS-Mechanism analog wiring-check.ts:
- 4 entries: 3 test-only fixtures (FollowBtn, HomeSkeleton, ManagerOffersTab) + 1 deferred (CommunityValuation Slice 227 @experimental)
- Stats erweitert: realDrift + knownAllowlisted parallel ausgegeben
- Drift: 13 → 9 real-drift (50% Issue-Noise-Reduktion in nightly-audit-Pipeline)
- 9 echte unused-Components weiter sichtbar — Slice 239 Anil-Wire-Plan-Wave kann sich auf 9 statt 13 fokussieren. 7/7 ACs PASS. Commit 475854bd.

## GitHub-Issue-Cleanup (Master-Tracker-Pattern)

**7 stale Issues batch-closed via Comment + Master-Tracker-Reference:**
- #22 (Audit-Findings 2026-04-27): silent-fail GREEN, orphan REDUCED, i18n GREEN, tr-strings PENDING-ANIL
- #26-29-31 (Smoke-Failures): gleiche Bug-Klasse wie #25 → Master-Tracker-Pattern
- #30 (Audit-Findings 2026-04-28 orphan): superseded durch Slice 242 Allowlist

**Nur Issue #25** (Master-Tracker bescout.net /market Player-Link Timeout) bleibt OPEN — designed-state.

## Pipeline-Status (alle 10 Commits gepusht)

HEAD: `f412b396 chore(beta-phase): last_phase_run 2026-04-28 — Slice 238/240/241/242 + 5 GH-Issues batch-closed`

```
f412b396 chore(beta-phase) last_phase_run 2026-04-28
6d2fc61a chore(242) active idle
475854bd feat(242) orphan-detector Allowlist (D52 #3)
60611af5 chore(240) active idle
e1294307 docs(240) TM-Scripts Triage 5 archive
f866d892 chore(241) active idle
a7198f5e docs(241) errors-infra Knowledge-Capture 4 Lehren
5d83839e chore(238) active idle
630c15a6 feat(238) silent-fail Chunked + Test-Skip (D52 #2)
056dcfc0 docs(handoff) Pre-Clear VORHERIGE Session
```

## Cumulative Tech-Side-Stand post-Slice-242

**Audit-Tools (5) gehärtet via D52-Pattern:**
| Tool | Status | Drift |
|------|--------|-------|
| `silent-fail-audit` | GREEN | baseline 76 HIGH / 92 MEDIUM (war 93/103 vor Slice 238) |
| `audit-stale-check` | GREEN | 0 stale-candidates (Slice 223 Foundation) |
| `orphan-component-detector` | 9 real-drift | 4 allowlisted (Slice 242 NEU), 9 echte unused warten auf Slice 239 |
| `type-truth-audit` | GREEN | 0 risk-patterns (Slice 229 Foundation) |
| `wiring-check` | GREEN | 10 known-allowlisted, 0 real-drift (Slice 234 + 240) |

**Knowledge-Flywheel:**
- `errors-infra.md` 4 NEU Lehren codifiziert (Slice 241)
- `decisions.md` D52 jetzt 6× live appliziert (Slice 223/229/237/238/240/242)
- `.claude/learnings-queue.jsonl` aktiv (capture-correction live seit Slice 234)

**Phase-Tracker:** `worklog/beta-phase.md` last_phase_run aktualisiert. Phase D, last_signoff FAIL. Findings_open: alle NULL.

## Was bleibt — alles nicht-autonom (Anil/Mensch oder Live-Test)

**Slice 239** — 9 echte unused-Components Wire-Plan-Wave:
- DpcMasteryCard, GameweekScoreBar, LimitOrderModal, PlayerImagePlaceholder, TradeSuccessEffect (5 in player/detail/)
- HoldingsSection, IPOBuySection, TransferBuySection (3 in player/detail/trading/)
- BuyOrderModal (1 in features/market/components/shared/)
- Pro Component: Anil entscheidet delete / wire / defer

**Issue #25 Smoke-Code-Fix** (Player-Link-Timeout):
- Browser-Auth-Fail / Selector-Drift / DB-Empty / Cold-Start
- Braucht Live-Test gegen bescout.net (CTO kann nicht autonom)
- M-Slice — könnte echter Beta-Blocker sein

**Money-Path-CEO-Approvals:**
- FANTASY-NEU-1 (FPL 60min-Rule, Money-Path Scoring)
- F-09 BPS-Bonus (pre-existing)
- UX 20 MembershipSection Confirm (pre-existing)

**Anil-Mensch-Block (einziger Beta-READY-Blocker):**
- 3 Beta-Tester organisieren (Templates fertig in `memory/beta-tester-recruitment-templates.md`)
- TR-Native-Reviewer organisieren
- `memory/beta-tester-list.md` schreiben (.gitignore-pflicht)
- TR-Wording-Reviews: Slice 200a/202/208/224 Strings

## Bei `/clear` Resume-Pfad

1. `worklog/active.md` (idle, **f412b396** ist HEAD)
2. `worklog/beta-phase.md` (Phase D, last_phase_run 2026-04-28, last_signoff FAIL — Anil-Action-Block)
3. Diese Datei Top-Block (DIESER Resume-Anker)
4. `worklog/log.md` Top 4 Einträge (242/240/241/238) + Top vorher (237/235/234/233/232/231)
5. `git log --oneline -12` (10 Commits diese Session + 2 vorherige)
6. `git worktree list` (sollte nur main sein)
7. **Nächster sinnvoller Slice:** abhängig von Anil-Direktive — autonom-ROI ist erschöpft.
   - Wenn "Slice 239" → Anil entscheidet pro Component delete/wire/defer (interaktiv)
   - Wenn "Smoke-Triage" → Live-Test gegen bescout.net (Anil + ich gemeinsam)
   - Wenn "Anil-Action" → 3 Tester organisieren (Mensch-Action)
   - Wenn "neue Idee" → Brainstorming via /spec

## D52-Pattern-Familie — 6× live appliziert

D52 ("Wave-3-Tooling iterativ-tightenen, lieber locker starten + tighten"):
- **Slice 223** audit-stale-check.ts (D48-Catcher) — Initial-Foundation
- **Slice 229** type-truth-audit.ts — Iteration 17→0 false-positives
- **Slice 237** silent-fail-audit Comment-Skip — 3 false-pos weg
- **Slice 238** silent-fail-audit Chunked + Test-Skip — 28 false-pos weg ⭐ (größter Single-Fix)
- **Slice 240** TM-Scripts KNOWN_ORPHANS-Triage — Allowlist-Cleanup
- **Slice 242** orphan-component-detector Allowlist — Mechanism + 4 entries

Tooling-Foundation ist gehärtet. Audit-Pipeline läuft jetzt mit minimal-Noise + maximal-Signal.

---

# Vorherige Sessions (archiviert)

# Resume-Anker (2026-04-27→28 — System-Wiring-Session: 6 Slices, Self-Improvement-Loop + Drift-Prevention enforced + 2× Workflow-Live-Test)

**Wenn `/clear` oder Token-Limit:** Lese in dieser Reihenfolge:
1. `worklog/active.md` — `status: idle`, HEAD `88df306d`
2. `worklog/beta-phase.md` — Phase D, last_signoff: FAIL (Anil-Action-Block, NICHT Tech)
3. Diese Datei (Resume-Anker, Top-Block — DAS hier)
4. `git log --oneline -14` (6 Slices = 14 commits diese Session)
5. `worklog/log.md` Top 6 Eintraege (231 → 237)
6. `memory/decisions.md` D53 + D54 (NEU diese Session)
7. `.claude/rules/workflow.md` Section 3a (Definition-of-Done je Slice-Type)

## Session-End 2026-04-27→28 — 6 Slices, Workflow architektonisch enforced

**Anil-Direktive im Verlauf der Session:**
1. "weiter nahtlos im handoff, mit voll diziplin und fokus"
2. "2+3, danach 4" → Slices 231 + 232 (Wave-3-Tooling-Trio komplett)
3. "haben wir noch gaps?" + GSD-Reference → Slice 233 Vorschlag akzeptiert
4. "j" → Slice 233 Self-Improvement-Loop (D53)
5. **"Plan-Mode + Ultrathink, vollständige Arbeit"** → Slice 234 L-Slice D54
6. "wir starten mit 3 und testen dabei unseren neuen Workflow" → Slice 235 (i18n)
7. "b" → Anil-Approval Option B (Kadro + Sahip Wording)
8. "empfehlung" → Slice 237 Comment-Skip-Heuristik
9. "bereite alles für einen clear vor" → Diese Pre-Clear-Vorbereitung

## 6 Slices — was diese Session erreicht hat

**Slice 231** — Spec-Quality-Gate Item-Count-Layer-2 (XS, Hook). Reviewer-Lücke aus Slice 212 nach 19 Slices geheilt. Layer 2 prüft Item-Counts pro Slice-Größe (XS=3, S=6, M=6/8, L=10) für Code-Reading + Edge-Cases + ACs. 3 BUILD-Discoveries: UTF-8 `\b`-Bug, Tabellen-Header-Rollback, AC-Code-Block-Pattern.

**Slice 232** — `spec: inline`/`skipped` Bypass Hard-BLOCK (XS, Hook). Erste Hard-BLOCK-Erweiterung. Plain bypass ohne Begründungs-Klammer → BLOCK exit 2. Wave-3-Tooling-Backlog komplett.

**Slice 233** — Nightly Audit Self-Improvement-Loop (S, GHA, **D53**). **Erste autonome Schleife** in BeScout. nightly-audit.yml mit 11 Audit-Steps + Smoke + Auto-Issue-Pipeline. Daily 03:00/04:00 UTC. Live-Run #25011352539 verified.

**Slice 234** — System-Wiring Recovery + Drift-Prevention (L, Hook, **D54**, **Plan-Mode + Ultrathink**). 6 Phasen:
- HEAL: 8 Hooks registriert (capture-correction, inject-context-on-compact, morning-briefing, pattern-check, quality-gate-v2, run_tests_on_change, session-retro, track-file-changes), 1 archived (quality-gate.sh), 1 deleted (inject-learnings.sh). **Knowledge-Flywheel war 19 Tage tot** (capture-correction.sh env-var-Bug + nicht registriert) → JETZT live, queue.jsonl wächst.
- PREVENT: scripts/wiring-check.ts (NEU, 230 Zeilen) + ship-tool-wiring-gate.sh (NEU, BLOCK exit 2 bei orphan-Tool).
- ARCHITEKTUR: Slice-Type-Header pflicht in _TEMPLATE.md + Layer-3 DoD-Hook.
- LIVE-VERIFY: Run #25018867677, 11 Audit-Steps SUCCESS, Issue-Dedupe verified.
- 14 stale Smoke-Issues batch-closed, Master-Tracker #25 erstellt.
- Reviewer-Agent CONCERNS (11 Findings) → PASS post-Heal-Wave.

**Slice 235** — i18n 7 fehlende TR-Keys (XS, **i18n**, **1. Workflow-Live-Test** unter D54-Enforcement). Anil-Approval Option B: Kadro + Sahip. "Kadroda değil" identisch zu existing `formBars.notInSquad` (Bonus-Konsistenz). Alle Hooks silent.

**Slice 237** — silent-fail-audit Comment-Skip-Heuristik (XS, **Tool**, D52 Refinement, **2. Workflow-Live-Test**). Comment-Skip-Regex am Loop-Top fängt 3 false-positives in JSDoc-Comments (scripts/type-truth-audit.ts:12,132,140). Baseline 92→93 HIGH (transparent: 3 false-pos weg + 1 echter Drift dokumentiert).

## Pipeline-Status (alle 14 Commits gepusht)

HEAD: `88df306d chore(237): active idle nach Slice 237 — silent-fail Comment-Skip live`

```
88df306d chore(237) active idle
fbeb085b feat(237) silent-fail Comment-Skip
5b96108a chore(235) active idle
9ed8cb02 feat(235) i18n TR-Keys
be8d627c docs(234) proof AC-09 + Issue-Dedupe live-verified
90070827 chore(234) active idle
68717459 feat(234) System-Wiring L-Slice D54
26df79ba chore(233) active idle
e3ad904b feat(233) Nightly Audit Loop D53
7ce44068 docs(handoff) Session-End 2026-04-27 — VORHERIGE Session
```

## System-Status: läuft autonom

**Daily-Cron-Loop (Slice 233+234 D53+D54):**
- 03:00 UTC: nightly-audit.yml → 11 Audit-Steps (silent-fail, stale, orphan, type-truth, mutation-race, i18n, rpc-security, tr-strings, **compliance**, **wiring**, **findings-to-slices Pipeline**)
- 04:00 UTC: bescout.net Smoke-Test
- Issue-Dedupe via gh listForRepo + Comment-Update (max 1 Issue/Tag)

**13 Vercel-Crons** (Daten-Sync): gameweek-sync, sync-players-daily, sync-injuries, sync-standings, sync-fixtures-future, sync-transfers, calculate-mv-trends, calculate-trade-volume-7d, etc.

**3 GHA-Workflows on-Event:** ci.yml (push), post-deploy-smoke.yml (deploy success), post-push-deploy-watchdog.yml (push, D36-Detection)

**Pre-Commit-Hooks aktiv (alle architektonisch enforced):**
- ship-spec-gate (BLOCK Edit ohne Slice)
- ship-spec-quality-gate Layer 1+2+3 (WARN)
- ship-spec-quality-gate Bypass-BLOCK (`spec: inline` plain)
- ship-cto-review-gate (BLOCK feat ohne Reviewer-File)
- ship-proof-gate (BLOCK feat ohne Proof)
- **ship-tool-wiring-gate (BLOCK feat bei orphan-Tool)**

**Knowledge-Flywheel reaktiviert:**
- capture-correction.sh feuert auf UserPromptSubmit, fängt Korrekturen (Keywords: nein, falsch, stattdessen, hör auf, korrektur etc.) in `.claude/learnings-queue.jsonl`
- queue.jsonl hat aktuell 4 Test-Korrekturen aus Slice 234 Build-Test
- /reflect Skill kann jetzt Drafts erzeugen aus queue
- /promote-rule Skill für Anil-Approval-Pipeline

## Was steht offen — Backlog priorisiert

**Tech-Backlog (CTO-autonom, sofort actionable):**
- **Slice 238** — Triage echter Drift (+1 HIGH in-without-chunking + 2 MEDIUM error-check entstanden 2026-04-26→27, transparent in baseline 93/103)
- **Slice 240** — TM-Once-Off-Scripts cleanup (13 orphan TM-Scripts klassifizieren: archive/delete/keep)
- **Slice 241** — errors-infra.md Knowledge-Capture (4 Lehren aus Slice 234 Reviewer-Heal)

**Tech-Backlog (braucht Anil-Decision):**
- **Slice 239** — orphan 13 Components Wire-Plan (CommunityValuation, DpcMasteryCard, GameweekScoreBar, LimitOrderModal, etc.) — pro Component delete/wire/defer
- **Smoke-Code-Fix** — Issue #25 Master-Tracker, Player-Link-Timeout `e2e/beta-smoke.spec.ts:37`. Mögliche Causes: Auth-Fail / Selector-Drift / DB-Empty. Could be echter Beta-Blocker.

**Money-Path-CEO-Decisions (Anil-only):**
- FANTASY-NEU-1 (FPL 60min-Rule, Money-Path Scoring)
- F-09 BPS-Bonus (pre-existing CEO-pending)
- UX 20 MembershipSection Confirm-Step

**Anil-Mensch-Block (einziger Beta-READY-Blocker):**
- 3 Beta-Tester organisieren (Templates fertig in `memory/beta-tester-recruitment-templates.md`)
- TR-Native-Reviewer
- `memory/beta-tester-list.md` schreiben (.gitignore-pflicht)

## Bei `/clear` Resume-Pfad

1. `worklog/active.md` (idle, **88df306d** ist HEAD)
2. `worklog/beta-phase.md` (Phase D, last_signoff: FAIL — Anil-Action-Block, NICHT Tech)
3. Diese Datei (Resume-Anker)
4. `worklog/log.md` Top 6 Einträge (231/232/233/234/235/237)
5. `memory/decisions.md` D53 + D54 (Build-without-Wire architektonisch enforced)
6. `.claude/rules/workflow.md` Section 3a (Definition-of-Done je Slice-Type)
7. `git worktree list` (sollte nur main sein)
8. **Nächster sinnvoller Slice:** Anil-Direktive abhängig.
   - Wenn "weiter" → Slice 238 (Triage echter Drift, XS, autonom)
   - Wenn "Smoke-Triage" → Slice 235er Code-Fix (Issue #25, M-Slice, kann Beta-Blocker sein)
   - Wenn Wire-Plan → Slice 239 (Anil entscheidet pro Component)

## Workflow-Live-Test — was Slice 234 D54 in der Praxis macht

**Beobachtung Slice 235 + 237:** alle Hooks silent wie designed.

| Hook | Slice 235 (i18n) | Slice 237 (Tool) |
|------|------------------|------------------|
| Layer-1+2 (Sektionen + Items) | silent ✓ | silent ✓ |
| Layer-3 (Slice-Type-DoD) | silent ✓ (Spec hat tr.json/de.json) | silent ✓ (Spec hat Wiring-Sektion) |
| ship-tool-wiring-gate | nicht-relevant | silent ✓ (Edit auf existing Tool) |
| ship-cto-review-gate | review-File ✓ | review-File ✓ |
| ship-proof-gate | proof-File ✓ | proof-File ✓ |
| capture-correction | kein Trigger ("b"-Antwort) | kein Trigger |

**Verdict:** Workflow funktioniert. Discipline ist architektonisch enforced statt durch Memory.

## Pattern-Familie etabliert

**D43 → D46 → D54** ("Existenz ≠ Verwendung"):
- D43 (Slice 192/200): Type-Truth-Drift — Silent-Cast / nested-select
- D46 (Slice 207/227/228): Orphan-Component-Production-Code
- **D54 (Slice 234): Build-without-Wire — Hooks/Scripts/NPM-Scripts**

Cross-cutting: Tool/Component/Audit kann existieren ohne im echten Workflow zu sein. Enforcement-Architektur (D45 Hooks > Text-Regeln) erzwingt Discipline.

## Bonus-Discoveries diese Session

1. **capture-correction.sh hatte env-var-Bug** (las `CLAUDE_USER_PROMPT` statt JSON-stdin) — 19 Tage tot ohne dass jemand merkte. Slice 234 fixt + UTF-8-tolerant via LC_ALL=C.UTF-8 + dual-Pattern (Slice 234 Reviewer-F-04).
2. **silent-fail-audit-Heuristik fängt eigene Audit-Tool-JSDoc** — Slice 237 globaler Comment-Skip löst es retro + future-proof.
3. **Issue-Dedupe via gh listForRepo + title-startsWith** — Slice 234 implementiert + Run #25018867677 verified Comment-Update statt Duplicate.
4. **Slice 234 hat 14 stale Smoke-Issues batch-closed** — aber Master-Tracker #25 sichtbar gehalten (Reviewer-F-08 HIGH-Concern adressiert: Issue-Closing != Bug-Resolved).

---

# Vorherige Sessions (archiviert)

# Resume-Anker (2026-04-27 — 8-Slice-Marathon: Re-Audit-Heal-Wave + Wave-3-Tooling-Trio)

**Wenn `/clear` oder Token-Limit:** Lese in dieser Reihenfolge:
1. `worklog/active.md` — `status: idle`, HEAD `7463600c`
2. `worklog/beta-phase.md` — Phase D, last_signoff: FAIL, **alle findings_open NULL**
3. Diese Datei (Resume-Anker, Top-Block)
4. `git log --oneline -16` (8 Slices = 16 commits diese Session)
5. `worklog/log.md` Top 8 Eintraege (223 bis 230)
6. `memory/decisions.md` D51 + D52 (NEU 2026-04-27)

## Session-End 2026-04-27 — 8 Slices in Folge, Tech-Side maximal sauber + Audit-Methodik gehärtet

**Anil-Direktive im Verlauf der Session:**
1. "weiter im handoff" → Slice 223 D48-Catcher-Tool
2. "A" → Slice 223 (CTO-Empfehlung Wave-3-Tooling)
3. "B" → Targeted Phase-A-Re-Audit (3 Agents auf Slice-222-Diff)
4. **"DU HAST DAS VOLLE KOMANDO; arbeite autonom"** → Slices 224 + 225 + 226 (Re-Audit-Heal-Wave)
5. "C, den rest übernimmst du autonom" → Slice 227 CommunityValuation-Defer
6. "übernehme das visual check" → Visual-Check + ORPHAN-NEU-1 Discovery
7. "autonom weiter" → Slices 228 + 229 + 230 Wave-3-Tooling-Trio
8. "bereite alles für einen clear bereit" → Pre-Clear-Vorbereitung (diese Datei)

## Pipeline-Status (alle 16 Commits gepusht)

HEAD: `7463600c chore(230): active idle nach Slice 230 — Wave-3-Tooling-Trio komplett (223+228+229+230)`

**Wave 1 — Wave-3-Tooling-Foundation:**
- 223 `audit-stale-check.ts` — D48-Catcher automatisiert + 2 echte Drifts gefangen (F-07/F-11 reklassifiziert)

**Wave 2 — Re-Audit-Heal-Wave nach Targeted Phase-A-Re-Audit (9 NEU Findings → 7 healed + 1 deferred + 1 wont-fix):**
- 224 Sentiment-Wording-Heal — 3 Findings (P1+P1+P3) Wurzel-Fix · business.md Verbots-Register erweitert
- 225 InfoTooltip-Migration — UX-NEU-2/3/4 + Slice 216 Pattern-Drift geheilt · ui-components.md Tooltip-Pattern-Decision-Tree codifiziert
- 226 Sentiment-Bar 3-Segment — FM-NEU-4 closed · FM-NEU-3 deferred (post-Beta) · FM-NEU-5 wont-fix
- 227 CommunityValuation @experimental — ORPHAN-NEU-1 (Visual-Check Discovery) deferred + decisions.md D46 erweitert (Component-Achse)

**Wave 3 — Wave-3-Tooling-Trio (CTO autonom, Anil-Direktive "autonom weiter"):**
- 228 `orphan-component-detector.ts` — D46-Component-Achse automatisiert + 13 echte Orphans entdeckt
- 229 `type-truth-audit.ts` — D43 Static-Pattern-Detection (3 Bug-Klassen)
- 230 `ship-phase-tracker-reminder.sh` — Slice 214 Reviewer-Backlog erfüllt

## Tech-Side ist FERTIG — null open Findings

Phase-Tracker (`worklog/beta-phase.md`):
```yaml
phase: D
last_signoff: FAIL (HARD-NO-GO Trial Slice 217 + last_signoff_verdict 2026-04-27 aktualisiert)
last_phase_run: 2026-04-27 (Targeted Phase-A Re-Audit + Heal-Wave)
findings_open: P0=0, P1=0, P2=0, P3=0   # ALLE NULL
deferred: 4 (POSTHOG-NEU-1, FM-RR-2, FM-NEU-3, ORPHAN-NEU-1)
ceo_pending: 3 (FANTASY-NEU-1, F-09 BPS, UX 20 MembershipSection)
wont_fix: 3 (FM-RR-1, BRAND-NEU-1, FM-NEU-5)
stale: 2 (TR-NEU-1, FM-RR-3)
signoff_questionable: 2 (Page-Health-Score, Persona-Score-numerisch)
```

## Wave-3-Tooling — 4 Tools + 4 Patterns automatisiert

| Tool | npm-Script | Pattern | Slice |
|------|-----------|---------|-------|
| `scripts/audit-stale-check.ts` | `audit:stale` | D48 Audit-Stale-Catcher | 223 |
| `scripts/orphan-component-detector.ts` | `audit:orphan` | D46 Orphan-Component | 228 |
| `scripts/type-truth-audit.ts` | `audit:type-truth` | D43 Silent-Cast / nested-select / missing-error | 229 |
| `.claude/hooks/ship-phase-tracker-reminder.sh` | (Stop-Hook) | findings_open Counter-Update Reminder | 230 |

## Neue Decisions in `memory/decisions.md` (DISTILL diese Session)

- **D51** PROCESS: Targeted Phase-A-Re-Audit nach Money-Path-UI-Edits Pflicht
  - Begründung: Slice 222 → Re-Audit-Wave produzierte 9 echte NEU Findings aus 10-Lines-Diff
  - Self-Review-D35-Limit: erkennt Code-Pattern-Konsistenz, NICHT Compliance/Mobile-UX/Domain-Mechanik

- **D52** PROCESS: Wave-3-Tooling — Detection-Tool pro Bug-Klasse-Pattern
  - Standardisierte API: `audit:*` npm-script + Markdown-Report + Exit-Code-Switch + Negative-Test-Pflicht
  - Heuristik-Refinement-Lehre: lieber locker starten + iterativ tightenen (Slice 229: 17→0 false-positives)

## Knowledge-Flywheel — codifizierte Lehren

1. **business.md Verbots-Register erweitert** (Slice 224)
   - "unter-/überbewertet" + "düşük/yüksek değerli" + "Position/pozisyon" als Securities-Drift verboten
   - CI-Guard-grep-Block ergänzt

2. **ui-components.md Tooltip-Pattern-Decision-Tree** (Slice 225)
   - Education → InfoTooltip (Mobile-friendly + A11y)
   - Trivial-Hint → `title=` (Desktop-Hover-OK)
   - Anti-Pattern dokumentiert + Migration-History (Slice 216 + 222)

3. **decisions.md D46 erweitert um Component-Achse** (Slice 227)
   - "Audit-Quality-Drift Pattern-Familie": Worktree-Escape + Service-Duplicate + Orphan-Component
   - Cross-cutting: "Code-Existenz ≠ Code-Im-Render-Tree"
   - Audit-Methodik-Hardening: import-trace-Pflicht vor P1-Klassifikation

## Visual-Check Discovery — `CommunityValuation` orphan production-code

- Visual-Check 2026-04-27 entdeckte: `CommunityValuation` exported via barrel-index, nirgends importiert
- **Slice 216 K-RR-1 + Slice 225 InfoTooltip-Migration** wurden auf totes Component appliziert (User sah es nie)
- **Anil-Decision Option C:** Defer mit `@experimental` JSDoc + Backlog-Eintrag
- **Wire-Plan:** bei Skala >20 active-scouts auf Player-Detail Community-Tab wiren, sonst Slice 230+ delete
- **Audit-Methodik-Bug:** Phase-A-Re-Audit hatte Component nicht import-trace-verified → falsche P1-Klassifikation
- **Slice 228 `orphan-component-detector.ts` verhindert das in Future** (CI-gate-ready)

## Bonus-Discovery: 13 echte Orphans im Codebase

Slice 228 erstes Run zeigte:
- `CommunityValuation` (Slice 227 known)
- `DpcMasteryCard`, `GameweekScoreBar`, `LimitOrderModal`, `PlayerImagePlaceholder`, `TradeSuccessEffect`
- `HoldingsSection`, `IPOBuySection`, `TransferBuySection`
- `BuyOrderModal` ("aus Beta entfernt AR-11" — File-Leiche, sollte gelöscht werden)
- `FollowBtn`, `HomeSkeleton`, `ManagerOffersTab` (test-only used)

**Cleanup-Wave Slice 231+ pendiert** — jeder Component eigene Decision (delete/wire/defer). Nicht autonom, weil Wire-Plan-Dialog mit Anil pro Component möglich.

## Zwischen heute und Beta-GO steht NUR noch

**1 Anil-Mensch-Action:** 3 Tester organisieren mit fertigen Templates.

```
1. memory/beta-tester-recruitment-templates.md → 3 Personen, Templates anpassen
2. 3× DM/Email schicken
3. Bei Zusage: memory/beta-tester-list.md (private, .gitignore)
4. memory/beta-onboarding.md TODO-Stellen ersetzen
5. Zoom-Calls (~30min × 3)

Erwartete Mensch-Zeit: 3-4h verteilt über 3-7 Tage.
```

## Anil-Action vor Beta-Verify (gesammelt diese Session + vorheriger)

**Mensch-only-Blocker (Anil):**
- 3 Beta-Tester organisieren (Templates fertig, ~30min)
- TR-Native-Reviewer organisieren
- `memory/beta-tester-list.md` schreiben (private, .gitignore-Pflicht)
- TR-Wording-Review der Slice 224 NEU-Keys: `sentimentLabel/Bullish/Bearish/Neutral` ("güçlü/zayıf buluyor" / "kararsız")
- Visual-Verify auf bescout.net post-deploy (Mobile 393px Tap-Test):
  - `/market` BuyConfirmModal Sentiment-`?`-Icon
  - Player-Detail CommunityValuation Floor-Preis-`?`-Icon (technisch deployed aber Component ist orphan — Verify zeigt nichts; Wire-Plan pending)

**Money-Path-CEO-Decisions (Anil-only):**
- FANTASY-NEU-1 (FPL 60min-Rule, Money-Path Scoring-Algorithm-Change)
- F-09 BPS-Bonus (pre-existing Money-Path)
- UX 20 MembershipSection Confirm (pre-existing Money-Risk)

**Wire-Plan-Decisions (Anil entscheidet):**
- 13 Orphan-Components aus Slice 228 — pro Component delete/wire/defer
- `CommunityValuation` Wire-Plan: bei Skala >20 active-scouts oder löschen?

## Backlog post-Beta (wenn Skala)

- **Slice 231+ Orphan-Cleanup-Wave** (13 Components, jeweils delete/wire/defer Decision)
- **Slice 240+ PostHog-Instrumentation** (track-Events für login/first_trade/first_lineup/first_post)
- **Slice 241+ Mobile-Touch-Tooltip-Wave** (D46-Migration auf restliche `title=`-Stellen)
- **Slice 242+ Watchlist-Standalone-Page** (Feature, kein Bug)
- **FM 10.2/10.3** Airdrop Personal-Score-History + Friends-Filter (braucht Skala >5 Tester)
- **Holdings-RPC-Migration** (PostgREST → SECURITY DEFINER, Performance)
- **L5-Data-Drift Backfill** (11% Players ohne perf_l5)
- **D43-M-Slice:** Live-DB-`pg_get_functiondef`-Type-Verify-Tool (analog Slice 229 Static-Variante)
- **D49-Slice 232+:** PLAYER_SELECT_COLS-Sync-Audit-Tool

## Wave-3-Tooling Backlog (CTO-autonom, niedrig prio)

- Hook-Item-Count-Validation (`ship-spec-quality-gate.sh` prüft aktuell nur Sektion-Existenz, nicht ≥-counts)
- `spec: inline` Bypass Hard-BLOCK (aktuell warn-only)

## Bei /clear oder Token-Limit Resume-Pfad

1. `worklog/active.md` (idle, **7463600c** ist HEAD)
2. `worklog/beta-phase.md` (Phase D, alle findings_open NULL, last_signoff_verdict aktualisiert 2026-04-27)
3. Diese Datei Top-Block
4. `worklog/log.md` Top 8 Eintraege (223 → 230)
5. `git log --oneline -16` zeigt komplette Session-Cascade
6. `git worktree list` (sollte nur main sein)
7. `memory/decisions.md` D51 + D52 (DISTILL 2026-04-27)
8. **Nächster sinnvoller Slice:** abhängig von Anil-Direktive — autonom-ROI ist erschöpft, was übrig ist braucht entweder Anil (Money-Path, Wire-Plans) oder Skala (>20 User für Tools wie FM 10.2/10.3).

## System-Foundation funktioniert (Slice 211-230 cumulative)

Live & autonom:
- ✅ `ship-phase-gate.sh` UserPromptSubmit-Hook warnt bei "Beta-fertig"-Claims ohne Sign-Off-PASS
- ✅ `ship-spec-quality-gate.sh` PreToolUse-Hook warnt bei Spec-Pflicht-Sektionen-Lücken
- ✅ `ship-cto-review-gate.sh` Pre-Commit-Hook blockt feat/fix ohne Reviewer-File
- ✅ `ship-phase-tracker-reminder.sh` (Slice 230 NEU) Stop-Hook reminded findings_open Update
- ✅ `scripts/audit-stale-check.ts` (Slice 223) audit-stale CI-gate
- ✅ `scripts/orphan-component-detector.ts` (Slice 228) orphan CI-gate
- ✅ `scripts/type-truth-audit.ts` (Slice 229) type-truth CI-gate
- ✅ `scripts/findings-to-slices.ts` Pipeline auto-generiert Slice-Stubs
- ✅ `/auto-beta-ready` Skill orchestriert Phase A-D-Loop
- ✅ Phase-Tracker als SoT, Hooks lesen davon

**Trial-Run-Verdict (Slice 217):** System produziert ehrliches HARD-NO-GO bei realem Stand. **Foundation lügt nicht.**

---

# Vorherige Sessions (archiviert)

# Resume-Anker (2026-04-26 — 14-Slice-Marathon + Self-Healing-Loop-Foundation)

**Wenn `/clear` oder Token-Limit:** Lese in dieser Reihenfolge:
1. `worklog/active.md` — `status: idle`, HEAD `bb5e12cb`
2. `worklog/beta-phase.md` — Phase D, last_signoff: FAIL, **alle findings_open auf 0**
3. `memory/current-sprint.md` — vollständiger Stand 2026-04-26 (Slice 208-222)
4. Diese Datei (Resume-Anker, Top-Block)
5. `git log --oneline -20` (14 Slices in einer Session)
6. `worklog/log.md` Top 14 Eintraege (208 bis 222)

## Session-End 2026-04-26 — 14 Slices in Folge, Tech-Side maximal sauber

**Anil-Direktive im Verlauf der Session:**
1. "weiter im handoff" → Slice 208 FM 6.2 Trend-Sparkline
2. "weiter" → 209 Audit-Stale-Cleanup
3. "weiter" → 210 UX 17 airdrop isError
4. **"mit der SPEC steht und fällt alles, agent soll nicht blind sein"** → Slice 211 Spec-Foundation-Uplift D50
5. "weiter" → 212 Spec-Quality-Gate-Hook
6. "A" → 213 QuickActionPills
7. **"ich höre fertig aber dem ist nicht so, System soll sich selbst heilen, autonom"** → Slice 214 Auto-Beta-Ready Self-Healing-Loop
8. "los" → 7 Background-Agents dispatched + Live-Test
9. "re run" → Slice 215 Phase-C Re-Run
10. "3" → Slice 217 Sign-Off-Trial-Run → HARD-NO-GO (System lügt nicht)
11. "ja" → Slice 216 P1-Wave-Heal (3 P1 → 0)
12. **"volle Entscheidungsgewalt, führe aus"** → Slice 218 Test-Mock-Repair, 219 Onboarding-Doc + Recruitment-Templates, 220 Smoke+Sentry+PostHog Verifies
13. "weiter" → Slice 222 P2-Bundle Reklassifizierung (alle findings_open → 0)
14. **"/done"** → Session-End

(Detail siehe vorheriger Resume-Anker — durch Slice 223+ obsoleted)

## ⚠ CRASH RECOVERY (20260505-154721)
Session crashed. State at crash time:

### Uncommitted Changes (saved as .claude/backups/crash-20260505-154721.diff)
```
 M memory/session-handoff.md
 M worklog/audits/audit-stale-2026-05-04.md
 M worklog/audits/type-truth-2026-05-04.md
```


### Recovery: Apply diff with `git apply .claude/backups/crash-20260505-154721.diff`

## ⚠ CRASH RECOVERY (20260505-154746)
Session crashed. State at crash time:

### Uncommitted Changes (saved as .claude/backups/crash-20260505-154746.diff)
```
 M memory/session-handoff.md
 M worklog/audits/audit-stale-2026-05-04.md
 M worklog/audits/type-truth-2026-05-04.md
```


### Recovery: Apply diff with `git apply .claude/backups/crash-20260505-154746.diff`

## ⚠ CRASH RECOVERY (20260505-154804)
Session crashed. State at crash time:

### Uncommitted Changes (saved as .claude/backups/crash-20260505-154804.diff)
```
 M memory/session-handoff.md
 M worklog/audits/audit-stale-2026-05-04.md
 M worklog/audits/type-truth-2026-05-04.md
```


### Recovery: Apply diff with `git apply .claude/backups/crash-20260505-154804.diff`

## ⚠ CRASH RECOVERY (20260505-154818)
Session crashed. State at crash time:

### Uncommitted Changes (saved as .claude/backups/crash-20260505-154818.diff)
```
 M memory/session-handoff.md
 M worklog/audits/audit-stale-2026-05-04.md
 M worklog/audits/type-truth-2026-05-04.md
```


### Recovery: Apply diff with `git apply .claude/backups/crash-20260505-154818.diff`

## ⚠ CRASH RECOVERY (20260505-233054)
Session crashed. State at crash time:

### Uncommitted Changes (saved as .claude/backups/crash-20260505-233054.diff)
```
 M memory/session-handoff.md
 M memory/working-memory.md
 M worklog/audits/audit-stale-2026-05-05.md
 M worklog/audits/type-truth-2026-05-05.md
```


### Recovery: Apply diff with `git apply .claude/backups/crash-20260505-233054.diff`

## ⚠ CRASH RECOVERY (20260505-233214)
Session crashed. State at crash time:

### Uncommitted Changes (saved as .claude/backups/crash-20260505-233214.diff)
```
 M memory/session-handoff.md
 M memory/working-memory.md
 M worklog/audits/audit-stale-2026-05-05.md
 M worklog/audits/type-truth-2026-05-05.md
```


### Recovery: Apply diff with `git apply .claude/backups/crash-20260505-233214.diff`

## ⚠ CRASH RECOVERY (20260505-233419)
Session crashed. State at crash time:

### Uncommitted Changes (saved as .claude/backups/crash-20260505-233419.diff)
```
 M memory/session-handoff.md
 M memory/working-memory.md
 M worklog/audits/audit-stale-2026-05-05.md
 M worklog/audits/type-truth-2026-05-05.md
```


### Recovery: Apply diff with `git apply .claude/backups/crash-20260505-233419.diff`

## ⚠ CRASH RECOVERY (20260611-185930)
Session crashed. State at crash time:

### Uncommitted Changes (saved as .claude/backups/crash-20260611-185930.diff)
```
 M memory/session-handoff.md
 M src/app/(app)/hooks/__tests__/useHomeData.test.ts
 M src/app/(app)/hooks/useHomeData.ts
 M src/app/(app)/page.tsx
 M src/app/api/players/route.ts
 M src/components/home/HomeSpotlight.tsx
 M src/components/home/LastGameweekWidget.tsx
 M src/components/home/MarktPuls.tsx
 M src/components/home/TopMoversStrip.tsx
 M src/components/home/TrendingPlayersStrip.tsx
 M src/components/home/__tests__/HomeSpotlight.test.tsx
 M src/components/home/__tests__/MarktPuls.test.tsx
 M src/components/home/__tests__/TopMoversStrip.test.tsx
 M src/components/home/__tests__/TrendingPlayersStrip.test.tsx
 M src/components/social/FollowingFeedRail.tsx
 M src/lib/queries/index.ts
 M src/lib/queries/keys.ts
 M src/lib/queries/players.ts
 M src/lib/services/players.ts
 M worklog/active.md
```


### Recovery: Apply diff with `git apply .claude/backups/crash-20260611-185930.diff`

## ⚠ CRASH RECOVERY (20260611-185931)
Session crashed. State at crash time:

### Uncommitted Changes (saved as .claude/backups/crash-20260611-185931.diff)
```
 M memory/session-handoff.md
 M src/app/(app)/hooks/__tests__/useHomeData.test.ts
 M src/app/(app)/hooks/useHomeData.ts
 M src/app/(app)/page.tsx
 M src/app/api/players/route.ts
 M src/components/home/HomeSpotlight.tsx
 M src/components/home/LastGameweekWidget.tsx
 M src/components/home/MarktPuls.tsx
 M src/components/home/TopMoversStrip.tsx
 M src/components/home/TrendingPlayersStrip.tsx
 M src/components/home/__tests__/HomeSpotlight.test.tsx
 M src/components/home/__tests__/MarktPuls.test.tsx
 M src/components/home/__tests__/TopMoversStrip.test.tsx
 M src/components/home/__tests__/TrendingPlayersStrip.test.tsx
 M src/components/social/FollowingFeedRail.tsx
 M src/lib/queries/index.ts
 M src/lib/queries/keys.ts
 M src/lib/queries/players.ts
 M src/lib/services/players.ts
 M worklog/active.md
```


### Recovery: Apply diff with `git apply .claude/backups/crash-20260611-185931.diff`

## ⚠ CRASH RECOVERY (20260612-005640)
Session crashed. State at crash time:

### Uncommitted Changes (saved as .claude/backups/crash-20260612-005640.diff)
```
 M memory/session-handoff.md
 M worklog/audits/audit-stale-2026-06-11.md
 M worklog/audits/type-truth-2026-06-11.md
?? worklog/audits/2026-06-12/
?? worklog/audits/lhci-local-282b.log
?? worklog/reviews/282b-review.md
```


### Recovery: Apply diff with `git apply .claude/backups/crash-20260612-005640.diff`

## ⚠ CRASH RECOVERY (20260612-005646)
Session crashed. State at crash time:

### Uncommitted Changes (saved as .claude/backups/crash-20260612-005646.diff)
```
 M memory/session-handoff.md
 M worklog/audits/audit-stale-2026-06-11.md
 M worklog/audits/type-truth-2026-06-11.md
?? worklog/audits/2026-06-12/
?? worklog/audits/lhci-local-282b.log
?? worklog/reviews/282b-review.md
```


### Recovery: Apply diff with `git apply .claude/backups/crash-20260612-005646.diff`

## ⚠ CRASH RECOVERY (20260612-005905)
Session crashed. State at crash time:

### Uncommitted Changes (saved as .claude/backups/crash-20260612-005905.diff)
```
 M memory/session-handoff.md
 M worklog/audits/audit-stale-2026-06-11.md
 M worklog/audits/type-truth-2026-06-11.md
?? worklog/audits/2026-06-12/
?? worklog/audits/lhci-local-282b.log
?? worklog/reviews/282b-review.md
```


### Recovery: Apply diff with `git apply .claude/backups/crash-20260612-005905.diff`

## ⚠ CRASH RECOVERY (20260612-130123)
Session crashed. State at crash time:

### Uncommitted Changes (saved as .claude/backups/crash-20260612-130123.diff)
```
 M memory/session-handoff.md
 M worklog/audits/audit-stale-2026-06-12.md
 M worklog/audits/type-truth-2026-06-12.md
```


### Recovery: Apply diff with `git apply .claude/backups/crash-20260612-130123.diff`

## ⚠ CRASH RECOVERY (20260612-130123)
Session crashed. State at crash time:

### Uncommitted Changes (saved as .claude/backups/crash-20260612-130123.diff)
```
 M memory/session-handoff.md
 M worklog/audits/audit-stale-2026-06-12.md
 M worklog/audits/type-truth-2026-06-12.md
```


### Recovery: Apply diff with `git apply .claude/backups/crash-20260612-130123.diff`

## ⚠ CRASH RECOVERY (20260612-130128)
Session crashed. State at crash time:

### Uncommitted Changes (saved as .claude/backups/crash-20260612-130128.diff)
```
 M memory/session-handoff.md
 M worklog/audits/audit-stale-2026-06-12.md
 M worklog/audits/type-truth-2026-06-12.md
```


### Recovery: Apply diff with `git apply .claude/backups/crash-20260612-130128.diff`

## ⚠ CRASH RECOVERY (20260612-170143)
Session crashed. State at crash time:

### Uncommitted Changes (saved as .claude/backups/crash-20260612-170143.diff)
```
 M memory/session-handoff.md
 M src/app/api/cron/gameweek-sync/route.ts
 M src/app/api/cron/live-score-sync/route.ts
 M src/app/api/cron/sync-fixtures-future/route.ts
 M src/components/fantasy/spieltag/FixtureCard.tsx
 M src/components/fantasy/spieltag/FixtureDetailModal.tsx
 M src/components/fantasy/spieltag/SpieltagBrowser.tsx
 M src/components/fantasy/spieltag/__tests__/FixtureCard.test.tsx
 M src/features/fantasy/services/fixtures.ts
 M src/types/index.ts
 M worklog/active.md
 M worklog/audits/audit-stale-2026-06-12.md
 M worklog/audits/type-truth-2026-06-12.md
?? src/features/fantasy/lib/
?? supabase/migrations/20260612180000_slice_284a_fixture_status_union.sql
?? worklog/specs/284a-live-lifecycle.md
```


### Recovery: Apply diff with `git apply .claude/backups/crash-20260612-170143.diff`

## ⚠ CRASH RECOVERY (20260612-170145)
Session crashed. State at crash time:

### Uncommitted Changes (saved as .claude/backups/crash-20260612-170145.diff)
```
 M memory/session-handoff.md
 M src/app/api/cron/gameweek-sync/route.ts
 M src/app/api/cron/live-score-sync/route.ts
 M src/app/api/cron/sync-fixtures-future/route.ts
 M src/components/fantasy/spieltag/FixtureCard.tsx
 M src/components/fantasy/spieltag/FixtureDetailModal.tsx
 M src/components/fantasy/spieltag/SpieltagBrowser.tsx
 M src/components/fantasy/spieltag/__tests__/FixtureCard.test.tsx
 M src/features/fantasy/services/fixtures.ts
 M src/types/index.ts
 M worklog/active.md
 M worklog/audits/audit-stale-2026-06-12.md
 M worklog/audits/type-truth-2026-06-12.md
?? src/features/fantasy/lib/
?? supabase/migrations/20260612180000_slice_284a_fixture_status_union.sql
?? worklog/specs/284a-live-lifecycle.md
```


### Recovery: Apply diff with `git apply .claude/backups/crash-20260612-170145.diff`

## ⚠ CRASH RECOVERY (20260612-175916)
Session crashed. State at crash time:

### Uncommitted Changes (saved as .claude/backups/crash-20260612-175916.diff)
```
 M memory/session-handoff.md
 M src/app/api/cron/gameweek-sync/route.ts
 M src/app/api/cron/live-score-sync/route.ts
 M src/app/api/cron/sync-fixtures-future/route.ts
 M src/components/fantasy/spieltag/FixtureCard.tsx
 M src/components/fantasy/spieltag/FixtureDetailModal.tsx
 M src/components/fantasy/spieltag/SpieltagBrowser.tsx
 M src/components/fantasy/spieltag/__tests__/FixtureCard.test.tsx
 M src/features/fantasy/services/fixtures.ts
 M src/types/index.ts
 M worklog/active.md
 M worklog/audits/audit-stale-2026-06-12.md
 M worklog/audits/type-truth-2026-06-12.md
?? src/features/fantasy/lib/
?? supabase/migrations/20260612180000_slice_284a_fixture_status_union.sql
?? worklog/specs/284a-live-lifecycle.md
```


### Recovery: Apply diff with `git apply .claude/backups/crash-20260612-175916.diff`

## ⚠ CRASH RECOVERY (20260613-003604)
Session crashed. State at crash time:

### Uncommitted Changes (saved as .claude/backups/crash-20260613-003604.diff)
```
 M memory/session-handoff.md
 M memory/working-memory.md
 M worklog/audits/audit-stale-2026-06-12.md
 M worklog/audits/type-truth-2026-06-12.md
```


### Recovery: Apply diff with `git apply .claude/backups/crash-20260613-003604.diff`

## ⚠ CRASH RECOVERY (20260613-003943)
Session crashed. State at crash time:

### Uncommitted Changes (saved as .claude/backups/crash-20260613-003943.diff)
```
 M memory/session-handoff.md
 M memory/working-memory.md
 M worklog/audits/audit-stale-2026-06-12.md
 M worklog/audits/type-truth-2026-06-12.md
```


### Recovery: Apply diff with `git apply .claude/backups/crash-20260613-003943.diff`

## ⚠ CRASH RECOVERY (20260613-110315)
Session crashed. State at crash time:

### Uncommitted Changes (saved as .claude/backups/crash-20260613-110315.diff)
```
 M memory/session-handoff.md
 M memory/working-memory.md
 M worklog/audits/audit-stale-2026-06-12.md
 M worklog/audits/type-truth-2026-06-12.md
```


### Recovery: Apply diff with `git apply .claude/backups/crash-20260613-110315.diff`

## ⚠ CRASH RECOVERY (20260613-110342)
Session crashed. State at crash time:

### Uncommitted Changes (saved as .claude/backups/crash-20260613-110342.diff)
```
 M memory/session-handoff.md
 M memory/working-memory.md
 M worklog/audits/audit-stale-2026-06-12.md
 M worklog/audits/type-truth-2026-06-12.md
```


### Recovery: Apply diff with `git apply .claude/backups/crash-20260613-110342.diff`

<!-- TR-REVIEW-PENDING-284c (2026-06-13) -->
- TR-Review offen: `market.bulkSellResult` = "{sold} satıldı, {skipped} atlandı (piyasa fiyatı yok)" · `rankings.noMarketMovement` = "Şu anda piyasa hareketi yok"
