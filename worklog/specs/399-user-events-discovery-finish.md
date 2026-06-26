# Slice 399 — E-4b Teil 2: User-Events fertig machen

**Größe:** M
**Slice-Type:** UI (+ Service + Hook + i18n) — money-nah (Cancel ruft Refund-RPC, Admin-Slider setzt Gebühr), Reviewer Pflicht.
**Epic:** E-4b Teil 2 (`worklog/notes/event-creator-liga-epic.md`) · folgt auf 397 (Builder) + 398 (bench-i18n). Schließt das User-Events-Feature ab (Anti-„Build-without-Wire", D53).

---

## 0. CEO-Kontext + Design-Smell (gemeldet 2026-06-26)

Anil hat „E-4b Teil 2 (Slice 399)" gewählt (AskUserQuestion). **Gemeldeter Design-Smell (Anil-Wunsch „schlechte Patterns melden"):** Die Event-Discovery zeigt eine tote **`creator`-Kategorie** (orange „Creator"-Karte in `EventCategoryCards` + Filter-Pille in `EventBrowser`) — Prod hat **0 `creator`-Events** und der Typ ist laut D108 deprecated („NICHT nutzen"). Der echte **`user`-Typ** (1 Live-Event) hat **keine Karte/Pille**. → Fix = `creator`→`user` ersetzen (orange `UserPlus`-Optik war dafür gedacht). Das ist die E-7-„Event-Type-Drift"-Aufräumung, liegt direkt im Discovery-Pfad → hier mit-erledigt. **CTO-Entscheid** (safe: 0 creator-Events; D108-konform).

---

## 1. Problem-Statement

Slice 397/398 haben User-Events **erstellbar** gemacht (Builder→`create_user_event`, Credit-Eintritt sichtbar). Aber das Feature ist halb verkabelt (Evidence = Live-Audit 2026-06-26):
- **Discovery-Lücke:** `EventCategoryCards.CATEGORIES` (`EventCategoryCards.tsx:29-78`) + `EventBrowser.CATEGORIES` (`EventBrowser.tsx:18-26`) kennen kein `user` — nur tote `creator`-Karte. Nutzer finden User-Events nur in „Alle".
- **F2/F3 Anzeige-Bug:** `EventCardView.tsx:113-115` rendert `🎟 {ticketCost} Tickets` **währungsblind** → bei `currency='scout'` zeigt es rohe cents („1000 Tickets" statt „10 Credits"). (Der zentrale `formatEventCost`-Helper ist bereits währungs-bewusst — Bug ist nur die separate 🎟-Chip; EventDetail-Meta mit-prüfen.)
- **Kein Cancel-UI:** `cancel_user_event` (Refund + status='cancelled') existiert (396), ist aber nirgends aufrufbar. Ein Ersteller kann sein Event nicht absagen (z. B. wenn `min_entries` nie erreicht).
- **Kein Admin-Gebühr-Slider:** `set_user_event_create_fee` (platform_admin) existiert, Default 5000 cents (50 Cr), aber Admin kann ihn in keiner UI ändern.
- **`min_entries` unsichtbar:** wird im Builder gesetzt (397), aber nirgends angezeigt. 3 explizite Select-Listen (`events.queries.ts:25/38/126`) ziehen die Spalte nicht (S200-Klasse).

---

## 2. Lösungs-Design

Sechs additive UI-Bausteine + zwei money-nahe RPC-Wrapper. Reihenfolge nach Risiko/Abhängigkeit:

