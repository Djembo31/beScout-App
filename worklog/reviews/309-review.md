# CTO Review — Slice 309: Kader L5-Pill aus FormBars ableiten (Player-#3, Option A)

**Verdict: PASS** · time-spent ~14 min · Cold-Context Reviewer-Agent (a3b91348980fd1df1)

## Spec-Coverage
- [x] `deriveL5FromRecentScores` pure Helper (index.tsx) — `LEAST(100, ROUND(avg(non-null)))` + Fallback
- [x] L5-Circle (Z.280) auf derivedL5
- [x] PerfPills l5-Prop Desktop (Z.80) + Mobile (Z.92) auf derivedL5; L15 unverändert
- [x] Sort bleibt perf.l5 + Doc-Kommentar
- [x] 5 neue Unit-Tests (gegen Live-Daten), tsc clean, 27/27

## Findings

| # | Severity | Location | Issue | Status |
|---|----------|----------|-------|--------|
| 1 | INFO | index.tsx Doc + cron_recalc_perf | Window-Semantik-Divergenz: Cron mittelt letzte 5 *existierende* pgs-Rows (skippt DNP-Gaps); derivedL5 mittelt played-Slots *innerhalb* des letzten-5-Liga-GW-Fensters (Slice 274). Für lückenlose Stammspieler identisch; bei DNP-Lücken bewusst an die sichtbaren Bars gekoppelt (= der Punkt des Slices). Doc-Kommentar „spiegelt exakt" gilt nur lückenlos. | **GEFIXT** — Kommentar präzisiert (in-slice). |
| 2 | NITPICK | KaderPlayerRow.tsx:280 | matches===0 → Circle „—"; derivedL5 hätte ohnehin Fallback geliefert. Konsistent. | kein Change |
| 3 | NITPICK | index.tsx | fmtPerfL5 Math.round auf bereits-gecappten Integer = idempotent. | kein Change |

## 7-Fragen-Detail (alle ✅)
1. **Skala (kein /1.5):** ✅ `Math.min(100, Math.round(avg))` == `LEAST(100, ROUND(AVG))`. Live-SQL P1-P8 bestätigt, /1.5-Spalte 18-25 daneben → widerlegt. D77 via pg_get_functiondef sauber.
2. **DNP/null:** ✅ null gefiltert (Type-Guard `s is number`, kein `!=0`-Falle), score=0-Cameo zählt mit — konsistent über Cron / RPC-Contract / FormBars-Render. AC-2 deckt beide Achsen.
3. **Fallback:** ✅ undefined/all-null → p.perf.l5 (kein Flash, kein silent-fail). Vermeidet Slice-265-Falle bewusst (strict `length===0`, kein truthy-Falsy auf T|null).
4. **Interner Widerspruch:** ✅ Circle + PerfPills Desktop+Mobile alle aus einem derivedL5. L15 korrekt unverändert.
5. **Sort:** ✅ bewusst perf.l5 + dokumentiert. Akzeptable Divergenz.
6. **Helper+Tests:** ✅ pure, testbar; full/cameo/null/fallback/cap-100 abgedeckt; gegen echte Live-Sample-Daten.
7. **Blindspots:** ✅ memo intakt (derivedL5 intern berechnet, kein neuer instabiler Prop), Type-Safety sauber, keine i18n-Änderung.

## Positive
- Live-Formel-Verifikation gegen Prod statt Doc-Vertrauen (D77, fängt „stale Doc lügt"-Klasse Slice 303/306).
- Slice-265-Falle bewusst umgangen (strict equality).
- Helper in index.tsx → wiederverwendbar für /market falls dort gleicher Widerspruch.
- Cameo-Semantik (0 zählt, null filtert) über 3 Layer konsistent — der schwierigste Teil, sauber.

## Learnings
- **patterns.md-Kandidat:** „Display-Skalar aus derselben Quelle ableiten wie die begleitende Visualisierung" (Sibling Slice 273 Snapshot-Drift, Slice 270/271 Aggregat-Window-Drift).
- **Doc-Hygiene:** `fantasy.md` `/1.5`-Behauptung stale (D77) → separater Doc-Fix-Hinweis im LOG.
