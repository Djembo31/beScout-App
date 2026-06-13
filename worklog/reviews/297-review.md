# Slice 297 Review — Club-Detail Narrative Tab-Split (S3 F-4)

**Reviewer:** reviewer-Agent (cold-context) · **time-spent:** 11 min
**Verdict:** ✅ PASS

## Spec-Coverage
- [x] AC-1 `ClubTab += 'mehr'`; 4 Tabs in TABS
- [x] AC-2 Übersicht 17→8 Lead-Module; verschobene absent
- [x] AC-3 Mehr-Tab rendert 6 sekundäre Module; Spielplan +FDR+LastResults
- [x] AC-4 `club.more` DE „Mehr" (2385) + TR „Daha" (2385)
- [x] AC-6 tsc 0, 17 Tests grün
- [x] AC-7 kein Daten-Loading-Change (useClubData untouched, pure JSX-Move)
- [~] AC-5 Mobile 393px 4-Tab: TabBar hat `overflow-x-auto scrollbar-hide` + `flex-shrink-0` + `whitespace-nowrap`, Labels kurz. Strukturell verifiziert; Live-Playshot = post-Deploy PROVE-Step.

Tab-Name `mehr`/„Mehr" statt spec-`aktivitaet` = Anil-approved Refinement (Spec flaggte „Aktivität" 9-chars als mobile-grenzwertig, bot „Mehr" als Fallback).

## Module-Accounting (nichts gedroppt)
Alle 13 Section-Components in genau einem Tab. Conditional-Wrapper auf jedem verschobenen Modul erhalten (`clubId &&`, `userId &&`, `.length>0`, `clubStanding &&`, `userClubDpc>0`).

## Findings
| # | Severity | Issue | Resolution |
|---|----------|-------|------------|
| 1 | INFO (pre-existing, out-of-scope) | `PlayerIdentity`/`SquadOverviewWidget`/`FixtureRow`/`SeasonSummary` imported but never rendered in ClubContent.tsx — pre-existing orphan imports, NICHT von Slice 297 eingeführt | Noted für separaten Cleanup-Slice (Pattern-Familie Slice 280 „Existenz ≠ Verwendung"). Nicht in diesem Scope. |

## Key-Deviation Assessment (beide SOUND)
1. **FeatureShowcase bleibt Übersicht** (statt Mehr): gated `showFeatureShowcase = emptySections >= 2` = thin-Club-Onboarding-Fallback, gerendert *statt* Mitmachen/Events-Cluster via Ternary. In Secondary-Tab verschieben würde Onboarding-Rolle zerstören (thin-Club-Lead-Tab verlöre einzige Community-Surface). Inline-Kommentar dokumentiert. Kein Regression — thin-Club-Übersicht hat NextMatch+Offers+SquadPreview+FeatureShowcase+Membership.
2. **RecentActivity unconditional in Mehr** (aus Ternary-else gelöst): `RecentActivitySection` hat internen `if (trades.length === 0) return null` → self-suppress bei leer. Kein Ghost/Empty-Card.

## Tests (non-tautological)
„keeps secondary OUT of overview" seedet *non-empty* recentTrades (würde rendern wenn fehl-platziert) → assertet Absence in Overview; Mehr-Test klickt `tab-mehr` → assertet Presence. Test 12 splittet FanRankBadge (Header, immer) von FanRankOverview (Mehr). `MostOwnedSection` unmocked aber returnt null bei empty + nie assertet → keine vacuous Assertion. testing.md-konform (`fireEvent.click` Tab-Switch, kein resetModules, static imports).

## RevealSection-Delays
Pro Tab ab 0 re-gestaffelt (Übersicht 0–175, Spielplan 0–50, Mehr 0–125). Kein leftover-500ms; deferred-mount Perf-Win erhalten.

## Positive
- Behavior-preserving: 0 useClubData-Change, reine JSX-Relocation.
- Beide Deviations mit Inline-Kommentar begründet.
- Self-suppress-empty auf verschobenen Modulen → kein „oddly-empty Mehr-Tab".
- Deep-Link Edge-Case korrekt N/A (Tab ist lokaler useState, kein URL-Param).