1. **Mapper/Type erweitern** (Fundament für 3+4): `FantasyEvent` += `createdBy?: string | null` + `minEntries?: number | null`; `eventMapper.ts` mappt `db.created_by` + `db.min_entries`. `DbEvent` hat `min_entries` schon? → BUILD-Verify (sonst Type-Add). 3 Select-Listen += `min_entries`.
2. **F2/F3** — 🎟-Chip in `EventCardView` nur bei `currency==='tickets'` zeigen (scout-Kosten stehen schon via `formatEventCost` in Row 5 + CTA). EventDetailModal-Kosten-Meta mit-prüfen (gleiche Currency-Logik wie `JoinConfirmDialog`).
3. **Discovery** — `creator`→`user` in beiden CATEGORIES-Arrays (orange `UserPlus`, kein image/badge). `counts`-Maps haben `user` schon. i18n `eventCategories.user` (+ `creator`-Key bleibt vorerst, 0 Consumer nach Swap → optional E-7-Delete).
4. **min_entries-Anzeige** — kleine Chip/Zeile in `EventCardView` + EventDetail wenn `minEntries` gesetzt: „min. {n} Teilnehmer" (DE/TR). Nur user-Events haben es (sonst null → nicht rendern).
5. **Cancel-UI** (money-nah) — Service `cancelUserEvent(eventId)` (soft-return, Vorbild `cancelEventEntries`) + Hook `useCancelUserEvent` (`useSafeMutation`, nach Erfolg `qk.wallet.all` [Refund→locked_balance, S371] + `/api/events?bust=1` + `qk.events.all`). Cancel-Button in `EventDetailModal`, sichtbar **nur** wenn `type==='user' && createdBy===userId && status∈{registering,late-reg}`. `ConfirmDialog` (destruktiv, preventClose). Reject-Codes (`not_user_event`/`event_not_open`/`not_authorized`/`event_not_found`) → `errorMessages.ts` (S393).
6. **Admin-Gebühr-Slider** — Service `setUserEventCreateFee(cents)` + Hook + Read der aktuellen Gebühr (`platform_event_config`). Input (Credits) in `AdminEventsManagementTab` neben dem `scout_events_enabled`-Toggle. Reject `invalid_amount`/`not_authorized` (mappt teils schon).
7. **Live-Pot-Vorschau** — leichter Hinweis im Builder: „Pot wächst mit jedem Eintritt" (statisch, da Pot=Σ Eintritte virtuell) + in EventDetail/Card für laufende user-Events optional „Pot ≈ {participants}×{entryFee}" als Klartext. **Scope-Minimal:** statischer Builder-Hinweis genügt; dynamische Pot-Zahl nur wo `participants` schon da ist.

**Bewusst KEIN** Freiform-Reward-Editor (Presets reichen, 397-Scope-Out bleibt) · **KEIN** DB-Cleanup der orphan `event_fee_config('creator')`-Zeile (E-7, separater Migration-Slice).

---

## 3. Betroffene Files

| File | Änderung | Risk |
|------|----------|------|
| `src/features/fantasy/types.ts:34` | `FantasyEvent` += `createdBy`, `minEntries` | low |
| `src/features/fantasy/mappers/eventMapper.ts:18` | map `created_by` + `min_entries` | low |
| `src/types/index.ts` (`DbEvent`) | `min_entries`/`created_by` vorhanden? sonst += | low (BUILD-Verify) |
| `src/features/fantasy/services/events.queries.ts:25,38,126` | Select-Listen += `min_entries`, `created_by` | low (S200) |
| `src/components/fantasy/events/EventCardView.tsx:113` | 🎟-Chip nur `currency==='tickets'`; min_entries-Chip | low (F2/F3) |
| `src/components/fantasy/events/EventCategoryCards.tsx:60-68,93-101` | `creator`→`user` | low (user-facing, 0 creator-Events) |
| `src/components/fantasy/events/EventBrowser.tsx:24,71-74` | `creator`→`user` Pille | low |
| `src/components/fantasy/CreateEventModal.tsx:255` | statischer Pot-Wächst-Hinweis | low |
| `src/components/fantasy/EventDetailModal.tsx` | Cancel-Button (creator-only) + ConfirmDialog | med (money-nah) |
| `src/features/fantasy/services/events.mutations.ts` | + `cancelUserEvent`, + `setUserEventCreateFee` | med (Money-Wrapper) |
| `src/features/fantasy/hooks/useCancelUserEvent.ts` | **NEU** | med (S371-Invalidate) |
| `src/app/(app)/bescout-admin/AdminEventsManagementTab.tsx` | Gebühr-Input + Hook | low (admin) |
| `src/lib/errorMessages.ts` | Cancel-Reject-Codes KNOWN_KEYS | low (S393) |
| `messages/de.json` + `messages/tr.json` | neue Keys (eventCategories.user, minEntries-Anzeige, cancel, adminFee, pot-Hint, reject) | low (DE+TR Pflicht) |
| `src/features/fantasy/helpers.ts:23` | `creator`-case in getTypeStyle bleibt (dead-but-harmless) | none (kein Change) |

---

## 4. Code-Reading-Liste (VOR Implementation — erledigt 2026-06-26)

