# Slice 393 — E-3 Regel-Rejects regel-spezifisch

**Slice-Type:** i18n
**Größe:** S

## 1. Problem-Statement
Gebündelter E-3-Playwright-Durchlauf (2026-06-26, `worklog/proofs/e3-bundle-playwright-verify.md`, Finding #1) deckte auf: Der Validator `rpc_save_lineup` gibt 9 regel-spezifische Reject-Codes zurück, aber das FE (`useLineupSave.ts:135` → `mapErrorToKey`) kennt keinen davon → Fallback `'generic'`. Jeder Regelverstoß zeigt denselben „Ein Fehler ist aufgetreten"-Toast. Der Manager erfährt nicht, WELCHE Regel er brach — was den Zweck granularer E-3-Regeln untergräbt.

## 2. Lösungs-Design
Snake_case-Passthrough analog `bench_*`/`ghost_holding_row`: die 9 Codes in `KNOWN_KEYS` (mapErrorToKey gibt sie unverändert zurück) + je eine DE/TR-Meldung im `errors`-Namespace. Kein RPC-Change, kein Money, kein Service-Refactor.

**Scope-Out (bewusst, Folge-Slice):** dynamischer Kontext (`limit`/`age`/MV aus dem Validator-Return) im Text — bräuchte Throw-Refactor in `lineups.mutations.ts` (wirft heute nur `result.error`). Statisch regel-spezifisch ist der 80%-Wert.

## 3. Betroffene Files
- `src/lib/errorMessages.ts` — 9 Codes in `KNOWN_KEYS`
- `messages/de.json` — 9 Strings im `errors`-Namespace
- `messages/tr.json` — 9 Strings im `errors`-Namespace

## 4. Code-Reading-Liste (erledigt)
1. `src/features/fantasy/hooks/useLineupSave.ts:132-136` — catch → `te(mapErrorToKey(normalizeError(err)))`. ✓
2. `src/features/fantasy/services/lineups.mutations.ts:54-63` — wirft `result.error` (Code) als `err.message`. ✓
3. `src/lib/errorMessages.ts:10-45,176-182` — `KNOWN_KEYS` passthrough + `'generic'`-Fallback. ✓
4. Migrationen `2026062*_e3_*.sql` — exakte 9 Reject-Codes (snake_case). ✓

## 5. Pattern-References
- Slice 380 (`playerNotInEventLeague`) = derselbe Lineup-Reject-Pfad. S333 (MISSING_MESSAGE namespace-aware).

## 6. Acceptance Criteria
- AC1: `mapErrorToKey(<code>)` gibt für alle 9 Codes den Code selbst zurück (nicht `'generic'`). VERIFY: Node-Check.
- AC2: `errors`-Namespace hat alle 9 Codes in DE **und** TR (nicht leer). VERIFY: Node-Check.
- AC3: `tsc --noEmit` clean.
- AC4: errorMessages-Test (falls vorhanden) grün.

## 7. Edge Cases
| Fall | Verhalten |
|------|-----------|
| Unbekannter neuer Code | weiterhin `'generic'` (unverändert) |
| Code in KNOWN_KEYS aber String fehlt im Namespace | MISSING_MESSAGE → durch AC2 abgesichert |
| TR fehlt | DE-Fallback wäre still → AC2 prüft TR explizit |

## 8. Self-Verification
- `node`-Check: 9 Codes → mapErrorToKey-Passthrough + DE/TR-Präsenz.
- `npx tsc --noEmit`.

## 10. Proof-Plan
`worklog/proofs/393-reject-messages.txt` — Node-Check-Output (9/9 passthrough + DE/TR) + tsc.

## 11. Scope-Out
Dynamischer Kontext im Toast (Limit/Alter/MV); Live-Reject-E2E (braucht geseedetes Regel-Event + Lineup-Verstoß) — Validator ist bereits 17/17 SQL-bewiesen, FE-Toast-Render ist Standard-Infra.

## 12. Stage-Chain
SPEC → IMPACT (inline) → BUILD → REVIEW → PROVE → LOG
