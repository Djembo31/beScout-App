# Review — Slice 396 User-Events Geld-Kern (E-4a)

**Reviewer:** Cold-Context reviewer-Agent (Money/CEO) · 2026-06-26 · time-spent: 18 min

## Verdict: PASS

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | LOW | `decisions.md` D108 | D108 beschrieb noch das verworfene V1/V2-Modell (5 % Platform-Fee, optionaler Seed-Pot, fee_config platform 500/0). Code = V3 (0/0, kein Seed, Pot=Σ Eintritte). Wissens-Drift gegen Live-Code. | **GEFIXT im LOG:** D108 auf V3 nachgezogen (fee_config 0/0, kein Seed, Verdienst nur über Erstell-Gebühr). |
| 2 | LOW | `cancel_user_event` / `score_event` | cancel setzt `status='cancelled'` aber nicht `scored_at` → nachträglicher `score_event` auf cancelled-Event läuft durch (kein status-Guard), findet 0 entries/0 lineups → setzt status auf 'ended'. **Money-neutral** (0 entries → v_user_pot=0). Reiner State-Oddity. | **Bewusst deferred (dokumentierter LOW):** sauberer Fix = Status-Guard in score_event (200-Z-Re-Apply-Risiko) ODER scored_at in cancel (würde trg_event_scored_manager feuern = Seiteneffekt). Money-neutral → kein Re-Apply für Extrem-Edge. Kandidat für generische „terminal status guard in score_event". |
| 3 | INFO | `create_user_event` | INSERT spiegelt `entry_fee` + `ticket_cost` = p_entry_fee. ticket_cost ist money-autoritativ (rpc_lock_event_entry liest ihn). Künftiger Editier-Pfad muss beide konsistent halten. | Dokumentiert in Wissens-Kopplung (treasury.md/fantasy.md). |

## Beleg-Zusammenfassung (Reviewer)
1. **Zero-Sum** hält in allen Pfaden (0 Teilnehmer / 0 Lineups / Rest>0 / tie / distinct): raus=Σ(amount_locked)=v_user_pot; rein=v_distributed+Rest=v_user_pot. Defensiv auch für Nicht-0/0-Config korrekt.
2. **Ein-Besitzer-pro-Bewegung:** score_event="ended" (+scored_at-Idempotenz), cancel_user_event="cancelled"; Trigger no-op für user (prize_pool=0+prize_escrowed=false → Gate false). Charge→DELETE macht Re-Charge unmöglich.
3. **PATCH-AUDIT:** 3 Trigger md5 unverändert, score_event non-user byte-identisch (nur additive IF type='user'-Blöcke), Auth-Gate byte-identisch zur 195d-Baseline.
4. **Auth/AR-44:** alle 3 RPCs SEC DEFINER + auth.uid()-Guard + ACL {postgres,authenticated,service_role} (kein PUBLIC/anon). platform_event_config RLS ENABLE + 0 Policies.
5. **5-File-CHECK-Sync** vollständig inkl. CI-unsichtbarer INV-18/INV-22-Snapshots.
6. **Compliance:** i18n DE/TR neutral.
7. **Edge:** entry=0 ok, reward Σ=100, FLOOR-Rest→Topf, Wildcard-COALESCE fail-closed.

**One-Line:** Senior würde mergen — Geld-Kern sauber additiv, zero-sum bewiesen, AR-44/Auth komplett, CHECK-Sync vollständig; offene Punkte = veralteter Decision-Eintrag (im LOG gefixt) + money-neutraler State-Oddity (deferred).