1. **Live `cancel_user_event` functiondef** (Supabase MCP, D87) — ✅ `(p_event_id uuid)`; auth.uid()=created_by ODER platform_admin; status∈{registering,late-reg}; refundet `event_entries` (scout, amount_locked>0) per `locked_balance -=` + tx `event_entry_unlock`; DELETE holding_locks/entries/lineups; status='cancelled', current_entries=0. **Reject:** `event_not_found, not_user_event, not_authorized, event_not_open`. Return `{ok:true, refunded_count}`.
2. **Live `set_user_event_create_fee` functiondef** — ✅ `(p_cents bigint)`; platform_admin-Gate; `p_cents>=0`; UPDATE `platform_event_config`. **Reject:** `not_authorized, invalid_amount`. Aktuell `user_event_create_fee_cents=5000`.
3. `events.mutations.ts` (`createUserEvent` 397 + `cancelEventEntries`) — ✅ soft-return `{ok,error}`-Pattern, kein throw im Service.
4. `useCreateUserEvent.ts` (397) — ✅ Hook-Vorbild: `useSafeMutation` + invalidateWallet + `/api/events?bust=1` + `qk.events.all`.
5. `eventMapper.ts` — ✅ kein `created_by`/`min_entries` gemappt; `creatorId` ungenutzt.
6. `helpers.ts:94` `formatEventCost` — ✅ schon währungs-bewusst (scout→`X CR`, tickets→`X Tickets`); Bug ist nur die separate 🎟-Chip.
7. `EventCardView.tsx` / `EventCompactRow.tsx` — ✅ beide nutzen `formatEventCost` (Row5/CTA korrekt); nur Card-Row-4-Chip blind.
8. `JoinConfirmDialog.tsx:23-30` — ✅ korrektes Currency-Pattern (isScoutCurrency/isTicketCurrency) als Vorbild.
9. `EventCategoryCards.tsx` + `EventBrowser.tsx` — ✅ `counts` haben `user`; CATEGORIES-Arrays haben `creator`, kein `user`.
10. `EventDetailModal.tsx:52-63,188-402` — ✅ `onReset`/`onLeave`-Pattern + ConfirmDialog-Mechanik (resetConfirmOpen/leaveConfirmOpen) als Vorbild für Cancel-Confirm.
11. `AdminEventsManagementTab.tsx` + `BescoutAdminContent.tsx` — ✅ Heimat des `scout_events_enabled`-Toggles → Gebühr-Input daneben.
12. `errorMessages.ts` — ✅ `not_authorized→permissionDenied`, `event_not_found→eventNotFound` mappen; `not_user_event`/`event_not_open` fehlen.

---

## 5. Pattern-References

- **S371** (errors-frontend) — Cancel refundet → `locked_balance`; Hook MUSS `qk.wallet.all` invalidieren (Header-Staleness).
- **S393** (errors-frontend) — Cancel-Reject-Codes ohne `mapErrorToKey` → stiller `generic`-Toast. Alle 4 Codes mappen + DE/TR.
- **S397/398** (errors-frontend) — dormanten Pfad sichtbar machen → 1× Live-Render-Console-Scan auf MISSING_MESSAGE (neue Discovery-Karte rendert erstmals).
- **S200** (errors-frontend) — `ALTER`-Spalte (`min_entries`) → ALLE expliziten Select-Listen nachziehen, sonst kommt sie nie zurück (Type-Cast lügt null).
- **S149-151/D18** (errors-frontend) — `useSafeMutation` synchroner Pending-Guard (Cancel = Money-nah).
- **S254 Cache-Invalidation** — Root-Prefix `['events']` nach Cancel.
- **D108 V3** — User-Event-Modell (Pot=Σ Eintritte, kein Seed); `creator`-Typ deprecated.
- **Modal/ui-components** — `ConfirmDialog` statt native confirm; `preventClose={isPending}`; Mobile 393px; Touch ≥44px; `inputMode="numeric"`.

---

## 6. Acceptance Criteria

- **AC-1 [DISCOVERY]** `EventCategoryCards` + `EventBrowser` zeigen eine **„User"-Kategorie** (orange UserPlus); **keine** „Creator"-Karte mehr. Klick filtert auf `type==='user'`.
  VERIFY: Live-Render + `grep -n "'creator'" EventCategoryCards.tsx EventBrowser.tsx` = 0. FAIL-IF: Creator-Karte sichtbar ODER user fehlt.
- **AC-2 [F2/F3]** Ein `currency='scout'` user-Event zeigt **NIE** „🎟 {cents} Tickets". Eintritt erscheint als Credits (`formatEventCost`→`CR`); 🎟-Chip nur bei `currency='tickets'`.
  VERIFY: Live-Card des Live-User-Events; kein „1000 Tickets". FAIL-IF: rohe cents/🎟 bei scout.
- **AC-3 [CANCEL-HAPPY, MONEY]** Ersteller öffnet sein user-Event (registering) → „Absagen"-Button → ConfirmDialog → `cancel_user_event` → status='cancelled', Teilnehmer-Refund, **Header-Credits sofort** (S371), Event verschwindet/zeigt cancelled.
  VERIFY: Live-Playwright + `SELECT status FROM events` + Wallet-Reconcile. FAIL-IF: Button fehlt beim Ersteller ODER Header stale.
