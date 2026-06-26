# Slice 395 — Lineup-Reject-Coverage komplett

**Slice-Type:** i18n
**Größe:** S

## 1. Problem-Statement
Slice 393 mappte die **9 E-3-Regel**-Reject-Codes von `rpc_save_lineup` regel-spezifisch. Der 393-Reviewer + Handoff (`memory/session-handoff.md` Z.36) hielten fest: **~20 weitere** Reject-Codes derselben RPC (Formation/Salary/Wildcard/Bench/Entry-State) fallen weiterhin auf `'generic'` → der Manager sieht „Ein Fehler ist aufgetreten" statt der gebrochenen Regel.

**Evidence — Live-`pg_get_functiondef('rpc_save_lineup')` (D87), alle `'error'`-Literale enumeriert.** Abgleich gegen `KNOWN_KEYS ∪ ERROR_MAP` (`src/lib/errorMessages.ts`) ergibt **22 ungemappte Codes**:

| # | Code | Kategorie |
|---|------|-----------|
| 1 | `auth_mismatch` | Auth |
| 2 | `event_locked` | Entry-State |
| 3 | `must_enter_first` | Entry-State |
| 4 | `invalid_event_no_league` | Entry-State (E-1) |
| 5 | `invalid_formation` | Formation-Struktur |
| 6 | `extra_slot_for_formation` | Formation-Struktur |
| 7 | `invalid_slot_count_def` | Formation-Struktur |
| 8 | `invalid_slot_count_mid` | Formation-Struktur |
| 9 | `invalid_slot_count_att` | Formation-Struktur |
| 10 | `gk_required` | Pflicht-Slot |
| 11 | `captain_slot_empty` | Pflicht-Slot |
| 12 | `wildcard_slot_invalid` | Wildcard-Slot |
| 13 | `wildcard_slot_empty` | Wildcard-Slot |
| 14 | `wildcards_not_allowed` | Wildcard |
| 15 | `too_many_wildcards` | Wildcard |
| 16 | `salary_cap_exceeded` | Salary |
| 17 | `max_per_club_exceeded` | Verein-Quote |
| 18 | `bench_player_not_found` | Bench |
| 19 | `bench_outfield_position_mismatch` | Bench |
| 20 | `insufficient_sc` | Holdings |
| 21 | `unknown_lineup_rule` | Regel-Engine (fail-closed) |
| 22 | `invalid_lineup_rule_value` | Regel-Engine (fail-closed) |

Schon abgedeckt (NICHT anfassen): `event_not_found`/`event_ended`/`duplicate_player` (ERROR_MAP-Regex), `invalid_bench_order`/`bench_gk_position_mismatch`/`bench_overlaps_starter`/`bench_not_in_holdings`/`bench_duplicate` (195d KNOWN_KEYS), `player_not_in_event_league` (380), die 9 E-3-Codes (393).

## 2. Lösungs-Design
Zentral in `errorMessages.ts` — identisches Muster wie 393, mit sinnvoller Gruppierung statt 22 Beinahe-Duplikate:

- **11 eigene Keys** (snake_case-Passthrough via `KNOWN_KEYS`, je 1 DE/TR-String): `event_locked`, `must_enter_first`, `invalid_event_no_league`, `gk_required`, `captain_slot_empty`, `wildcards_not_allowed`, `too_many_wildcards`, `salary_cap_exceeded`, `max_per_club_exceeded`, `bench_player_not_found`, `bench_outfield_position_mismatch`.
- **3 gruppierte Keys** (via `ERROR_MAP`-Regex, je 1 neuer DE/TR-String, fasst semantisch gleiche Codes zusammen):
  - `lineupFormationInvalid` ← `invalid_formation`, `extra_slot_for_formation`, `invalid_slot_count_(def|mid|att)` (5 Codes, alle „Aufstellung passt nicht zur Formation")
  - `wildcardSlotInvalid` ← `wildcard_slot_invalid`, `wildcard_slot_empty`
  - `lineupRuleInvalid` ← `unknown_lineup_rule`, `invalid_lineup_rule_value` (Regel-Engine-Defensive, sollte UI-normal nie feuern, aber besser als generic)
- **2 Wiederverwendungen** existierender Keys (kein neuer String, via `ERROR_MAP`-Regex):
  - `auth_mismatch` → `permissionDenied`
  - `insufficient_sc` → `notEnoughDpc` („nicht genügend Scout Cards")

Summe: **14 neue Keys × DE+TR = 28 neue Strings**. Kein RPC-Change, kein Service-Refactor, kein Money.

**Scope-Out (bewusst, Folge-Slice):** dynamischer Kontext im Toast (`max`/`cap`/`expected`/`slot` aus dem Validator-Return) — bräuchte Throw-Refactor in `lineups.mutations.ts:62` (wirft heute nur `result.error`, verwirft die Kontext-Felder). Identischer Scope-Out wie 393. Statisch regel-spezifisch ist der 80 %-Wert.

## 3. Betroffene Files
| File | Änderung |
|------|----------|
| `src/lib/errorMessages.ts` | 11 Codes in `KNOWN_KEYS` + 5 `ERROR_MAP`-Regex-Zeilen (3 neue Gruppen + 2 Reuse) |
| `messages/de.json` | 14 Strings im `errors`-Namespace |
| `messages/tr.json` | 14 Strings im `errors`-Namespace |

## 4. Code-Reading-Liste (erledigt VOR Spec)
1. **Live `pg_get_functiondef('rpc_save_lineup')`** (D87, nicht Migration) — alle 40 `'error'`-Literale extrahiert, gegen Mapping diff'd → 22 ungemappt. ✓
2. `src/lib/errorMessages.ts:10-50` (`KNOWN_KEYS`) + `:52-174` (`ERROR_MAP`) + `:181-187` (`mapErrorToKey`: KNOWN_KEYS-Passthrough zuerst, dann Regex, sonst `'generic'`). ✓
3. `src/features/fantasy/services/lineups.mutations.ts:54-63` — wirft `result.error` (Code) als `err.message`; Wrapper `save_lineup` delegiert an `rpc_save_lineup`. ✓
4. `src/lib/__tests__/error-keys-coverage.test.ts` (INV-25) — scannt nur Service-**Literal**-Throws; `throw new Error(result.error ?? '…')` ist Ausdruck → wird NICHT erfasst → meine Additions brechen/ändern den Test nicht. ✓
5. `messages/de.json` `errors`-Namespace (91 Keys) — alle 14 geplanten Keys kollisionsfrei (Node-Check). ✓

## 5. Pattern-References
- **Slice 393** (`393-lineup-rule-reject-messages.md`) — identischer Pfad + Passthrough-Muster.
- **errors-frontend.md S393** — „RPC-Reject-Code ohne `mapErrorToKey`-Mapping → stiller `'generic'`-Toast": Codes gegen `KNOWN_KEYS ∪ ERROR_MAP` + `errors`-NS (DE+TR) diffen.
- **S333** — MISSING_MESSAGE namespace-aware (neuer Key muss im richtigen `errors`-Objekt liegen).
- **S198** — nach jedem neuen `t()`-Key SOFORT DE+TR.

## 6. Acceptance Criteria
- **AC1** [HAPPY]: Für alle 22 Codes gibt `mapErrorToKey(code)` **nicht** `'generic'` zurück. VERIFY: Node-Check über die 22-Code-Liste. EXPECTED: 22/22 ≠ generic. FAIL-IF: irgendein Code → `'generic'`.
- **AC2** [HAPPY]: Jeder von `mapErrorToKey` zurückgegebene Ziel-Key existiert in **de.json UND tr.json** `errors`-Namespace. VERIFY: Node-Check resolved-key ∈ beide Namespaces. FAIL-IF: ein Key fehlt in DE oder TR.
- **AC3** [Gruppierung]: `mapErrorToKey('invalid_slot_count_mid') === 'lineupFormationInvalid'` und `mapErrorToKey('extra_slot_for_formation') === 'lineupFormationInvalid'`. VERIFY: Node-Check.
- **AC4** [Reuse]: `mapErrorToKey('auth_mismatch') === 'permissionDenied'` und `mapErrorToKey('insufficient_sc') === 'notEnoughDpc'`. VERIFY: Node-Check.
- **AC5** [Regression]: alle **schon abgedeckten** Codes bleiben unverändert gemappt (`duplicate_player`→`duplicatePlayer`, `event_ended`→`eventEnded`, die 9 E-3-Codes Passthrough). VERIFY: Node-Check.
- **AC6**: `npx tsc --noEmit` clean.
- **AC7**: `npx vitest run src/lib/__tests__/error-keys-coverage.test.ts` grün (INV-25 unverändert).

## 7. Edge Cases
| Fall | Verhalten |
|------|-----------|
| Unbekannter künftiger Code | weiterhin `'generic'` (unverändert) — Defaultpfad bleibt |
| Code in KNOWN_KEYS aber String fehlt im NS | MISSING_MESSAGE → durch AC2 abgesichert |
| TR fehlt | DE-Fallback wäre still → AC2 prüft TR explizit |
| Regex-Gruppe matcht zu breit | Anker auf exakte snake_case-Codes (`invalid_slot_count_(def|mid|att)`, kein `.*`-Wildcard) → kein Fremd-Match |
| `auth_mismatch` vs bestehendes `/auth.*uid.*mismatch/` | `auth_mismatch` enthält kein „uid" → matcht alte Regel NICHT → eigene Regex nötig |
| Reihenfolge: neue Regex vor `/not.found/` (Z.116) | `event_locked`/`must_enter_first` enthalten kein „not found"; `invalid_event_no_league` enthält „no_league" nicht „not found" → keine Frühschluck-Kollision. Passthrough-Codes greifen ohnehin VOR ERROR_MAP. |

## 8. Self-Verification Commands
- Node-Check (alle ACs): 22-Code-Liste → `mapErrorToKey` ≠ generic + resolved ∈ de+tr errors-NS + Gruppen/Reuse-Asserts + Regression-Asserts.
- `npx tsc --noEmit`
- `npx vitest run src/lib/__tests__/error-keys-coverage.test.ts`

## 9. Open-Questions
- **Autonom-Zone (Claude/CTO):** Wording der 14 DE/TR-Strings (Fantasy-Domäne, kein Money/Securities → keine Compliance-Gabel), Gruppierungs-Schnitt, Reuse-Entscheidungen.
- **Keine CEO-Zone:** kein Money, kein Scope-WAS, keine neue Regel — reine Übersetzungs-Abdeckung bestehender Validator-Codes.

## 10. Proof-Plan
`worklog/proofs/395-reject-coverage.txt` — Node-Check-Output (22/22 ≠ generic + DE/TR-Präsenz + Gruppen/Reuse/Regression) + tsc + INV-25-vitest.

## 11. Scope-Out
- Dynamischer Kontext im Toast (Limit/Cap/Slot aus Validator-Return) = Throw-Refactor, eigener Folge-Slice.
- Live-Reject-E2E (geseedetes Regel-Event + jeder Verstoß) — Validator ist SQL-bewiesen, FE-Toast-Render ist Standard-Infra (393-Präzedenz). Statischer Node-Check ist der Proof.
- Andere RPCs als `rpc_save_lineup`.

## 12. Stage-Chain (geplant)
SPEC → IMPACT (inline: zentrale Mapping-Datei, 0 Consumer-Drift) → BUILD → REVIEW → PROVE → LOG
