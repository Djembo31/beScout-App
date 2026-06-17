# Review — Slice 331: Events ans Treasury (Voll-Reconcile, type='club')

Reviewer: Cold-Context-Agent · 2026-06-17 · time-spent: 18 min

## Verdict: CONCERNS → Finding #1 geheilt → effektiv PASS

Trigger-zentrische Umsetzung, zero-sum-bewiesen über alle Lebenszyklus-Pfade. 1 MAJOR (latent Money) gefunden + **in-session gefixt**, Rest MINOR/NIT (akzeptiert).

## Findings

| # | Severity | Location | Issue | Status |
|---|----------|----------|-------|--------|
| 1 | MAJOR (latent Money) | events.mutations.ts EDITABLE_FIELDS | `prize_pool` (registering/late-reg/running) + `type` (upcoming/registering) editierbar → `.update()` umging Insert+Settle-Trigger → Escrow-Desync (Minting-Hintertür). | **GEHEILT**: 3. Trigger `trg_events_resync_prize_escrow` (BEFORE UPDATE OF prize_pool, type) hält Escrow = Ziel, bucht Differenz. Force-rollback-verifiziert (1M→1.5M→300k net 300k; type club→bescout net 0). |
| 2 | MINOR | errorMessages.ts | Zwei Detection-Pfade für denselben String (Regex UI-Pfad + substring im Loop) → Drift-Risiko bei Umbenennung. | Akzeptiert (optional: gemeinsame Konstante). |
| 3 | MINOR (Doku) | events_status_check | 'cancelled' in App-State-Machine, aber DB-CHECK verbietet → pre-existing 23514. Settle deckt nur 'ended'. | Korrekt out-of-scope geflaggt; Folge-Slice bündelt cancel + CHECK + Refund-Zweig. |
| 4 | NITPICK | Migration NEW.id-Guard | Defensiv korrekt (Dead-Safe-Net falls Default existiert, load-bearing sonst). | Keine Aktion. |

## Verifizierte Blindspots (Reviewer)
- **Race:** clubs FOR UPDATE reentrant mit book_club_treasury (Re-Acquire = No-Op), seriell pro Club. Kein Deadlock.
- **Trigger-Platzierung auf events-Tabelle** fängt 3 unabhängige 'ended'-Setzer (score_event + scoring.admin empty-close + cron empty-close) automatisch ab. Defense-in-depth ohne Duplikation.
- **reward_amount-Timing:** score_event setzt reward_amount (195d) VOR status='ended' → Settle liest korrekten SUM. No-lineups-Early-Return → SUM=0 → voller Refund.
- **Rekursion:** BEFORE UPDATE + NEW.prize_escrowed in-row → kein Folge-UPDATE. Doppel-Settle via Flag + status-Guard doppelt abgesichert.
- **Trigger SECURITY DEFINER ohne REVOKE:** korrekt (Trigger-Funktion nur via TRIGGER, braucht DEFINER für book_club_treasury [REVOKE authenticated]).
- **Grandfathering:** prize_escrowed=false → Settle ignoriert → kein fälschlicher Credit. Proof AC5.

## Knowledge (Flywheel)
Neue Bug-Klasse in errors-db.md: „Escrow bei INSERT + Settle bei status-Change → editierbares Escrow-Feld umgeht beide". Promotet (siehe errors-db.md).

## Summary
Saubere zero-sum-Reconcile-Mechanik, Trigger-Platzierung deckt alle Bypass-Pfade. Der gefundene Money-Leak (editierbarer prize_pool/type umging Escrow) wurde mit dem Resync-Trigger geschlossen + verifiziert. PASS nach Heal.