- **AC-4 [CANCEL-GUARD]** Cancel-Button **nicht** sichtbar für Nicht-Ersteller / Nicht-user-Events / status∉{registering,late-reg}. Server-Reject (`not_authorized`/`event_not_open`) → spezifischer Toast.
  VERIFY: Code-Gate `createdBy===userId && type==='user' && status∈…`; `mapErrorToKey('event_not_open')!=='generic'`. FAIL-IF: Button bei club-Event/Fremd-Event.
- **AC-5 [ADMIN-FEE]** Platform-Admin sieht/ändert die Erstell-Gebühr in `AdminEventsManagementTab` (Credits-Input) → `set_user_event_create_fee` → `platform_event_config.user_event_create_fee_cents` aktualisiert.
  VERIFY: Live-Write + `SELECT user_event_create_fee_cents`. FAIL-IF: kein Input ODER Wert nicht persistiert.
- **AC-6 [MIN-ENTRIES]** Ein user-Event mit `min_entries` zeigt „min. {n} Teilnehmer" auf Card/Detail; ohne → nichts. 3 Select-Listen liefern `min_entries`.
  VERIFY: Live-Card + `grep min_entries events.queries.ts` = ≥3. FAIL-IF: immer null trotz gesetztem Wert.
- **AC-7 [TSC]** `pnpm exec tsc --noEmit` grün (FantasyEvent-Felder + Records gepflegt).
- **AC-8 [i18n]** Alle neuen Strings DE+TR, namespace-korrekt, kein MISSING_MESSAGE (Live-Console).
- **AC-9 [PENDING]** Cancel-Submit: Button disabled+Spinner, ConfirmDialog `preventClose`.
- **AC-10 [MOBILE]** Discovery-Karte + Cancel-Dialog + Admin-Input auf 393px ohne Overflow, Touch ≥44px, `inputMode="numeric"`.
- **AC-11 [REGRESSION]** Club/Sponsor/BeScout/Special-Events unverändert (Discovery-Reihenfolge, Kosten-Anzeige, kein neuer Cancel-Button).

---

## 7. Edge Cases

