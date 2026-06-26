# Review — Slice 399 (E-4b Teil 2: User-Events fertig)

**Reviewer:** reviewer-Agent (Cold-Context) · 2026-06-26 · time-spent: 14 min
**Verdict: PASS** (3 NITs, kein Merge-Blocker)

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | NIT | `useCancelUserEvent.ts:50,55` | `invalidateWallet(qc)` in onSuccess UND onSettled (redundant, idempotent). | **Bewusst belassen** — spiegelt exakt `useCreateUserEvent` (397); onSettled sichert Wallet-Refresh auch im Reject-Fall. Konsistenz > Mikro-Optimierung. |
| 2 | NIT | `EventDetailModal.tsx` handleCancelUserEvent | `onReset(event)` als Refetch-Trigger zweckentfremdet (eigentlich Scoring-Reset-Callback). | Kommentar vorhanden; eigener Callback = optionaler Folge-Refactor. Akzeptiert. |
| 3 | NIT | `AdminEventFeesSection.tsx:18` | `creator`-Zeile bleibt in TYPE_META (deprecated). | Scope-Out E-7 (Spec §11), 0 creator-Events. OK. |

## One-Line
Ja — ein Senior merged das: Cancel-Gate fail-safe, Money-Pfad (S371-Wallet-Invalidate + S393-Reject-Mapping + useSafeMutation-Race-Guard) sauber, F2/F3-Currency-Fix vollständig, i18n DE+TR paritätisch; nur kosmetische Nits.

## Fokus-Checks (alle PASS)
1. **Cancel-Gate** `type==='user' && createdBy===userId && status∈{registering,late-reg}` — exakt Spec; fail-safe (createdBy null → versteckt). Club/Fremd/laufend → kein Button. RPC = 2. Netz.
2. **F2/F3** 🎟-Chip in EventCardView + EventDetailHeader nur bei `currency==='tickets'`; Scout-Kosten via formatEventCost (CR). club/sponsor/bescout/special unverändert.
3. **Discovery-Swap** creator→user in beiden CATEGORIES; counts-Maps exhaustiv (Record<EventType> mit creator+user); getTypeStyle('user') vorhanden; eventCategories.user DE+TR.
4. **S200** min_entries in 3 Select-Listen + DbEvent + Mapper + FantasyEvent; /api/events `select('*')`.
5. **S371** useCancelUserEvent invalidiert qk.wallet.all (Refund→locked_balance).
6. **i18n** neue Keys DE+TR paritätisch; Reject-Codes in errors-NS + KNOWN_KEYS; business.md-konform.
7. **Mobile/A11y** Cancel-Button + Admin-Input min-h-44px, inputMode numeric, aria, preventClose.

## Positives
- S393 mustergültig (Service wirft Code → Hook resolved via te(mapErrorToKey)).
- useSafeMutation-Doppelguard → Money-Race E8 dicht.
- Soft-Return-Pattern konsistent mit cancelEventEntries/createUserEvent.
- counts-Map-Exhaustivität bewusst beibehalten (gradueller E-7-Cleanup).

## Knowledge
Kein neues Fehler-Pattern. Bestätigt S397/398 (dormanten Pfad → Live-Render-Console-Scan). LOG: fantasy.md User-Event-Discovery-Note ergänzen (geplant §12).
