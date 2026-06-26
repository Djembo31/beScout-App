# Slice 397 — E-4b User-Events Builder-UI verkabeln (Teil 1: Erstellen + Credit-Eintritt sichtbar)

**Größe:** M
**Slice-Type:** UI (+ Service + Hook + i18n) — Money-nah (verkabelt die in 396 CEO-approbierte Geld-RPC), Reviewer Pflicht.
**Epic:** E-4b (`worklog/notes/event-creator-liga-epic.md`) · folgt auf E-4a (Slice 396, D108 V3).

---

## 0. CEO-Entscheide (2026-06-26, AskUserQuestion)

1. **Credit-Eintritt entkoppeln + sichtbar:** User-Events kosten echte Credits (Phase-1-Spielgeld, D99 — wertlos, kein €). Die Scout-Geld-Anzeige ist heute global hinter `PAID_FANTASY_ENABLED=false` (Phase-3-Paid-Fantasy, „NICHT BAUEN"). → User-Events (`type='user'`) werden **gezielt** entkoppelt, NICHT das Flag global geflippt. `FantasyDisclaimer` bleibt auf jedem Money-Schritt.
2. **Wer erstellt:** Jeder eingeloggte User (nicht mehr nur Admins). Misuse-Schutz = Erstell-Gebühr (Default 50 Cr → Topf) + `min_entries`.
3. **Split:** 397 = Builder + `create_user_event`-Verkabelung + Credit-Eintritt sichtbar + Reject-Codes + Typ-Union `'user'`. **398** = öffentliche Discovery, Live-Pot-Vorschau, Cancel-UI, Admin-Gebühr-Slider, `min_entries`-Anzeige.

---

## 1. Problem-Statement

**Evidence:** Slice 396 baute den User-Event-Geldkern (4 RPCs), aber `grep create_user_event|cancel_user_event|set_user_event_create_fee src/` = **0 Treffer**. `CreateEventModal.tsx` ist ein Phase-4-Mock: `onCreate` → nur Toast (`FantasyContent.tsx:175-177`), schreibt nichts, setzt hardcoded `type:'creator'` (laut D108 verboten) + `creatorId:'user1'`. **Kein User kann ein User-Event erstellen** — der Geldkern ist tot. Das ist das projekt-eigene Anti-Pattern „Build-without-Wire" (D53).

---

## 2. Lösungs-Design

Den toten Geldkern verkabeln, minimal-invasiv:

1. **Typ-Union `'user'`** in `EventType` + `DbEvent.type` ziehen → tsc-Zwang in den exhaustiven Records (Badge, CategoryCards) erzwingt Pflege. `getTypeStyle` `case 'user'` (orange `UserPlus`, spiegelt vorhandenen `getTierStyle('user')`).
2. **Service** `createUserEvent` (`events.mutations.ts`) — RPC-Wrapper, Vorbild `cancelEventEntries` (soft-return `{ok,error}`, **kein throw** im Service).
3. **Hook** `useCreateUserEvent` (neu) — `useSafeMutation` (Money-Race-Schutz S149), nach Erfolg `invalidateWallet` (S371!) + `/api/events?bust=1` + `qk.events.all`. throw bei `!ok` → `mapErrorToKey`.
4. **Builder** `CreateEventModal` neu für User-Events: Name · Eintritt (Credits) · Spieltag · Lock-Zeitpunkt · Reward-Preset · Min/Max-Teilnehmer. Client-Validierung VOR RPC (sum=100 via Presets, min≤max, locks_at>now) → harte Reject-Codes feuern fast nie. Async + `preventClose={isPending}`.
5. **Gating** `FantasyHeader`: Create-Button für jeden eingeloggten User (Page ist auth-guarded).
6. **`JoinConfirmDialog`** entkoppeln: `isScoutCurrency = (event.type === 'user' || PAID_FANTASY_ENABLED) && currency==='scout' && ticketCost>0`. Disclaimer bleibt.
7. **Reject-Codes** → `errorMessages.ts` KNOWN_KEYS + DE/TR `errors`-Namespace (S393).

**Reward-Struktur = Presets** (kein Freiform-Editor — Minimalismus): „Gewinner erhält alles" `[{rank:1,pct:100}]` · „Top 3 (50/30/20)" · „Top 5 (40/25/15/12/8)". Custom-Editor = späterer Slice.

---

## 3. Betroffene Files

| File | Änderung | Risk |
|------|----------|------|
| `src/features/fantasy/types.ts:7` | `EventType` += `'user'` | low (löst tsc-Zwang aus = gewollt) |
| `src/types/index.ts:756` | `DbEvent.type` += `'user'` | low |
| `src/features/fantasy/helpers.ts:18` | `getTypeStyle` `case 'user'` | low |
| `src/components/ui/EventScopeBadge.tsx:26-38` | TYPE_CONFIG `user`-Eintrag | low (tsc-forced) |
| `src/components/fantasy/events/EventCategoryCards.tsx:93-99` | counts-Record `user`-Key | low (tsc-forced); CATEGORIES-Karte = 398 |
| `src/features/fantasy/services/events.mutations.ts` | + `createUserEvent` | med (Money-Wrapper) |
| `src/features/fantasy/hooks/useCreateUserEvent.ts` | **NEU** Hook | med (Wallet-Invalidate S371) |
| `src/components/fantasy/CreateEventModal.tsx` | Rewrite Mock→User-Event-Builder | med (größte Datei) |
| `src/app/(app)/fantasy/FantasyContent.tsx:175-177,323-327` | `handleCreateEvent` echt; `defaultGameweek`+`onCreated` an Modal | low |
| `src/features/fantasy/components/FantasyHeader.tsx:29` | Button-Gate `isAdmin`→alle eingeloggt | low |
| `src/features/fantasy/components/event-detail/JoinConfirmDialog.tsx:26` | Entkopplung `type==='user'` | low (compliance-relevant) |
| `src/lib/errorMessages.ts:10-57` | + Reject-Codes KNOWN_KEYS | low |
| `messages/de.json` + `messages/tr.json` | Builder-Form-Keys + Reject-Keys | low (DE+TR Pflicht) |

---

## 4. Code-Reading-Liste (VOR Implementation — bereits erledigt 2026-06-26)

1. **Live `create_user_event` functiondef** (Supabase MCP, D87) — ✅ gelesen. Param-Reihenfolge: `(p_user_id, p_name, p_entry_fee bigint(cents), p_gameweek int, p_locks_at timestamptz, p_reward_structure jsonb, p_min_entries?, p_max_entries?, p_league_id?, p_lineup_rules?)`. Return `{ok:true, event_id, fee_charged}` ODER `{ok:false, error:<code>, ...}`. Default-Gebühr `COALESCE(...,5000)` cents. **Reject-Codes:** `auth_uid_mismatch, name_required, invalid_entry_fee, invalid_gameweek, invalid_locks_at, invalid_reward_structure, reward_structure_not_100, invalid_min_entries, min_gt_max, wallet_not_found, insufficient_balance`. Setzt `currency='scout'`, `ticket_cost=entry_fee`, `club_id=NULL`, `prize_pool=0`, `status='registering'`. **`format` ist KEIN Param** → DB-Default (BUILD-Verify, s. Edge E7).
2. **`cancel_user_event` functiondef** — ✅ gelesen (Cancel-UI = 398, Service evtl. mit).
3. `events.mutations.ts:10-108` (`createEvent`) — ✅ reward_structure-Shape `[{rank,pct}]`; Service-Pattern (soft-return, kein throw).
4. `events.mutations.ts:443-531` (`lockEventEntry`/`cancelEventEntries`) — ✅ RPC-Wrapper-Vorbild für soft-return-RPCs.
5. `useEventActions.ts` (Hook-Pattern) — ✅ `useSafeMutation` + `invalidateWallet` + `/api/events?bust=1` + `switch(err.message)` onError.
6. `CreateEventModal.tsx` — ✅ IST-Mock (name/desc/mode/format/maxParticipants; buyIn/Preview hinter Flag).
7. `helpers.ts:18` getTypeStyle (✅ default vorhanden) + `getTierStyle` (✅ `'user'`-Tier existiert schon).
8. `JoinConfirmDialog.tsx:21-28` — ✅ einzige Flag-Gate-Stelle für Scout-Anzeige.
9. `FantasyHeader.tsx:29` — ✅ `isAdmin`-Gate.
10. `errorMessages.ts` — ✅ `mapErrorToKey`/KNOWN_KEYS/ERROR_MAP; 4 Codes mappen schon (`auth_uid_mismatch→notAuthenticated`, `insufficient_balance→insufficientBalance`, `event_not_found→eventNotFound`, `not_authorized→permissionDenied`), ~11 fallen auf `'generic'`.

---

## 5. Pattern-References

- **S371** (errors-frontend) — credit-belastende Mutation MUSS `qk.wallet.all` invalidieren (Header-Staleness). ← Erstell-Gebühr belastet Wallet.
- **S393** (errors-frontend) — RPC-Reject-Code ohne `mapErrorToKey`-Mapping → stiller `'generic'`-Toast. ← die ~11 Codes.
- **S149-151** (errors-frontend, D17/D18) — `useSafeMutation` synchroner Pending-Guard im Money-Path.
- **S330/S359** (errors-db) — Multi-File-Enum-Sync (hier: EventType-Union über 5 Lookups). tsc-Records = halb-automatischer Guard.
- **S198/S333** (errors-frontend) — neue `t()`-Keys SOFORT DE+TR, namespace-aware (Live-Render gegen MISSING_MESSAGE).
- **D108 V3** — User-Event-Money-Modell: Pot=Σ Eintritte, kein Seed, Ersteller zahlt nur Erstell-Gebühr→Topf.
- **business.md** — Phase 1 erlaubt „Events" + Credits (Spielgeld). Phase 3 Paid Fantasy (Echtgeld) bleibt gesperrt = Entkopplung statt Flag-Flip.
- **Modal-Pattern** (ui-components) — `preventClose={isPending}`, Mobile 393px, `inputMode="numeric"`.

---

## 6. Acceptance Criteria

- **AC-1 [HAPPY]** Eingeloggter Nicht-Admin sieht den „Erstellen"-Button im Fantasy-Header.
  VERIFY: FantasyHeader rendert Button ohne `isAdmin`. FAIL-IF: Button nur bei isAdmin.
- **AC-2 [HAPPY]** Builder-Submit mit gültigen Werten ruft `create_user_event` (korrekte Param-Reihenfolge, Eintritt in **cents**) → Event entsteht (`type='user'`, `currency='scout'`).
  VERIFY: Live-Playwright erstellt Event; `SELECT type,currency,entry_fee,reward_structure FROM events WHERE id=<neu>`. FAIL-IF: type≠'user' oder entry_fee in Credits statt cents.
- **AC-3 [MONEY]** Ersteller-Wallet wird um die Erstell-Gebühr (Default 5000 cents) belastet; Topf +5000 source `event_create_fee`; **Header-Credits aktualisieren sofort** (S371).
  VERIFY: Wallet-Delta + `get_platform_treasury_ledger` + Header-Reload-frei. FAIL-IF: Header bleibt stale.
- **AC-4 [HAPPY]** Neu erstelltes Event erscheint nach Erfolg in der Liste (refetch / bust).
  VERIFY: Event-Karte sichtbar ohne manuellen Reload.
- **AC-5 [MONEY-DISPLAY]** `JoinConfirmDialog` zeigt für `type='user'` den Credit-Eintritt (`X Credits`), NICHT „Gratis" — obwohl `PAID_FANTASY_ENABLED=false`. Club/Sponsor-Events bleiben unverändert.
  VERIFY: Code-Pfad `event.type==='user'` + Live-Render. FAIL-IF: user-Event zeigt „Gratis" ODER club-Event zeigt plötzlich Scout-Preis.
- **AC-6 [TYPE]** `tsc --noEmit` grün nach EventType-`'user'`-Addition (Records gepflegt). Event-Badge eines user-Events rendert (kein Crash, orange UserPlus).
  VERIFY: `pnpm exec tsc --noEmit`. FAIL-IF: Record-Type-Error oder Badge-fallback-bescout.
- **AC-7 [REJECT]** Server-Reject (z.B. `min_gt_max`, `reward_structure_not_100`, `insufficient_balance`) → spezifischer Toast (nicht „Ein Fehler ist aufgetreten").
  VERIFY: `mapErrorToKey('min_gt_max')!=='generic'`; DE+TR-Key existiert. FAIL-IF: generic.
- **AC-8 [GUARD]** Client validiert VOR RPC: Name≥1, Eintritt≥0, min≤max, locks_at>jetzt, Preset-Summe=100 → kein unnötiger RPC-Call.
- **AC-9 [PENDING]** Während Submit: Button disabled + Spinner, Modal `preventClose` (kein ESC/Backdrop mid-Tx).
- **AC-10 [i18n]** Alle neuen Builder- + Reject-Strings DE+TR, namespace-korrekt, kein MISSING_MESSAGE (Live-Console).
- **AC-11 [MOBILE]** Builder auf 393px ohne Overflow, `inputMode="numeric"` auf Zahlfeldern, Touch-Targets ≥44px.

---

## 7. Edge Cases

| # | Fall | Verhalten |
|---|------|-----------|
| E1 | Eintritt = 0 Credits | RPC erlaubt (entry_fee≥0). Pot=0 → Event ohne Geld. Client-Warnhinweis „Pot = Summe der Eintritte" (kein Block). |
| E2 | Ungenügendes Guthaben für Erstell-Gebühr | RPC `insufficient_balance` → spezifischer Toast (mappt schon). Client kann Guthaben vorab prüfen (optional). |
| E3 | locks_at in Vergangenheit | Client blockt (`>now`); RPC `invalid_locks_at` als 2. Netz. |
| E4 | min > max | Client blockt; RPC `min_gt_max` als 2. Netz. |
| E5 | Reward-Preset (immer Summe 100) | `reward_structure_not_100` praktisch unerreichbar; trotzdem gemappt. |
| E6 | Doppel-Klick Submit | `useSafeMutation` synchroner Guard → 1 RPC. |
| E7 | `format` nicht von RPC gesetzt | **BUILD-VERIFY:** `events.format`-Default prüfen (`\d events` / column_default). Wenn NULL → Lineup-Builder-Risiko → Scope-Out-Note + ggf. winziger RPC-Follow-up (E-4a-Gap, dokumentieren, NICHT in 397 die RPC ändern ohne CEO). |
| E8 | Gameweek default | = aktive GW (`gw.activeGw ?? store.currentGw`), Stepper min=aktiv..38. |
| E9 | unauth (theoretisch) | Page auth-guarded; RPC `auth_uid_mismatch` fail-closed. |
| E10 | TR-Locale | alle Strings vorhanden; Disclaimer TR. |

---

## 8. Self-Verification Commands

```bash
# Verkabelung existiert jetzt
grep -rn "create_user_event" src/   # erwartet: ≥1 (Service)
# Typ-Union vollständig
grep -n "'user'" src/features/fantasy/types.ts src/types/index.ts
# Reject-Codes gemappt (keiner mehr generic)
node -e "const m=require('./src/lib/errorMessages'); ['min_gt_max','reward_structure_not_100','invalid_locks_at','name_required','event_not_open','not_user_event'].forEach(c=>console.log(c, m.mapErrorToKey(c)))"
# i18n DE+TR Parität neue Keys
grep -c "createUserEvent\|rewardPreset\|entryFeeCredits" messages/de.json messages/tr.json
# tsc + Tests
pnpm exec tsc --noEmit
CI=true pnpm exec vitest run src/features/fantasy/services/__tests__/  # createUserEvent
# Wallet-Invalidate vorhanden (S371)
grep -n "invalidateWallet\|wallet.all\|/api/events?bust=1" src/features/fantasy/hooks/useCreateUserEvent.ts
```

---

## 9. Open-Questions

- **CEO-Zone (entschieden, §0):** Entkopplung · Wer-erstellt · Slice-Split. ✅
- **Autonom-Zone (CTO, ich entscheide):** Reward-Presets statt Freiform-Editor; locks_at = `datetime-local`-Picker (Default GW-erstes-Fixture falls verfügbar, sonst now+48h) — fixture-aware Default ist 398-Polish; Builder-Feldreihenfolge/Styling; neuer Hook-File vs. in useEventActions (→ neuer File `useCreateUserEvent.ts`, saubere Trennung).
- **BUILD-Verify (nicht blockierend):** `events.format`-Default (E7). Falls problematisch → dokumentieren, nicht heimlich RPC patchen.

---

## 10. Proof-Plan

1. **Service-vitest** `createUserEvent` (mock `supabase.rpc`): Happy (ok→eventId) + Reject (ok:false→throw mit Code). Output → `worklog/proofs/397-service-test.txt`.
2. **Live-Playwright** gegen bescout.net (`jarvis-qa@bescout.net`): Builder öffnen → Event erstellen → DB-Reconcile (`type='user'`, entry_fee cents) + Wallet−Gebühr + Topf+Gebühr + Header-sofort-Update + Event in Liste + JoinConfirmDialog zeigt Credit-Eintritt. Screenshot + SQL-Reconcile → `worklog/proofs/397-live-create.png` + `.txt`. (Geseedetes Live-Artefakt = E2E-Beweis, permanent.)
3. **tsc**-grün (Voraussetzung) + Reject-Mapping-Output.

---

## 11. Scope-Out (NICHT in 397)

- Öffentliche Discovery / User-Event-Karte in `EventCategoryCards.CATEGORIES` / `EventBrowser`-Filter-Pille → **398**.
- Live-Pot-Vorschau (Σ Eintritte) → 398.
- Cancel-UI (`cancel_user_event`) → 398 (Service evtl. mit, UI nicht).
- Admin-Gebühr-Slider (`set_user_event_create_fee`) → 398.
- `min_entries`-Anzeige + Select-Listen-Ergänzung (`events.queries.ts:25/38/126`) → 398 (Read-Pfad `/api/events` = `SELECT *` reicht für 397).
- Custom-Reward-Editor (Freiform-pct) → später.
- `creator`-fee_config-orphan-Cleanup → E-7.
- RPC-Änderungen (E-4a ist approbiert/eingefroren) — nur dokumentieren, nicht patchen.

---

## 12. Stage-Chain (geplant)

SPEC ✅ → IMPACT (dünn — Fläche in `396-impact.md` §B/§F/§H + Explore-Map bereits kartiert; `impact: reuse 396 + Explore`) → BUILD (1 File/Mal, tsc nach jedem) → REVIEW (Pflicht, money-nah, reviewer-Agent) → PROVE (Service-vitest + Live-Playwright) → LOG (+ Knowledge: errors-frontend S393-Anwendung, fantasy.md User-Event-Builder-Note).

## 13. Pre-Mortem (optional bei M — 4 Szenarien)

1. **EventType-`'user'`-Addition bricht ungesehene Consumer** (nicht nur Badge/CategoryCards). → Mitigation: nach Addition `tsc` + grep aller `EventType`-Switches (`getTypeStyle`, EventBrowser, Filter); Records sind tsc-forced, Switches haben default.
2. **Entkopplung deckt versehentlich Paid-Fantasy auf** (club/sponsor-Events zeigen Scout-Preis). → Mitigation: Bedingung exakt `type==='user' ||` (nicht `currency==='scout' ||`); AC-5 prüft club-Event bleibt unverändert.
3. **Header-Staleness nach Erstell-Gebühr** (S371-Falle). → Mitigation: Hook invalidiert `wallet.all` + AC-3 Live-Verify reload-frei.
4. **entry_fee in Credits statt cents an RPC** (×100-Fehler = Money-Bug). → Mitigation: Builder-Input in Credits, Service ×100→cents an einer Stelle; AC-2 DB-Reconcile prüft cents; Service-vitest deckt Umrechnung.