| # | Fall | Verhalten |
|---|------|-----------|
| E1 | user-Event ohne `min_entries` (null) | Chip nicht rendern (kein „min. null"). |
| E2 | Cancel eines bereits laufenden/ended Events | Button nicht sichtbar (status-Gate); RPC `event_not_open` als 2. Netz. |
| E3 | Nicht-Ersteller sieht fremdes user-Event | kein Cancel-Button; RPC `not_authorized` fail-closed. |
| E4 | Admin-Gebühr = 0 | RPC erlaubt (`>=0`) → Erstellen gratis. Kein Block, Hinweis genügt. |
| E5 | Admin-Gebühr negativ/leer | Client-Guard + RPC `invalid_amount`. |
| E6 | Cancel mit 0 Teilnehmern | RPC ok, `refunded_count=0`, Event cancelled. |
| E7 | `creator`-Event existiert doch (Legacy) | Prod=0; falls je eines → fällt in „Alle" + getTypeStyle hat `creator`-case noch → kein Crash. |
| E8 | Doppelklick Cancel | `useSafeMutation` synchroner Guard → 1 RPC. |
| E9 | min_entries-Chip bei tickets/club-Event | nur user-Events haben min_entries → null sonst → nicht gerendert. |
| E10 | TR-Locale | alle neuen Keys TR vorhanden. |
| E11 | Refund-Race (Cancel während Join) | RPC `FOR UPDATE` auf events serialisiert; entries-DELETE atomar. |

---

## 8. Self-Verification Commands

```bash
# creator komplett aus Discovery raus
grep -n "'creator'" src/components/fantasy/events/EventCategoryCards.tsx src/components/fantasy/events/EventBrowser.tsx   # erwartet: 0
# user in beiden Discovery-Arrays
grep -n "type: 'user'\|id: 'user'" src/components/fantasy/events/EventCategoryCards.tsx src/components/fantasy/events/EventBrowser.tsx
# F2/F3: 🎟-Chip currency-gated
grep -n "ticketCost\|currency" src/components/fantasy/events/EventCardView.tsx
# Cancel verkabelt
grep -rn "cancel_user_event\|cancelUserEvent" src/features/fantasy/services/ src/features/fantasy/hooks/
# Wallet-Invalidate (S371)
grep -n "wallet.all\|invalidateWallet\|/api/events?bust=1" src/features/fantasy/hooks/useCancelUserEvent.ts
# min_entries in Select-Listen
grep -c "min_entries" src/features/fantasy/services/events.queries.ts   # erwartet: >=3
# Reject-Mapping
node -e "const m=require('./src/lib/errorMessages'); ['not_user_event','event_not_open','not_authorized','invalid_amount'].forEach(c=>console.log(c, m.mapErrorToKey(c)))"
# i18n DE+TR Parität neue Keys
grep -c "userEventCancel\|adminUserEventFee\|minEntriesLabel\|eventCategories" messages/de.json messages/tr.json
pnpm exec tsc --noEmit
CI=true pnpm exec vitest run src/features/fantasy/services/__tests__/
```

---

## 9. Open-Questions

- **CEO-Zone (gemeldet, CTO-entschieden, §0):** `creator`→`user` Discovery-Swap (safe: 0 creator-Events, D108-konform). Anil kann vetoen.
- **Autonom-Zone (CTO):** min_entries-Chip-Styling; Cancel-Button-Platzierung in EventDetailModal (Footer/Header creator-Zone); Pot-Vorschau = statischer Hinweis (kein Live-Tick); Gebühr-Input als Number-Field (kein echter Slider — präziser für Geld); „CR" vs „Credits" Wording bleibt `formatEventCost`-konsistent (kein globaler Rename = Scope-Creep).
- **Scope-Out bestätigt:** Freiform-Reward-Editor + `event_fee_config('creator')`-DB-Cleanup (E-7) NICHT hier.

---

## 10. Proof-Plan

1. **Service-vitest** `cancelUserEvent` + `setUserEventCreateFee` (mock `supabase.rpc`): Happy (ok) + Reject (ok:false→throw Code). → `worklog/proofs/399-service-test.txt`.
2. **Live-Playwright** gegen bescout.net (`jarvis-qa@bescout.net` + `ali@test.bescout.de`/123456 für Admin/Creator):
   - User-Discovery-Karte sichtbar, Filter wirkt; kein Creator-Karte.
   - Live-User-Event-Card: Credits statt „Tickets" (F2/F3).
   - Ersteller (ali) sagt ein Test-User-Event ab → cancelled + Header-Update + Wallet-Reconcile.
   - Admin ändert Gebühr → DB-Reconcile.
   - Console 0 MISSING_MESSAGE (DE+TR).
   - Screenshots + SQL → `worklog/proofs/399-*.png`/`.txt`.
3. **tsc** grün + Reject-Mapping-Output.

---

## 11. Scope-Out (NICHT in 399)

- Freiform-Reward-Editor (Presets bleiben).
- DB-Cleanup orphan `event_fee_config('creator')`-Zeile + `getTypeStyle('creator')`-case → **E-7**.
- Dynamische Live-Pot-Zahl mit Sekunden-Tick (statischer Hinweis genügt).
- Liga-Bindung im User-Builder (späterer Slice, 397-Scope-Out).
- RPC-Änderungen (E-4a eingefroren) — nur aufrufen, nicht patchen.
- Friends/private Scope (E-4-Roadmap später).

---

## 12. Stage-Chain (geplant)

SPEC ✅ → IMPACT (`impact: reuse 396-impact §B/§F/§H + diese Spec §3` — dünn, Fläche kartiert) → BUILD (1 File/Mal, tsc nach jedem; money-nahe Cancel-/Fee-Wrapper sorgfältig) → REVIEW (Pflicht, money-nah, reviewer-Agent) → PROVE (Service-vitest + Live-Playwright) → LOG (+ Knowledge: errors-frontend S393/S200-Anwendung, fantasy.md User-Event-Discovery-Note, Epic E-4b-Teil-2-Abschluss).

## 13. Pre-Mortem (M — 4 Szenarien)

1. **`creator`→`user`-Swap bricht ungesehene Consumer** (getTypeStyle/EventTypeBadge/Filter). → Mitigation: `getTypeStyle` hat `user`-case schon; `grep creator src/` nach Swap; counts-Maps haben `user`; tsc.
2. **Cancel-Refund + Header-Staleness** (S371). → Mitigation: Hook invalidiert `wallet.all`; AC-3 Live reload-frei.
3. **min_entries kommt immer null** (S200 — Select-Liste vergessen). → Mitigation: 3 Listen + `/api/events`-Pfad prüfen; AC-6 Live mit gesetztem Wert.
4. **Cancel-Button bei falschem Event sichtbar** (Gate zu lose). → Mitigation: exakt `type==='user' && createdBy===userId && status∈{registering,late-reg}`; AC-4 prüft club-Event bleibt ohne Button. Mapper muss `created_by` liefern (sonst undefined→Button nie sichtbar = fail-safe).
