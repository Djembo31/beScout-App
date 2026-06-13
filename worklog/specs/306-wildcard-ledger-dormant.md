# Slice 306 — S7 #4 Wildcard-Ledger: dormant-Feature dokumentieren + Error-Swallow→throw

**Slice-Type:** Service + Doc
**Größe:** S
**CEO-Scope:** Money-angrenzend (Anil-Decision eingeholt: Option A „minimal schließen", 2026-06-13)

---

## 1. Problem-Statement

S7-Registry (Fantasy §2.7, Finding #3) klassifizierte: „`user_wildcards` 35 Balances, `wildcard_transactions` 0 Zeilen → Balance ohne Audit-Trail = **Compliance-Risiko (P1)**".

**Live-DB-Investigation (2026-06-13) widerlegt die Risiko-These:**

| Check (project `skzjfhvgccaeplydsunz`) | Ergebnis |
|---|---|
| `user_wildcards` 35 Zeilen | **alle leer**: balance=0, earned_total=0, spent_total=0; **alle 1 Timestamp** `2026-05-04 21:30:08` → Backfill-Platzhalter, keine echten Balances |
| `wildcard_transactions` 0 Zeilen | **korrekt** — nie geearnt/gespent/gewährt |
| Live-RPC `earn_wildcards` / `spend_wildcards` / `admin_grant_wildcards` | **alle enthalten `INSERT INTO wildcard_transactions`** (`pg_get_functiondef` ILIKE-check `logs_ledger=true`) → Ledger-Schreibpfad korrekt verkabelt, **kein Repair nötig** |
| `lineups` 444 total | **0 mit Wildcard-Slots** (`array_length(wildcard_slots,1) > 0`) |
| `save_lineup(p_wildcard_slots)` | speichert Slots in Spalte, **debitiert keine Balance / ruft `spend_wildcards` nicht** — Lineup-Slot-Konzept von `user_wildcards`-Ökonomie entkoppelt |
| Earning/Spending/Grant-Aufrufer in `src/` | **0** — `earn`/`spend` nirgends gerufen, `adminGrantWildcards`-Service hat keinen UI-Caller |

**Fazit:** Es gibt kein „Geld ohne Trail". Die Wildcard-Economy ist **vollständig dormant** (Registry-Muster #5 „dormant/orphan", NICHT #4 „Audit-Ledger als Risiko"). Der einzige echte Code-Mangel: `getWildcardHistory` (`src/features/fantasy/services/wildcards.ts:50-53`) swallowt Errors (`catch → console.error + return []`) — verletzt silent-fail-Regel (errors-db.md §Service Error-Swallowing).

## 2. Lösungs-Design

Option A (Anil-bestätigt): **minimal schließen.** Kein Repair (Ledger-Pfad korrekt), keine Removal (Code bleibt dormant-aber-korrekt für spätere Aktivierung), keine Aktivierung.

1. **Code-Fix:** `getWildcardHistory` Error-Swallow → `throw new Error(error.message)` (analog Sibling `getWildcardBalance`/`getWildcardRecord` im selben File).
2. **Test:** `describe('getWildcardHistory')` mit Happy-Path + throw-on-error (mirror existing Pattern in `wildcards.test.ts`).
3. **Doku-Korrektur:** Registry §2.7 + Findings-Tabelle #3 von „Compliance-Risiko P1" → „dormant Feature, Ledger-Pfad korrekt, kein Risiko" (mit Live-Evidence). `useWildcardHistory`-Hook-Kommentar (`misc.ts:91-98`) präzisieren (RPCs schreiben bereits, nur kein Caller).
4. **Knowledge:** errors-db.md Sibling-Pattern zu Slice 303 — „Leere Backfill-Platzhalter-Rows sehen aus wie Balances, sind aber 0 → Audit-Trail-Lücke ist Schein, vor Risiko-Klassifikation Row-Werte verifizieren".

## 3. Betroffene Files

| File | Änderung |
|---|---|
| `src/features/fantasy/services/wildcards.ts` | `getWildcardHistory` catch swallow→throw |
| `src/features/fantasy/services/wildcards.test.ts` | +`describe('getWildcardHistory')` (2 Tests) |
| `src/lib/queries/misc.ts` | Hook-Kommentar präzisieren (RPCs schreiben bereits) |
| `worklog/audits/2026-06-13/s7-source-of-truth-registry.md` | §2.7 + Finding #3 korrigieren |
| `.claude/rules/errors-db.md` | Knowledge-Eintrag (Sibling zu Slice 303) |

## 4. Code-Reading-Liste (PFLICHT vor Code)

| File | Zweck | Prüf-Frage |
|---|---|---|
| `src/features/fantasy/services/wildcards.ts` | Sibling-throw-Pattern | ✅ gelesen — `getWildcardBalance`/`getWildcardRecord` werfen `error.message`; `getWildcardHistory` swallowt |
| `src/features/fantasy/services/wildcards.test.ts` | Test-Mock-Pattern | ✅ gelesen — `.from()`-Chain-Mock mit `.order().limit()` nötig für History |
| `src/lib/queries/misc.ts:91-110` | History-Hook-Consumer | ✅ gelesen — `useWildcardHistory` hat **keinen** gemounteten Component-Consumer → throw safe |
| `src/components/inventory/WildcardsSection.tsx` | Balance-UI | ✅ gelesen — nutzt nur `useWildcardBalance` (nicht History), hat `isError`→ErrorState |

## 5. Pattern-References

- **errors-db.md §Service Error-Swallowing** — `console.error + return []` → React Query cached leeres Array als SUCCESS, kein Retry. Fix: throw.
- **errors-db.md §Seed-Wert-Poisoning (Slice 303)** — Sibling-Klasse: plausibel aussehende DB-Rows (hier: leere Backfill-Platzhalter) führen zu Fehl-Diagnose.
- **Registry-Muster #5 (s7-…-registry.md:221)** — „Dormant/orphan Features mit Test-Daten".

## 6. Acceptance Criteria

- **AC-1** [HAPPY] `getWildcardHistory` mit erfolgreicher Query → gibt rows zurück. VERIFY: vitest. FAIL-IF: gibt `[]` bei vorhandenen Daten.
- **AC-2** [ERROR] `getWildcardHistory` bei DB-error → wirft `error.message` (kein silent `[]`). VERIFY: `vitest run wildcards.test`. FAIL-IF: returnt `[]` statt throw.
- **AC-3** [DOC] Registry §2.7 + Finding #3 sagen „dormant, kein Risiko" mit Live-Evidence. VERIFY: grep „Compliance-Risiko" in §2.7 → 0.
- **AC-4** [REGRESSION] `tsc --noEmit` grün + alle wildcards-Tests grün.

## 7. Edge Cases

| Case | Erwartung |
|---|---|
| `data === null` ohne error | `return []` (legit — kein error, einfach keine Rows) |
| `error` gesetzt | throw `error.message` |
| Hook nicht gemountet | throw erreicht keinen Consumer → kein UI-Impact (verifiziert) |
| Zukünftige Aktivierung | Ledger-Pfad schreibt korrekt → History wird sich füllen, throw-Verhalten dann korrekt |

## 8. Self-Verification Commands

```bash
# AC-2/AC-4
npx vitest run src/features/fantasy/services/wildcards.test.ts
npx tsc --noEmit
# AC-3
grep -c "Compliance-Risiko" worklog/audits/2026-06-13/s7-source-of-truth-registry.md   # §2.7-Kontext muss weg
# Swallow-Audit (soll 0 in wildcards.ts)
grep -n "return \[\]" src/features/fantasy/services/wildcards.ts
```

## 9. Open-Questions

- **CEO (geklärt):** dormant behalten vs. entfernen vs. aktivieren → **A (minimal schließen)** bestätigt 2026-06-13.
- **Autonom:** Test-Struktur, Kommentar-Wording, Knowledge-Eintrag-Ort.

## 10. Proof-Plan

`worklog/proofs/306-wildcard-ledger.txt` — vitest-Output (wildcards.test, alle grün inkl. neue History-Tests) + DB-Evidence-Snapshot (35 leere Rows / 0 tx / logs_ledger=true) + grep-Audit (swallow weg, Registry korrigiert).

## 11. Scope-Out

- KEINE Removal der Wildcard-Tabellen/RPCs/UI (= Option B, nicht gewählt).
- KEINE Aktivierung der Economy (= Option C, nicht gewählt).
- KEINE Migration (Ledger-Pfad ist bereits korrekt live).
- `lineupStore` wildcardSlots:Set-Rehydration (Registry §2.4 / Finding #4) = **separater** Slice.

## 12. Stage-Chain (geplant)

SPEC → IMPACT (skipped: kein Schema/RPC-Change, kein Consumer-Breaking — Hook hat 0 Consumer) → BUILD → REVIEW (Pflicht, money-angrenzend) → PROVE → LOG

## 13. Pre-Mortem (optional bei S)

- **Risiko:** throw bricht einen versteckten Consumer. → Mitigation: grep bestätigt 0 gemountete Consumer von `useWildcardHistory`; throw erreicht niemanden.
- **Risiko:** Doku-Korrektur überschreibt Registry-Kontext. → Mitigation: nur §2.7 + Finding #3 chirurgisch ändern, Evidence anhängen.
