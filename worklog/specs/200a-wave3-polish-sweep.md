# Slice 200a — Wave 3 Polish-Sweep (Frontend-only)

**Status:** active
**Groesse:** S (5 Files, 4 Domains, sequenziell)
**Scope:** CTO (Frontend-only, kein Money, kein Schema, kein RPC)
**Estimated:** ~3h

## Ziel

5 Frontend-only Polish-Findings aus Phase-A-Audits schliessen — alle ohne Backend-Touch, ohne Money-Path, ohne neue RPCs/Migrations. Reine UX-Politur.

## Punch-Liste-Items (5)

| # | Domain | Finding | File |
|---|---|---|---|
| UX-2 | UX-States P2 | Buy-Error-Banner ohne auto-dismiss (verschwindet nicht von selbst) | `BuyConfirmModal.tsx` (oder Equivalent) |
| FM-7.1 | FM-Mechanics P2 | MissionBanner User-Filter `Active/Completed/All` fehlt — Visual-Noise | `src/components/missions/MissionBanner.tsx` |
| FM-7.2 | FM-Mechanics P2 | Weekly-Mission Reset-Countdown fehlt (Sorare/FPL-Pattern: "Refreshes in 2d 14h") | `src/components/missions/MissionBanner.tsx` oder `src/app/(app)/missions/page.tsx` |
| FM-8.1 | FM-Mechanics P2 | Inventory Sort by Effect-Magnitude fehlt (aktuell: rank_desc/asc/recent) | `src/components/inventory/EquipmentSection.tsx` |
| FM-9.2 | FM-Mechanics P2 | Founding "Last X left at tier"-Urgency-Color fehlt — kein FOMO-Trigger bei `limit-sold < 10%` | `src/app/(app)/founding/page.tsx` |

## Betroffene Files (geschaetzt)

- `src/components/missions/MissionBanner.tsx` (FM-7.1 + FM-7.2)
- `src/app/(app)/missions/page.tsx` (eventuell FM-7.2 wenn Page-Level passt)
- `src/components/inventory/EquipmentSection.tsx` (FM-8.1)
- `src/app/(app)/founding/page.tsx` (FM-9.2)
- `src/components/market/BuyConfirmModal.tsx` (UX-2 — exakter File via grep zu verifizieren)
- `messages/de.json` + `messages/tr.json` (i18n-Keys fuer Filter-Toggle, Countdown-Label, Sort-Label, Urgency-Status)

## Acceptance Criteria

1. **UX-2:** Error-Banner in Buy-Modal verschwindet automatisch nach 5 Sekunden via `useEffect` Timer; manueller Dismiss bleibt moeglich.
2. **FM-7.1:** MissionBanner zeigt 3-Toggle-Filter `All | Active | Completed` (i18n-Key); aktive Missions = `status='active'`, Completed = `status IN ('completed', 'claimed')`. Filter persists nicht (in-session State only).
3. **FM-7.2:** MissionBanner Header zeigt Weekly-Reset-Countdown via existing `CountdownLabel` Component; Reset-Zeitpunkt = naechster Sonntag 23:59:59 lokale TZ (oder DB-`reset_at` falls vorhanden).
4. **FM-8.1:** EquipmentSection neuer Sort `effect_desc` mit Label "Effekt-Stärke" (DE) / "Etki Gücü" (TR); sortiert nach `definition.rank.multiplier` der Top-Rank pro Group, fallback rank.
5. **FM-9.2:** Founding TierCard zeigt `text-orange-400` wenn `(limit - sold) / limit < 0.1` UND `limit - sold > 0`; bei `limit - sold === 0` weiterhin "Sold out". CSS-Klasse via cn-conditional, NICHT inline-style.
6. tsc clean.
7. Bestehende Vitest-Tests gruen.
8. DE+TR-i18n-Keys vollstaendig (audit `grep`-Pattern aus errors-frontend.md "Missing i18n-Key bei neuer CTA-Component").

## Edge Cases

- **UX-2:** Re-trigger eines Errors waehrend Timer laeuft → reset Timer auf 5s.
- **FM-7.1:** Filter auf "Completed" + 0 abgeholte Missions → Empty-State "Noch keine abgeschlossen" mit i18n.
- **FM-7.2:** Sonntag 23:00 → Countdown zeigt < 1 Stunde (Sekunden-Format via existing CountdownLabel-Adaptive).
- **FM-7.2:** User mit 0 weekly missions → Countdown nicht rendern (kein leerer Counter).
- **FM-8.1:** Equipment ohne Definitions-Match (orphan) → ans Ende sortieren, nicht crashen.
- **FM-9.2:** Tier mit `limit === 0` (unbegrenzt) → keine Urgency-Color triggern.
- **FM-9.2:** Mobile 393px → Tier-Card-Layout darf nicht wrappen wegen orange-Color.

