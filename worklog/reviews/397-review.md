# Review — Slice 397 (E-4b: User-Events Builder-UI verkabeln)

**Reviewer:** Cold-Context reviewer-Agent (2026-06-26). Read-only.
**Verdict: PASS** (3 NIT, keiner merge-blockierend; NIT#1 in der Folge geheilt).

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | NIT | `CreateEventModal.tsx` Eintritt-Feld | Feld akzeptiert Nachkomma-Credits (10.5 → 1050 cents). Kein Bug (RPC nimmt jeden bigint≥0), aber semantisch unsauber. | `step={1}` + `Math.floor` vor ×100. **→ GEHEILT (Build-Nachzug).** |
| 2 | NIT | `useCreateUserEvent.ts:70-72` | `onSettled` ruft `invalidateWallet` zusätzlich zu `onSuccess` — doppelt bei Erfolg (harmlos, Query-Key-dedup; defensiv für Fehlerfall). | Belassen — defensive Redundanz ok. |
| 3 | NIT | `CreateEventModal.tsx` gameweek-Stepper | `min={defaultGameweek}` / `max={38}` hart (konsistent fantasy.md). | Kein Issue. |

## One-Line
Ja — ein Senior merged das: Money-Pfad (cents-Umrechnung an EINER Stelle, korrekte RPC-Param-Reihenfolge, S371-Wallet-Invalidate), Compliance-Entkopplung exakt auf `type==='user'`, alle 11 Reject-Codes DE+TR, Typ-Union sauber tsc-forced — keine kritischen Blindspots.

## Belege (Review-Fokus)
1. **Money (×100) PASS** — Single-Point `Math.round(entryFeeCredits*100)` im Modal; Service mappt `p_entry_fee` 1:1; RPC speichert als `entry_fee`+`ticket_cost` (kein zweites ×100); Param-Reihenfolge deckt sich exakt mit functiondef; `p_lineup_rules` bewusst weggelassen → Default NULL.
2. **S371 PASS** — Hook: bust → `invalidateQueries(qk.events.all)` → `invalidateWallet`. Erstell-Gebühr belastet Wallet → Header sofort frisch.
3. **Entkopplung PASS** — `(event.type === 'user' || PAID_FANTASY_ENABLED)` — auf type verankert, nicht currency. Club/Sponsor-Scout bleiben versteckt. Disclaimer auf Money-Schritt.
4. **Wording PASS** — „Top-Platzierung erhält alles" (nicht „Gewinner"), „Reward-Pool"/„teilen" (nicht „Preisgeld"/„gewinnen"), TR kein `kazan*`. Kein Investment/Rendite.
5. **S393 PASS** — 11 Codes in KNOWN_KEYS + DE/TR errors; 4 via ERROR_MAP (`auth_uid_mismatch`→notAuthenticated, `insufficient_balance`→insufficientBalance, `event_not_found`→eventNotFound, `not_authorized`→permissionDenied). Kein `'generic'`.
6. **Typ-Union PASS** — EventType + DbEvent.type erweitert; Records getTypeStyle/EventScopeBadge/EventCategoryCards/EventBrowser gepflegt; Mapper-Pass-through tsc-valide. (DbEvent.type hat 'user' aber nicht 'creator' = gewollt.)
7. **Modal-Pattern PASS** — `preventClose={isPending}`, `inputMode="numeric"`, datetime-local>now-Guard, min≤max-Guard, Reward-Presets (Summe=100), Loader2 + motion-reduce, Submit disabled bei name<3.
8. **Sonstige** — `useSafeMutation` Doppel-Klick-Guard, kein silent fail (bust .catch), kein stale closure.

## Positive
- Money-Konvertierung diszipliniert an EINER Stelle (Pre-Mortem #4).
- Compliance-Entkopplung minimal-invasiv (CEO-Direktive exakt umgesetzt).
- Reward-Presets eliminieren `reward_structure_not_100` (Karpathy-Minimalismus).

## Learnings
Keine neue Fehlerklasse — wendet S371/S393/S330-359 korrekt an. Kein errors-*.md-Update nötig.

## time-spent
~14 min.

## Offen (PROVE)
Live-Playwright AC-2/3/5 DB-Reconcile steht noch aus — vor LOG einlösen.
