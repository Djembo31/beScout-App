# Review — Slice 384 (E-3 Türsteher: Follower-Pflicht + Fan-Rang-Gate)

**Reviewer-Agent (Cold-Context), Money-nah · 2026-06-25 · time-spent: 14 min**

## Verdict: PASS

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | NIT | EventFormModal.tsx / useEventForm.ts | Türsteher-Felder werden nicht `disabled` bei fehlendem Club. Platform-Admin kann `requires_follow`/`min_fan_rank_tier` auf club-loses Event setzen — DB akzeptiert, RPC no-op (AC-6). Funktional fail-safe, nur statischer `gateHint` statt `disabled`. Keine Geld-/Sicherheitsfolge. | Optional `disabled={!form.clubId}` — ODER bewusste Drift vermerken. |
| 2 | NIT | de.json fantasy vs errors | Zwei `fanRankTooLow`-Keys in getrennten Namespaces (fantasy=Event-Reject, errors=Poll-Reject), kontext-korrekt. Latente Verwechslungsgefahr bei grep-Refactor. | Belassen. |

**Entscheidung Primary-Claude:** Beide NITs **nicht** geheilt.
- NIT#1: Das Schwester-Gate `min_subscription_tier` (gleiche Klasse, club-spezifisch) ist im Builder selbst **nicht** `disabled` bei club-losem Event. `disabled={!form.clubId}` wäre eine neue Verbesserung, kein Pattern-Match → würde Inkonsistenz schaffen. Der `gateHint`-Text („wirken nur bei Vereins-Events") kommuniziert die Bedingung ausreichend. **Bewusste Spec-Drift** (§2 Simplicity + Konsistenz mit Schwester-Gate). Falls künftig gewünscht: eigener kleiner UX-Slice für ALLE club-spezifischen Gate-Felder (min_subscription_tier + requires_follow + min_fan_rank_tier) gemeinsam.
- NIT#2: belassen (Reviewer-Empfehlung, getrennte Kontexte korrekt).

## One-Line
Ja — ein Senior merged das: byte-genauer PATCH-AUDIT (Score 8/8 live), Gates fail-closed VOR jeder Geldbewegung, alle 5 Read-Pfade + Type + EDITABLE_FIELDS + i18n DE+TR lückenlos.

## Geprüft (PASS)
1. **PATCH-AUDIT**: alle bestehenden Patches erhalten (auth-Guard, fee_config, min_subscription_tier, min_tier, tickets+scout-Pfade, advisory-lock, event_entry_lock, Free-Event-NULL), Live-ILIKE-Score 8/8 — kein Silent-Revert (S156/S343-Klasse vermieden).
2. **Money-Safety**: Gates nach min_tier, vor already_entered/advisory-lock/Geld. Reject = reines RETURN, keine Mutation. Proof: bal_unchanged bei allen 3 Reject-Pfaden.
3. **fail-closed**: fan_rank_tier_rank(NULL)=-1 < min ✅; Follower NOT EXISTS ✅; beide auf club_id IS NOT NULL gegated.
4. **S200 Read-Pfade**: alle 5 (3 explizite Selects + clone-Template + /api/events select('*')) + DbEvent + populateFromEvent.
5. **EDITABLE_FIELDS**: 26/25 nachgezogen + toContain, CI-Rot-Klasse (380/382) vermieden.
6. **i18n**: fantasy (Error) + admin (Builder) Namespaces korrekt, mapErrorToKey deckt fanRankTooLow, kein J1/J3-Leak, S333-Falle vermieden.
7. **CHECK + Compliance**: 6-Tier-Mirror, 'bogus'→23514, Wording neutral DE+TR.
8. **ACL**: REVOKE PUBLIC+anon, kein authenticated-GRANT (Inner-RPC), proacl erhalten (S368c).

## Knowledge Capture
Kein neuer Fehler — bestehende Patterns (S200, S356, S330-CHECK-Sync, S035-Wrapper, EDITABLE_FIELDS-Count) korrekt angewendet. Kein errors-*.md-Eintrag nötig.