## Proof-Plan

| Item | Proof |
|---|---|
| Alle | `npx tsc --noEmit` Output → `worklog/proofs/200a-tsc.txt` |
| UX-2 | Manueller useEffect-Timer-Code-Review; Vitest falls Component-Test existiert |
| FM-7.1 | Playwright Screenshot `/missions` mit Filter-Toggle → `worklog/proofs/200a-mission-filter.png` |
| FM-7.2 | Screenshot Header mit Countdown → `worklog/proofs/200a-weekly-countdown.png` |
| FM-8.1 | Screenshot `/inventory` mit Sort-Dropdown → `worklog/proofs/200a-inventory-sort.png` |
| FM-9.2 | Screenshot `/founding` mit niedriger Tier-Verfuegbarkeit (oder DB-MOCK falls keine Tier <10% available) → `worklog/proofs/200a-founding-urgency.png` |

Wenn Playwright-Screenshots nicht laufen (Vercel-Auth, etc.), alternative: Code-Diff + tsc-Output reicht als Proof fuer Frontend-only-Pure-CSS/State-Polish.

## Scope-Out (NICHT in diesem Slice)

- **FM-6.1** Per-Trade-Player-Link in Transactions (braucht trades-join, semi-Backend → Slice 201)
- **FM-4.3** Holders-Distribution-Mini-Bar (braucht Aggregat-RPC oder Live-Holders-Count → Slice 200/201)
- **M-01** Mission-Hints kontextabhaengig (braucht neue Mission-Definitions im DB-Catalog → Slice 201)
- **UX-20** MembershipSection Subscribe-Confirm (Money-Path → CEO-scope)
- **FM 4.5** Bulk-Buy /market (Money-Complexity → eigene Slice)
- Brand P3 Detail-Drifts → Post-Beta
- Restliche FM P2 ohne Backend (4.2 Trending Pills, 5.2 Differential-Sentiment, 9.3 Per-Tier-Tabelle, 10.x Airdrop-History)

## Build-Order

1. UX-2 Buy-Error-Banner auto-dismiss (~30 min, einfachster useEffect)
2. FM-9.2 Founding Urgency-Color (~30 min, conditional className)
3. FM-7.1 MissionBanner Filter (~45 min, useState + filter logic)
4. FM-7.2 Weekly-Reset-Countdown (~30 min, CountdownLabel reuse + date-math)
5. FM-8.1 Inventory Sort effect-magnitude (~45 min, neuer SortMode + sort-fn)
6. tsc + i18n-audit + Reviewer-Agent

Sequenziell als 1 lokaler-Claude-Run (kein Worktree-Dispatch). Begründung: Scope klein, Items nicht orthogonal genug fuer Track-Splitting, sequenziell vermeidet Worktree-Awareness-Trap (D45) und erlaubt sauberes inkrementelles tsc.

## Punch-Liste-Update nach Slice 200a

63/98 → **68/98 closed (~69%)**

## Risk-Assessment

- **Low:** Alle Items pure UI/State, kein DB, kein Money. Worst-case: tsc-Errors + Healer.
- **i18n-Risk:** 4 neue Toggle-Labels + 1 Countdown-Label + 1 Sort-Label + 1 Urgency-Status — DE+TR pflicht. Hardcoded-DE-Anti-Pattern aus errors-frontend.md aktiv beachten.
- **Reviewer-Pflicht:** S-Slice → reviewer-Agent nach BUILD obligatorisch.

## Decision: Single-Track vs Multi-Track

**Single-Track (gewählt):** 5 Items, ~3h, sequenziell durch lokal Claude. Vorteile:
- Vermeidet Worktree-Awareness-Trap (D45) bei kleinem Scope
- Inkrementelles tsc nach jedem File
- Keine forbidden-file-Locks-Verwaltung
- Reviewer-Agent kriegt klares git-diff
- Bei Fehler → kein Worktree-Cleanup-Aufwand

Multi-Track wäre Overhead bei 5 unabhängigen Items in 4 Files.
