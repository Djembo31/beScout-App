# Slice 400 — E-7 `creator`-Drift-Cleanup

**Slice-Type:** Migration (DB-DELETE in Fee-Config-Tabelle ist die gated Fläche; Rest = Type/UI-Cleanup)
**Größe:** S
**CEO-Scope:** Money-berührend (DELETE in `event_fee_config`) — von Anil approved (AskUserQuestion 2026-06-26, „Voller Schnitt + Bonus").
**Epic:** E-7 (event-creator-liga-epic.md) — sichtbare Altlasten aufräumen.

## 1. Problem-Statement (Evidence)
`creator` war der Vorläufer des Event-Typs `user`. Seit D108 deprecated; die DB verbietet ihn (`events_type_check` = `bescout|club|sponsor|special|user`, **0 creator-Events**, verifiziert via `SELECT type, count(*) FROM events`). Trotzdem schleppen **9 Code-/DB-/i18n-Flächen** tote `creator`-Pfade weiter — Drift, der bei jedem künftigen `Record<EventType>` mitgepflegt werden muss und einen toten i18n-Key + DB-Waisenzeile hält.
- Evidence: Smell-Audit 2026-06-26 (Explore-Agent + DB-Queries). DB-Waisenzeile `event_fee_config('creator')` (Seed 25.03., 5%/5%) — referenzierbar von niemandem. `getTypeStyle('creator')`-Case bereits in `fantasy.md` als offener E-7-Cleanup gelistet.
- **Kein User-sichtbarer Bug** (alles latent): `DbEvent.type` ist `creator`-frei, `eventMapper` speist `FantasyEvent.type` nur daraus → kein creator-Pfad je erreichbar.
- Bonus-Smells: `FantasyEvent.creatorId/creatorName` (Mapper befüllt sie nie, 0 Consumer) + No-op-Ternary `eventMapper.ts:27`.

## 2. Lösungs-Design
Koordinierter Schnitt von `creator` über alle Flächen, die zusammen fallen. Da `EventType` (`features/fantasy/types.ts`) die kanonische Union ist (re-exportiert via `@/components/fantasy/types`), zieht das Entfernen des Union-Members alle exhaustiven `Record<EventType>`-Maps nach (tsc-erzwungen). Plus DB-DELETE der Waisenzeile + 2 Bonus-Cleanups.
Money byte-identisch: keine RPC liest die creator-Fee-Zeile (nur `rpc_lock_event_entry` liest `event_fee_config WHERE event_type=<typ>`, nie `creator`).

## 3. Betroffene Files
| Fläche | File | Änderung |
|--------|------|----------|
| 1 (DB) | Migration | `DELETE FROM event_fee_config WHERE event_type='creator'` |
| 2 | `src/features/fantasy/types.ts:9` + Kommentar 7-8 | `creator` aus `EventType`-Union; Kommentar bereinigen |
| 3 | `src/types/index.ts:1070` | `creator` aus `DbEventFeeConfig.event_type`-Union |
| 4 | `src/features/fantasy/helpers.ts:23` | `case 'creator'` aus `getTypeStyle` (default fängt) |
| 5 | `src/components/ui/EventScopeBadge.tsx:37` + Kommentar 10 | `creator`-Key aus `TYPE_CONFIG` |
| 6 | `src/components/fantasy/events/EventCategoryCards.tsx:99` | `creator`-Key aus `counts`-Map |
| 7 | `src/components/fantasy/events/EventBrowser.tsx:72` | `creator: 0` aus `counts`-Map |
| 8 | `messages/de.json:542` + `messages/tr.json:542` | toter `eventCategories.creator`-Key |
| 9 | `src/components/ui/__tests__/EventScopeBadge.test.tsx:46-50` | `creator`-Test entfernen |
| Bonus A | `src/features/fantasy/types.ts:47-48` | `creatorId?`/`creatorName?` (0 Consumer) entfernen |
| Bonus B | `src/features/fantasy/mappers/eventMapper.ts:27` | No-op-Ternary → `type: db.type` |

## 4. Code-Reading-Liste (erledigt VOR BUILD)
1. `events_type_check` (Live CHECK) — bestätigt `creator` DB-verboten. ✅
2. `SELECT type, count(*) FROM events` — 0 creator-Events. ✅
3. `pg_proc.prosrc ILIKE '%event_fee_config%'` — nur `rpc_lock_event_entry` liest die Tabelle (nach event_type, nie creator) → DELETE money-safe. ✅
4. `helpers.ts:18-28` — `getTypeStyle` hat `default` → case-Entfernen safe. ✅
5. `eventMapper.ts:27` — `db.type === 'special' ? 'special' : db.type` = No-op (special ⊂ db.type), nach Union-Schnitt sind `DbEvent.type` und `EventType` deckungsgleich → `type: db.type` zuweisbar. ✅
6. `EventScopeBadge.tsx` — `EventType` aus `@/components/fantasy/types` = re-export von features (`export * from`). `TYPE_CONFIG` exhaustiv → creator-Key tsc-Pflicht bis Union-Schnitt. ✅
7. `grep creatorId|creatorName src/` — nur Typdef + unverwandte lokale `creatorIds`-Vars (bounties/communityPolls). 0 echte Consumer. ✅
8. i18n `de.json:540-544`/`tr.json` — `creator` zwischen `club` und `user`, beide Werte „User"/„Kullanıcı" (Duplikat von `user`-Key). Consumer nutzt `eventCategories.${cat.type}`, `cat.type` nie creator → toter Key. ✅

## 5. Pattern-References
- **errors-frontend S375 / S305/324/326:** Removal deckt mehrere Achsen (Code, DB, i18n, Tests) — Symbol-grep MUSS `__tests__` einschließen (Fläche 9).
- **errors-frontend S399:** `messages/*.json`-Änderung → nach Edit `node -e "JSON.parse(...)"` für de+tr (deterministisch). Hier nur Zeilen-Removal, aber Gate Pflicht.
- **D108:** `creator` deprecated, `user` ist Nachfolger.
- **D87:** Money-RPC live-functiondef VOR Annahme (hier: `event_fee_config`-Reader-Check erledigt).

## 6. Acceptance Criteria
- **AC-1 [DB]** `SELECT count(*) FROM event_fee_config WHERE event_type='creator'` → **0** nach Migration. VERIFY: execute_sql. FAIL-IF: ≥1.
- **AC-2 [DB-safe]** `event_fee_config` hat danach genau 5 Zeilen (bescout/club/sponsor/special/user). VERIFY: execute_sql.
- **AC-3 [tsc]** `pnpm exec tsc --noEmit` grün — beweist alle exhaustiven Maps creator-frei (sonst „missing creator key" oder „creator not assignable"). FAIL-IF: TS-Error.
- **AC-4 [grep]** `grep -rn "'creator'" src/` → 0 Event-Typ-Treffer (creator_fund/Poll-/Bounty-`creatorIds` ausgenommen). VERIFY: grep.
- **AC-5 [test]** `CI=true pnpm exec vitest run src/components/ui/__tests__/EventScopeBadge.test.tsx` grün (7 Tests, creator-Test weg). FAIL-IF: rot.
- **AC-6 [i18n]** `node -e "JSON.parse(fs.readFileSync('messages/de.json'))"` + tr grün; `grep '"creator"' messages/{de,tr}.json` → 0 in eventCategories. VERIFY: node + grep.
- **AC-7 [Reviewer]** Verdict != FAIL.

## 7. Edge Cases
| Fall | Verhalten |
|------|-----------|
| Event mit type='creator' existiert | Unmöglich (CHECK verbietet, 0 in Prod) — kein Render-Pfad |
| `getTypeStyle` mit unbekanntem Typ | `default`-Zweig (Trophy/weiß) — unverändert |
| `TYPE_CONFIG[type]` Fallback | `?? TYPE_CONFIG.bescout` bleibt (Z.44) |
| RPC liest creator-Fee-Zeile | Nie (kein creator-Event) — DELETE folgenlos |
| i18n: künftig doch creator-Event | Unmöglich (CHECK); Badge fiele auf bescout-Fallback, kein Crash |
| Bonus: `creatorId` doch irgendwo gelesen | grep 0 → tsc fängt sonst |
| `messages` JSON last-key-Komma | `creator` ist Mittel-Key (user folgt) → kein trailing-comma-Problem |

## 8. Self-Verification Commands
```bash
grep -rn "'creator'" src/ | grep -vi "creator_fund\|creatorId\|creatorName\|creatorPayout\|CreatorJoin"
pnpm exec tsc --noEmit
CI=true pnpm exec vitest run src/components/ui/__tests__/EventScopeBadge.test.tsx
node -e "JSON.parse(require('fs').readFileSync('messages/de.json','utf8')); JSON.parse(require('fs').readFileSync('messages/tr.json','utf8')); console.log('json ok')"
# DB: SELECT event_type FROM event_fee_config ORDER BY event_type;
```

## 9. Open-Questions
- **CEO-Zone (geklärt):** Voller Schnitt + Bonus approved (AskUserQuestion 2026-06-26).
- **Autonom-Zone:** Migrations-Timestamp, Kommentar-Wording, ob `index.ts:1070`-Union-Schnitt direkt (ja — DB-Spiegel, creator-Zeile gelöscht).

## 10. Proof-Plan
- `worklog/proofs/400-cleanup.txt`: tsc-grün + vitest-Output + `grep 'creator'`-leer + DB-`SELECT event_type FROM event_fee_config` (5 Zeilen, kein creator) + JSON-Parse-OK.
- Kein UI-Playwright nötig: rein toter-Pfad-Schnitt, kein neuer/geänderter Render (creator war nie sichtbar). `user`-Pfad bleibt byte-identisch → keine Regression-Fläche.

## 11. Scope-Out
- Freiform-Reward-Editor (E-4b-Rest) — eigener Slice.
- `sponsor`/`creator`-Event-**Minting** (E-6) — nicht berührt; `sponsor` bleibt voll funktional.
- Predictions: KEIN Smell (`ChallengeType.'prediction'` = lebende Daily-Challenge-Frageart) — nicht anfassen.
- `eventMapper.ts:27` No-op nur als Bonus-Cleanup; keine Verhaltensänderung.

## 12. Stage-Chain (geplant)
SPEC ✅ → IMPACT (inline, §3 Tabelle = Consumer-Karte, kein eigenes File) → BUILD → REVIEW (Reviewer Pflicht, refactor) → PROVE (400-cleanup.txt) → LOG.

## 13. Pre-Mortem (S optional, kurz)
- „Vergessene exhaustive Map" → tsc fängt (jede `Record<EventType>` ohne creator-Key bricht sonst NICHT — sie hat dann einen *zu viel*; korrekt: Map MIT creator-Key bricht bei Union-Schnitt). ✅ tsc ist das Netz.
- „i18n-JSON kaputt" → node-Parse-Gate (S399). ✅
- „DELETE trifft falsche Zeile" → WHERE event_type='creator' exakt; AC-2 zählt Rest-Zeilen. ✅
- „creatorId doch genutzt" → grep + tsc. ✅
