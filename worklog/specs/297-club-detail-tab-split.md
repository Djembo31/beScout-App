# Slice 297 — Club-Detail Narrative Tab-Split (S3 F-4)

**Slice-Type:** UI
**Größe:** M
**Status:** SPEC (Mapping wartet auf Anil-Nod vor BUILD)

## 1. Problem-Statement

S3 Page Contract Audit (Slice 292) F-4 (P2): `/club/[slug]` Übersicht-Tab stapelt ~17 Module gleichgewichtig flach → „Modul-Inventar statt Narrativ". Für Demos sollte EINE klare Club-Story führen.

Evidence: `worklog/audits/2026-06-13/page-contract-fantasy-club.md` F-4. Anil-Decision 2026-06-13: **Option B — Tab-Split/Disclosure**. Übersicht auf Lead-Module eindampfen, tiefe Module in neuen „Aktivität"-Tab.

## 2. Lösungs-Design

Neuer 4. Tab **`aktivitaet`** („Aktivität"). Übersicht behält die Club-Now-Lead-Story; sekundäre/retrospektive/Info-Module wandern in den neuen Tab. **Behavior-preserving**: Daten werden weiterhin einmalig im `useClubData`-Hook am `ClubContent`-Top geladen; verschoben wird nur die JSX zwischen den `tab === X`-Render-Blöcken. Heavy-Module (RecentActivity, MostOwned, Research) mounten dadurch erst beim Öffnen des Aktivität-Tabs → Perf-Win (deferred mount).

### Proposed Module → Tab Mapping (← Anil bitte bestätigen/anpassen)

| Modul | heute | NEU | Begründung |
|-------|-------|-----|-----------|
| NextMatchCard | Übersicht | **Übersicht** | Spieltag-Lead |
| ClubStandingCard | Übersicht | **Übersicht** | Spieltag |
| Spieler-Bestand (deine) | Übersicht | **Übersicht** | Personal hook („dein Anteil am Club") |
| ActiveOffersSection (Angebote) | Übersicht | **Übersicht** | Markt-Lead |
| SquadPreviewSection (Trending) | Übersicht | **Übersicht** | Markt |
| MitmachenSection | Übersicht | **Übersicht** | Community-Lead |
| ClubEventsSection | Übersicht | **Übersicht** | Community (pairt mit Mitmachen) |
| MembershipSection | Übersicht | **Übersicht** | Club-Beziehung |
| — | | **= 8 Übersicht** | (von 17 → 8) |
| ClubFixturesStrip (FDR 5 GW) | Übersicht | **Aktivität** | Power-User-Tool, sekundär |
| LastResultsCard | Übersicht | **Aktivität** | Retrospektiv |
| MostOwnedSection | Übersicht | **Aktivität** | Markt-Detail |
| RecentActivitySection (Trades) | Übersicht | **Aktivität** | Markt-Aktivität |
| FanRankOverview | Übersicht | **Aktivität** | Gamification-Detail |
| Club-Neuigkeiten (News) | Übersicht | **Aktivität** | Info |
| Club Research | Übersicht | **Aktivität** | Markt-Detail |
| Club Info | Übersicht | **Aktivität** | Info |
| FeatureShowcase | Übersicht | **Aktivität** | Onboarding/Marketing, nicht Core-Story |
| — | | **= 9 Aktivität** | |

Hero / StatsBar / FanRankBadge / TabBar bleiben über allen Tabs (unverändert). `spieler` + `spielplan` Tabs unverändert.

**Offene Mapping-Frage an Anil:** FeatureShowcase + FanRankOverview könnten auch in Übersicht bleiben (Engagement-Hooks). Default oben = Aktivität. ClubFixturesStrip + LastResultsCard könnten alternativ in den bestehenden `spielplan`-Tab (fixture-thematisch) statt Aktivität — Default oben = Aktivität, um nur 1 Tab-Block-Paar zu berühren.

## 3. Betroffene Files

| File | Änderung |
|------|----------|
| `src/components/club/hooks/types.ts` | `ClubTab` += `'aktivitaet'` |
| `src/app/(app)/club/[slug]/ClubContent.tsx` | TABS += aktivitaet; 9 Module aus `tab==='uebersicht'`-Block in neuen `tab==='aktivitaet'`-Block verschieben; RevealSection-Delays neu vergeben |
| `messages/de.json` + `messages/tr.json` | `club.tabs.activity` Label (DE „Aktivität" / TR „Etkinlik") |
| `src/app/(app)/club/[slug]/__tests__/ClubContent.test.tsx` | Tests die Modul-Presence in Übersicht asserten → an neue Tab-Zuordnung anpassen; +Test dass Aktivität-Tab die verschobenen Module rendert |

## 4. Code-Reading-Liste (vor Implementation)

| File | Frage |
|------|-------|
| `ClubContent.tsx:83-87` | TABS-Konstante — Label-i18n-Key-Konvention (`overview`/`players`/`fixtures` → `t(tab.label)`, ns `club.tabs`?) |
| `ClubContent.tsx:322-545` | Exakte JSX-Grenzen jedes der 17 Module + welche conditional-gerendert sind (`{x && (`) |
| `ClubContent.tsx:546-647` | spieler + spielplan Tab-Blöcke (Muster für neuen Block) |
| `ClubContent.test.tsx` | Welche Tests asserten Modul-Presence + auf welchem Tab (TabBar-Klick-Mechanik im Test) |
| `src/components/club/TabBar` (o.ä.) | Rendert TabBar beliebig viele Tabs? Mobile-Overflow (`flex-shrink-0`+scroll, ui-components.md) bei 4 Tabs? |
| i18n `club.tabs.*` | Bestehende Tab-Label-Keys (Namespace prüfen) |

## 5. Pattern-References

- `errors-frontend.md` „Missing i18n-Key bei neuer CTA" (Slice 198) — neuer Tab-Label-Key MUSS DE+TR.
- `ui-components.md` „Mobile Tab-Bars" — `flex-shrink-0`, scroll, max ~5 chars/Label; bei 4 Tabs Mobile-Overflow prüfen (393px).
- `errors-frontend.md` „Derived-Loading / TanStack" — n/a (kein neuer Query), aber heavy-Module deferred mount = Perf-Win dokumentieren.
- `business.md` — Tab-Label „Aktivität"/„Etkinlik" compliance-neutral; Module-Inhalte unverändert (kein neuer Wording-Surface).

## 6. Acceptance Criteria

| # | Kriterium | VERIFY |
|---|-----------|--------|
| AC-1 | `ClubTab` Type kennt `'aktivitaet'`; TABS rendert 4 Tabs | tsc + grep |
| AC-2 | Übersicht-Tab rendert nur die 8 Lead-Module (verschobene absent) | vitest ClubContent.test |
| AC-3 | Aktivität-Tab rendert die 9 verschobenen Module | vitest |
| AC-4 | Tab-Label `club.tabs.activity` in DE + TR vorhanden | grep messages |
| AC-5 | Mobile 393px: 4 Tabs ohne horizontalen Overflow | qa-visual/Playwright bescout.net post-Deploy |
| AC-6 | tsc clean + bestehende ClubContent-Tests grün | vitest + tsc |
| AC-7 | Kein Daten-Loading-Change (useClubData unverändert) | git diff Review |

## 7. Edge Cases

| Case | Erwartung |
|------|-----------|
| Conditional Module (z.B. ClubStandingCard nur wenn standing) | Conditional-Logik mitwandern, nicht entfernen |
| Tab-Deep-Link / URL-Param | Prüfen ob Tab via URL-Param ansteuerbar (testing.md „Deep-Link Tab-Params NIE raten") — falls ja, `aktivitaet` ergänzen |
| Leerer Aktivität-Tab (alle conditional-Module leer) | EmptyState? oder leer-OK? → Default: einzelne Module self-handle (keine, wenn keine Daten); Tab kann leer wirken → Mapping enthält immer ≥1 unbedingtes Modul (Club Info ist quasi-immer da) |
| RevealSection-Delays | Pro Tab neu ab 0 staffeln (sonst 500ms-Delay auf Aktivität-Tab = später Reveal) |
| TabBar Mobile 4 Tabs | Labels kurz halten („Aktivität" 9 chars — grenzwertig; ggf. „Mehr" erwägen) |

## 8. Self-Verification

```bash
pnpm exec vitest run "src/app/(app)/club/[slug]/__tests__/ClubContent.test.tsx"
pnpm exec tsc --noEmit
grep -n "activity\|aktivitaet" messages/de.json messages/tr.json
# Mobile: Playwright /club/<slug> @ 393px post-Deploy
```

## 9. Open-Questions

- **Pflicht-Klärung (Anil):** Mapping-Tabelle §2 bestätigen (v.a. FeatureShowcase/FanRank Übersicht-vs-Aktivität; FDR/LastResults Aktivität-vs-spielplan). Tab-Label „Aktivität" vs „Mehr" (Mobile-Länge).
- **Autonom-Zone (CTO):** RevealSection-Delay-Staffelung, Test-Struktur, exakte JSX-Verschiebung.

## 10. Proof-Plan

`worklog/proofs/297-club-tab-split.txt` — vitest (ClubContent grün inkl. neue Aktivität-Tab-Tests), tsc 0, grep i18n; + Playwright-Screenshot /club/<slug> 393px (4 Tabs, kein Overflow) post-Deploy.

## 11. Scope-Out

- Kein neuer „Club Now"-Selector (das war Option A — verworfen).
- Keine inhaltlichen Modul-Änderungen (nur Verschieben + Reorder).
- Kein Daten-Loading-Refactor.
- spieler/spielplan-Tabs unverändert (außer evtl. FDR/LastResults falls Anil dorthin will).

## 12. Stage-Chain (geplant)

SPEC → IMPACT (skipped — UI-Reorder + Type + i18n, kein Service/RPC/Schema/Query-Key; useClubData unverändert) → BUILD → REVIEW (reviewer-Agent) → PROVE (vitest + tsc + Mobile-Screenshot) → LOG.

## 13. Pre-Mortem (M)

1. Bestehende ClubContent-Tests asserten Module in Übersicht → brechen beim Verschieben. Mitigation: Test-Update Teil des BUILD, AC-2/AC-3 lock neue Zuordnung.
2. RevealSection-Delays nicht neu gestaffelt → Aktivität-Module mit 500ms-Delay = träger Reveal. Mitigation: pro Tab ab 0.
3. Mobile 4-Tab-Overflow @ 393px → „Aktivität" zu lang. Mitigation: Label-Länge prüfen, ggf. „Mehr"; qa-visual.
4. Conditional-Module-Logik beim Verschieben verloren (z.B. `clubId &&`) → Crash/Ghost. Mitigation: ganze conditional-Wrapper mitnehmen, nicht nur inneres JSX.
5. Tab-URL-Deep-Link nicht erweitert → `?tab=aktivitaet` 404/fallback. Mitigation: Code-Reading prüft Deep-Link-Mechanik.
6. i18n-Key fehlt in TR → TR-User sieht DE-Label/Key-Leak. Mitigation: AC-4 + business.md-Pattern.
