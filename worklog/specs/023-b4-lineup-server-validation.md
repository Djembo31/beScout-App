# Slice 023 — B4 Lineup Server-Validation (Strict-Reject)

**Groesse:** M · **CEO-Scope:** ja (Fantasy-RPC-Hardening) · **Approval:** (a) Strict-Reject bestaetigt 2026-04-17

## Ziel

`save_lineup` RPC server-seitig haerten, sodass Lineups mit ungueltiger Formation/Slot-Belegung **strict abgelehnt** werden. Client-Formation-Check ist umgehbar via direkter RPC-Call → heute ist Fantasy-Scoring-Integritaet nicht garantiert. Nach diesem Slice ist der RPC die einzige Wahrheit.

## Betroffene Files (geschaetzt)

| File | Was |
|------|-----|
| **NEU** `supabase/migrations/202604171XXXXX_save_lineup_formation_validation.sql` | `save_lineup` RPC Body erweitert um Formation-Parsing + Slot-Count-Validation + GK-Required. Neue Error-Keys. REVOKE+GRANT-Block. |
| `src/lib/services/__tests__/lineups.test.ts` | Neue `it(...)` Cases fuer die neuen RPC-Error-Keys |
| `src/lib/__tests__/db-invariants.test.ts` | INV-27: `save_lineup` rejects invalid formations (Live-DB-Test) |
| `messages/de.json` + `messages/tr.json` | Neue i18n-Keys fuer neue Error-Labels (falls Error-Mapping in Service eine User-facing Fehler macht — wahrscheinlich nicht, nur Error-Key-Propagation) |

## Acceptance Criteria

1. **GK-Required:** `save_lineup` mit `p_slot_gk = NULL` → `{ok:false, error:'gk_required'}`
2. **Invalid Formation-String:** `p_formation` NULL/leer/unbekannt (nicht in Allowlist) → `{ok:false, error:'invalid_formation'}`
3. **Slot-Count-Mismatch:** Formation `'4-4-2'` aber nur 3 DEF-Slots belegt → `{ok:false, error:'invalid_slot_count_def'}` (analog fuer `mid`/`att`)
4. **Extra Slot (7er-Mode):** Formation `'3-2-1'` (7er) aber `p_slot_mid4` gesetzt → `{ok:false, error:'extra_slot_for_formation'}`
5. **Captain auf leerem Slot:** `p_captain_slot='att2'` aber `p_slot_att2 IS NULL` → `{ok:false, error:'captain_slot_empty'}`
6. **Bestehende Errors unveraendert:** `event_not_found`, `event_ended`, `event_locked`, `must_enter_first`, `duplicate_player`, `insufficient_sc`, `wildcards_not_allowed`, `too_many_wildcards` bleiben identisch
7. **Gueltige Formation** (`'4-4-2'` mit 1 GK + 4 DEF + 4 MID + 2 ATT + Captain auf gefuelltem Slot) → `{ok:true, lineup_id:UUID, is_new:bool}` wie bisher
8. **tsc clean + lineups.test.ts + db-invariants.test.ts vollstaendig gruen**

## Edge Cases

1. **Null/empty formation** → `invalid_formation`
2. **GK-NULL** → `gk_required` (first check priority)
3. **Formation sagt 11er aber nur 7 Slots belegt** → `invalid_slot_count_*`
4. **Unknown formation `'5-5-5'`** → `invalid_formation`
5. **Captain-Slot zeigt auf leeren Slot** → `captain_slot_empty`
6. **Wildcards zeigen auf leere Slots** → pruefen ob heute schon gecovered, sonst `wildcard_slot_empty`
7. **Race condition (2x parallel submit)** → RPC-Lock bleibt, Formation-Check idempotent
8. **Event-Locked + ungueltige Formation** → `event_locked` gewinnt (wirft zuerst), Formation-Check nie erreicht
9. **All slots NULL** → `gk_required` (erste Hurde)
10. **Formation-Case-Sensitive** → Formation-Allowlist-Match muss `LOWER(TRIM())` sein

## Proof-Plan

| Artefakt | Inhalt |
|----------|--------|
| `worklog/proofs/023-rpc-before.txt` | `pg_get_functiondef(save_lineup)` VOR Apply |
| `worklog/proofs/023-rpc-after.txt` | `pg_get_functiondef(save_lineup)` NACH Apply (Diff zeigbar) |
| `worklog/proofs/023-rpc-reject.txt` | 5× `SELECT save_lineup(...)` mit invaliden Inputs → jeweils `{ok:false, error:'<key>'}` als Beweis |
| `worklog/proofs/023-tsc.txt` | tsc clean |
| `worklog/proofs/023-tests.txt` | vitest Output `lineups.test.ts` + `db-invariants.test.ts` gruen |

## Scope-Out

- **Client-UX bleibt unveraendert** — AufstellenTab/SaveButton/disabled-states. B4 ist REINE Server-Haertung.
- **Neue Formationen hinzufuegen** — keine. Nur bestehende absichern.
- **Captain/Wildcard-Business-Rules aendern** — nur Slot-Leer-Check als Nebenbefund; bestehende Logic unveraendert.
- **7er-vs-11er-Event-Mode** — Detection via Formation-String-Allowlist (11er und 7er beide als Pattern). Kein Event-Mode-Lookup noetig (→ einfacher, weniger Risiko).
- **Formation-Change-Events / Audit-Log** — andere Domain, nicht in Scope.

## Open Items (zu klaeren in IMPACT)

- **Formation-Allowlist:** Welche Formationen sind heute in den Events live? Grep `fantasy_events.mode` + Client-Code `src/features/fantasy/**/formations`.
- **Save-Lineup RPC Current Body:** `SELECT body FROM _rpc_body_snapshots WHERE rpc_name='save_lineup'` — wie macht der RPC heute die Slot-Iteration? Anpassen oder vorschalten?
- **Wildcard-Slot-Empty-Check:** Gibt es heute einen Check `wildcardSlots[i]` → `p_slot_{...}` nicht NULL? Oder nur `too_many_wildcards`?

## Risiko + Rollback

- **Risiko: Mittel.** RPC-Aenderung an Fantasy-Flow. 100+ User laufen durch `save_lineup` pro Event.
- **Rollback:** Fix-Forward via neue Migration (Body-Revert) statt DB-Rollback — bescout.net Downtime vermeiden.
- **Deploy-Plan:** Migration apply → RPC-After-Snapshot → Invalid-Input Smoke-Tests → Service-Tests lokal → commit + push.
