# Slice 018 — Public-Profile Holdings Fetch-Gate (Slice 014 follow-up)

## Ziel

`useProfileData.ts:91` macht aktuell eager `getHoldings(targetUserId)` auch wenn `isSelf=false`. Seit Slice 014 (Holdings RLS tightened) liefert die Query in diesem Fall immer `[]` — reine Network-Call-Verschwendung.

Fix: Pattern-Match wie `getMyPayouts` (Zeile 99) — `isSelf ? getHoldings(targetUserId) : Promise.resolve([])`.

## Hintergrund

- Slice 014 (2026-04-17) haertete `holdings` RLS: SELECT nur fuer own + Club-Admin + Platform-Admin.
- Fuer Non-Admin Public-Profile-Views liefert `getHoldings(otherUserId)` jetzt `[]`.
- `useProfileData.ts` mountet trotzdem die Query bei jedem Profile-Visit (eager-fetch-waste).
- Portfolio-Tab ist eh `isSelf`-only (laut `.claude/rules/profile.md`), Public sieht nie Holdings.

## Betroffene Files

| File | Aenderung |
|------|-----------|
| `src/components/profile/hooks/useProfileData.ts` | Line 91 — `getHoldings(targetUserId)` → `isSelf ? getHoldings(targetUserId) : Promise.resolve([])` |

## Acceptance Criteria

1. Auf Public-Profile (`isSelf=false`) laeuft KEIN `getHoldings`-Network-Call mehr.
2. Auf eigenem Profile (`isSelf=true`) bleibt Verhalten unveraendert.
3. `useProfileData` return-shape unveraendert — `holdings` bleibt `HoldingRow[]`, leer bei Public.
4. Portfolio-Aggregationen (`portfolioValueCents`, `portfolioCostCents`, `portfolioPnlPct`) sind auf `isSelf`-only gated (im UI), daher Wert 0 fuer Public unproblematisch.
5. `npx tsc --noEmit` clean.
6. `npx vitest run src/components/profile/` gruen.

## Edge Cases

1. **Self-Visit mit 0 Holdings** — unveraendert, `holdings=[]`.
2. **Public-Visit** — `holdings=[]` sofort, kein RLS-return-empty-Round-Trip.
3. **Self → Public Transition** (Route-Change) — `useEffect` deps include `isSelf`, re-runs mit neuem Gate.
4. **Admin-Visit auf fremdes Profil** — Admin ist Non-Self, `getHoldings` wird nicht gecallt. Admin sieht auch bei RLS-Privileg keine Holdings (weil die Query nicht feuert). Das ist **acceptable**: Portfolio-Tab ist UI-seitig self-only, Admin-Oversight erfolgt ueber Admin-Panel, nicht Profile-Page. Kein Regression vs. pre-014.
5. **Client mit falschem isSelf-State** — untypical, isSelf kommt von Prop, nicht State.

## Proof-Plan

- `worklog/proofs/018-diff.txt` — 1-Zeilen-diff
- `worklog/proofs/018-tsc.txt` — leer
- `worklog/proofs/018-tests.txt` — profile-Tests gruen

## Scope-Out

- Keine Aenderung an Service, Typ, RLS.
- Keine Aenderung an Admin-Workflow.
- Research/Trades/Fantasy-Queries (alle in `allSettled` in Zeile 95-98) bleiben initial — RLS dort ist lax (public), kein Fetch-Waste.

## Slice-Klassifikation

- **Groesse:** XS (1-Zeilen-Change)
- **CEO-Scope:** CTO-autonom (Performance-Optimierung, keine Verhaltensaenderung)
- **Risiko:** Nahezu null
