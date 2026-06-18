# Slice 334 — Polls P2: player_id-Bezug + Discovery (Anker-Filter Verein/Spieler)

**Slice-Type:** Migration + Service + UI (cross-domain)
**Größe:** L
**CEO-Scope:** Ja (Scope vorab freigegeben — Anil 2026-06-18: Anker-Filter-Chips mittel + alle Typen). KEIN Money-Path (kein D87-Zwang, aber Schema-Change → /impact Pflicht).

---

## 1. Problem-Statement (Evidence)

Umfragen (`community_polls`, seit Slice 333 erstellbar) haben heute nur einen **Vereins-Bezug** (`club_id`), keinen **Spieler-Bezug**, und der Community-Feed bietet **keine Discovery nach Verein/Spieler** — nur Typ-Filter (`all/posts/rumors/research/bounties/votes/news`) + eine Textsuche, die `player_name` nur bei Posts matcht (`CommunityFeedTab.tsx:255`).

**Canon (D86, `docs/knowledge/domain/polls.md` §4/§5/§8/§10):**
- §4: „Eine Umfrage kann sich beziehen auf Verein, Spieler oder beides. Heute: `community_polls` hat nur `club_id`, kein `player_id`. Bounties + Research tragen `player_id` bereits → Vorlage."
- §5: „Fan tippt seinen Lieblings-Stürmer an → sieht alle Umfragen + bezahlten Reports zu genau dem Spieler." → erst Discovery macht die P1-Geldmaschine auffindbar.
- §10 Merksatz: „Jeder Inhalt kriegt zwei Anker — welcher Verein, welcher Spieler — und über genau die kann gesucht/gefiltert werden."

**Verifizierter Anker-Bestand (grep 2026-06-18):** Research (`club_id`+`player_id`+`player_name`), Bounty (`club_id`+`player_id`+`player_name`), Post (`club_id`+`player_id`+`player_name`) tragen beide Anker schon. **Poll fehlt `player_id`.** Club-Vote trägt nur `club_id`.

---

## 2. Lösungs-Design

**Teil A — Spieler-Bezug für Polls (Schema):**
1. `community_polls.player_id uuid NULL REFERENCES players(id) ON DELETE SET NULL` (optionaler Anker, analog Bounty).
2. `create_community_poll`-RPC um `p_player_id uuid DEFAULT NULL` erweitern (alte 8-arg-Signatur droppen → pg_proc-Ambiguity; AR-44 REVOKE/GRANT renew). Light-Guard: wenn gesetzt, muss Spieler existieren (`invalid_player`).
3. Types (`DbCommunityPoll.player_id`, `CreateCommunityPollParams.playerId`, `CommunityPollWithCreator.player_name?/player_position?`).
4. Service `createCommunityPoll` reicht `p_player_id` durch; `getCommunityPolls` resolved Spieler-Namen (Batch-Query, analog Creator-Profile-Resolution).
5. `CreatePollModal` bekommt optionalen Spieler-Tag (Picker, reuse `usePlayerNames` + bestehendes Picker-Pattern aus CreateResearchModal). Gilt für `source='user'` UND `source='club'`.

**Teil B — Discovery (Anker-Filter über alle Typen):**
6. **Suche erweitern** (`CommunityFeedTab` `searchedItems`): matcht zusätzlich Spieler-Name + Verein-Name (via `getClub(club_id)?.name/short`) über ALLE Feed-Typen (heute nur Post-`player_name`).
7. **Anker-Chip-Leiste** oben im Feed: aus dem *pre-anchor* gefilterten Set (Typ+Following+Suche) abgeleitete distinkte Verein- + Spieler-Anker als horizontale, scrollbare Chips. Single-Select → filtert ALLE Typen auf `club_id === anchorId || player_id === anchorId`. Aktiver Chip + „× entfernen". **§254-konform:** Chip-Liste wird unabhängig vom aktiven Anker berechnet (kein Catch-22), Club-Vote nur per Verein-Anker.

**HOW-Entscheidung (CTO):** Anker-Setzung über Chip-Leiste (1 File, selbst-contained), NICHT über klickbare Card-Tags (5 Komponenten, Kollision mit `/player`-Navigation) → siehe Scope-Out.

---

## 3. Betroffene Files

| File | Änderung | Begründung |
|------|----------|-----------|
| `supabase/migrations/20260618140000_slice_334_poll_player_anchor.sql` | NEU | player_id-Spalte + RPC-Erweiterung |
| `src/types/index.ts` | DbCommunityPoll + CreateCommunityPollParams + CommunityPollWithCreator | Anker-Feld + Player-Name-Resolution |
| `src/lib/services/communityPolls.ts` | createCommunityPoll (p_player_id) + getCommunityPolls (player-name-resolve) | Durchreichen + Anzeige/Suche |
| `src/components/community/CreatePollModal.tsx` | optionaler Spieler-Picker | Bezug setzen bei Erstellung |
| `src/components/community/CommunityFeedTab.tsx` | Suche erweitern + Anker-Chip-Leiste + Filter | Discovery |
| `messages/de.json` + `messages/tr.json` | community-Namespace: pollPlayerLabel, pollPlayerPlaceholder, anchorFilterAll, anchorClear, ggf. anchorPlayer/anchorClub | i18n DE+TR |
| `src/components/community/CommunityPollCard.tsx` | (optional) Spieler-Tag anzeigen wenn gesetzt | Konsistenz mit Research/Bounty-Card |

---

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

1. **`pg_get_functiondef('public.create_community_poll(...)')` LIVE** — exakte aktuelle Signatur/Body als Drop/Replace-Baseline (NICHT nur die 333-Migrations-Datei; D87-Prinzip auch ohne Money). Prüfen: welche 8-arg-Signatur droppen.
2. `supabase/migrations/20260618120000_slice_333_polls_create_treasury.sql` — Slice-333-Vorlage (RPC-Struktur, REVOKE/GRANT, Validierungs-Returns) ✅ gelesen.
3. `src/lib/services/communityPolls.ts` — createCommunityPoll-Params + getCommunityPolls Creator-Resolve-Pattern (Vorlage für Player-Resolve) ✅ gelesen.
4. `src/components/community/CreatePollModal.tsx` — Modal-State + handleCreate + CreatePollButton (Follower-Tor) ✅ gelesen.
5. `src/components/community/CreateResearchModal.tsx` — **Spieler-Picker-Pattern** (`players`-Prop, Picker-UI, Selektion) — Vorlage für Poll-Picker. ZU LESEN.
6. `src/components/community/CommunityFeedTab.tsx` — feedItems/searchedItems/sortedItems + FILTER_OPTIONS + Render-Switch ✅ gelesen.
7. `src/types/index.ts` 1018-1071 (Poll-Types), 264-272 (Research), 1474-1503 (Bounty), 1208-1219 (Post) — Anker-Feld-Vorlagen ✅ gelesen.
8. `src/lib/clubs.ts` — `getClub(id)` Sync-Cache-Shape (name/short/league_id) für Verein-Anker-Label + Such-Match. ZU LESEN (Konflikt-Cache Slice 276 beachten: `getClub` by id ist eindeutig).
9. `src/lib/queries` — `usePlayerNames` Return-Shape (PlayerName-Type: id/first/last/position?) für Picker + Anker-Label. ZU LESEN.
10. `src/components/community/CommunityPollCard.tsx` — wo Spieler-Tag einfügen (analog ResearchCard/BountyCard). ZU LESEN.
11. `src/components/community/__tests__/CommunityFeedTab.test.tsx` — bestehende Feed-Tests (Anchor-Filter testbar machen, nicht brechen). ZU LESEN.
12. `messages/de.json` community-Namespace — korrekte Objekt-Position der neuen Keys (Slice-333-Lehre: falscher Namespace-Anker → MISSING_MESSAGE). ZU LESEN/node-verifizieren.

---

## 5. Pattern-References

- **errors-frontend.md** „Missing i18n-Key bei neuer CTA" + Slice-333-Erweiterung „Key im FALSCHEN Namespace" → node-Check + Live-Console-MISSING_MESSAGE-Scan Pflicht.
- **errors-frontend.md** „Filter-as-audience-choice vs result-filter" (Slice 254) → Anker-Chip-Liste unabhängig vom aktiven Anker berechnen (kein Catch-22).
- **errors-frontend.md** „Lookup-Map indexed by ambiguous Key" (Slice 276) → Verein-Anker per `club_id` (UUID, eindeutig), NICHT per `short`.
- **errors-db.md** „Same-Day-Migration mit FRÜHEREM Timestamp" (Slice 326) → Migration-Timestamp NACH 333 (`20260618120000`).
- **errors-db.md** „RPC INSERT Column-Mismatch" (J5) → nach Migration `information_schema.columns` gegen INSERT matchen.
- **database.md** Migration-Workflow → `mcp__supabase__apply_migration`, danach `pg_get_functiondef`-Verify + REVOKE/GRANT renew (AR-44, neue Signatur).
- **errors-frontend.md** PostgREST `.or()`/Such-Input (Slice 283) → Such-Filter ist Client-seitig (kein PostgREST-or), unkritisch; aber bei player-name-resolve `.in()`-Chunking beachten (>100 ids? Polls-Limit 50 → unkritisch).

---

## 6. Acceptance Criteria

- **AC-01** [HAPPY] `community_polls` hat Spalte `player_id uuid NULL`. VERIFY: `SELECT column_name,is_nullable,data_type FROM information_schema.columns WHERE table_name='community_polls' AND column_name='player_id'` → 1 Row, uuid, YES.
- **AC-02** [HAPPY] FK auf players mit ON DELETE SET NULL. VERIFY: `SELECT confdeltype FROM pg_constraint WHERE conname LIKE '%player_id%' AND conrelid='community_polls'::regclass` → 'n'.
- **AC-03** [HAPPY] `create_community_poll` akzeptiert 9. Param `p_player_id`; alte 8-arg-Signatur existiert nicht mehr. VERIFY: `pg_get_functiondef('public.create_community_poll(uuid,text,jsonb,bigint,integer,text,uuid,uuid,text)'::regprocedure)` enthält `p_player_id`; `\df create_community_poll` zeigt genau 1 Signatur.
- **AC-04** [EDGE] Poll mit nicht-existentem `p_player_id` → `{success:false,error:'invalid_player'}` (kein FK-Crash). VERIFY: RPC-Smoke mit Random-UUID.
- **AC-05** [HAPPY] Poll mit gültigem `player_id` erstellbar; INSERT schreibt player_id. VERIFY: Force-Rollback-Smoke (BEGIN; INSERT via RPC mit echtem player_id; SELECT player_id; ROLLBACK).
- **AC-06** [HAPPY] `getCommunityPolls` liefert `player_name` für Polls mit player_id. VERIFY: vitest communityPolls (Mock players-Query).
- **AC-07** [HAPPY] REVOKE/GRANT auf neuer Signatur korrekt (AR-44). VERIFY: `SELECT proname FROM pg_proc p JOIN ... has_function_privilege('anon', oid,'EXECUTE')=false`.
- **AC-08** [HAPPY] CreatePollModal zeigt optionalen Spieler-Picker (beide sources); ausgewählter Spieler wird mitgesendet. VERIFY: Live-Playwright + tsc.
- **AC-09** [HAPPY] Feed-Suche matcht Spieler-Name + Verein-Name über alle Typen. VERIFY: Such-Eingabe „Galatasaray" zeigt Polls/Research/Bounties/Posts/Votes mit club_id=Gala; „<Spielername>" zeigt alle Typen mit dem player_id.
- **AC-10** [HAPPY] Anker-Chip-Leiste: Klick auf Verein/Spieler-Chip filtert Feed auf diesen Anker; aktiver Chip + Clear sichtbar. VERIFY: Live-Playwright (Chip-Click → Feed-Count sinkt; Clear → zurück).
- **AC-11** [EDGE] §254: nach Anker-Auswahl bleiben andere Chips wählbar (kein Catch-22). VERIFY: nach Auswahl Spieler A ist Spieler B / Verein-Chip weiter sichtbar/klickbar.
- **AC-12** [I18N] Alle neuen Keys in de+tr unter `community`-Namespace, kein MISSING_MESSAGE. VERIFY: node-Check je Key beide Locales + Live-Console-Scan.

---

## 7. Edge Cases

| # | Fall | Erwartet |
|---|------|----------|
| 1 | player_id NULL (kein Bezug) | Poll erstellt, kein Spieler-Tag — wie heute |
| 2 | player_id zu gelöschtem Spieler | ON DELETE SET NULL → player_id wird NULL, Poll bleibt |
| 3 | nicht-existente player_id beim Create | `invalid_player`, kein FK-23503-Leak |
| 4 | getCommunityPolls: Poll mit player_id, Spieler nicht gefunden | player_name = undefined, kein Crash |
| 5 | Suche leer | feedItems unverändert (kein Anker-Filter) |
| 6 | Anker gesetzt + Suche aktiv | beide Filter kombinieren (AND) |
| 7 | Anker gesetzt, Typ-Filter wechselt | Anker bleibt, aber falls Anker im neuen Typ nicht vorkommt → leerer Feed + EmptyState |
| 8 | Club-Vote bei Spieler-Anker | rausgefiltert (Vote hat kein player_id) — korrekt |
| 9 | Club-Vote bei Verein-Anker | bleibt (hat club_id) |
| 10 | Feed mit 0 Items | Chip-Leiste leer/versteckt, EmptyState wie heim |
| 11 | Spieler in mehreren Polls/Typen | 1 Chip pro Spieler (dedupe by id) |
| 12 | player-name-resolve >100 ids | Polls-Limit 50 → unkritisch; trotzdem kein `.in()`-Chunk-Bug |
| 13 | Migration-Timestamp < 333 | VERBOTEN (Slice 326) → 20260618140000 |

---

## 8. Self-Verification Commands

```bash
# Migration-Spalte
mcp__supabase__execute_sql: SELECT column_name,is_nullable FROM information_schema.columns WHERE table_name='community_polls' AND column_name='player_id';
# RPC-Signatur (genau 1, 9-arg)
mcp__supabase__execute_sql: SELECT pg_get_function_identity_arguments(oid) FROM pg_proc WHERE proname='create_community_poll';
# REVOKE-Audit (anon kein execute)
mcp__supabase__execute_sql: SELECT has_function_privilege('anon', oid, 'EXECUTE') FROM pg_proc WHERE proname='create_community_poll';
# i18n Namespace-aware (je neuem Key, beide Locales)
node -e "const m=require('./messages/de.json'); console.log(m.community?.pollPlayerLabel ?? 'MISSING')"
node -e "const m=require('./messages/tr.json'); console.log(m.community?.pollPlayerLabel ?? 'MISSING')"
# tsc + vitest
pnpm exec tsc --noEmit
CI=true pnpm exec vitest run src/lib/services/__tests__/communityPolls src/components/community/__tests__/CommunityFeedTab
```

---

## 9. Open-Questions

- **Pflicht-Klärung (CEO):** ✅ erledigt vorab — Discovery = Anker-Filter-Chips (mittel) + alle Typen (Anil 2026-06-18).
- **Autonom-Zone (CTO):** Picker-UI-Detail, Chip-Styling (Token-konform), Service-Resolve-Mechanik, FK-ON-DELETE-Verhalten, Migration-Struktur, ob CommunityPollCard Spieler-Tag zeigt (Konsistenz → ja, klein).
- **Defer:** klickbare Card-Tags als Anker-Setzer + Player-Detail-Page-Einstieg → P2b (Scope-Out).

---

## 10. Proof-Plan

- DB: `information_schema.columns` + `pg_get_function_identity_arguments` + REVOKE-Audit → `worklog/proofs/334-schema.txt`.
- RPC-Edge: Force-Rollback-Smoke (invalid_player + happy mit player_id) → `worklog/proofs/334-rpc-smoke.txt`.
- Service: vitest-Output → `worklog/proofs/334-vitest.txt`.
- UI: Live-Playwright gegen bescout.net nach Deploy — CreatePollModal Spieler-Picker + Feed Anker-Chip-Filter + MISSING_MESSAGE-Console-Scan → `worklog/proofs/334-discovery.png`.

---

## 11. Scope-Out (NICHT in diesem Slice)

- Klickbare Spieler/Verein-Tags innerhalb der Cards als Anker-Setzer (→ P2b).
- Einstieg von der Spieler-Detailseite („alle Umfragen+Reports zu diesem Spieler") (→ P2b).
- Discovery auf anderen Seiten als Community-Feed (Marktplatz etc.).
- Soziale Schicht (Follower-Reichweite, Abo-Gewicht, Fan-Rang) = P3.
- Multi-Anker (mehrere Spieler/Vereine gleichzeitig) — Single-Select reicht v1.
- `research_posts.player_id`-Backfill o.ä. — Research trägt Anker bereits.

---

## 12. Stage-Chain (geplant)

SPEC → IMPACT (Pflicht: Schema + community_polls-Consumer + Feed-Union) → BUILD (Migration → Types → Service → CreatePollModal → CommunityFeedTab → i18n) → REVIEW (Cold-Context-Reviewer) → PROVE (DB+RPC-Smoke+vitest+Live-Playwright) → LOG.

---

## 13. Pre-Mortem (≥5)

1. **pg_proc-Ambiguity:** 9-arg-CREATE ohne DROP der 8-arg-Signatur → zwei Overloads, Service-Call mehrdeutig. → DROP IF EXISTS alte Signatur Pflicht; `\df`-Verify genau 1.
2. **FK-Crash statt Guard:** invalid player_id ohne Vorab-Guard → roher 23503 an UI. → `IF p_player_id IS NOT NULL AND NOT EXISTS(...) RETURN invalid_player`.
3. **i18n falscher Namespace (333-Wiederholung):** neue Keys in falsches Objekt → MISSING_MESSAGE. → node-Check beide Locales + Live-Console-Scan, nicht nur grep.
4. **§254 Catch-22:** Anker-Chips aus dem *anker-gefilterten* Set abgeleitet → nach Auswahl verschwinden andere Chips → User stuck. → Chip-Liste aus pre-anchor-Set (Typ+Following+Suche) berechnen.
5. **PLAYER_SELECT_COLS-artige Drift:** player_name-Resolve vergisst Feld → Suche/Anzeige leer. → Service-vitest gegen gemockte players-Query; getCommunityPolls liefert player_name belegt.
6. **REVOKE-Reset (AR-44):** CREATE OR REPLACE resettet Grants → anon execute. → REVOKE FROM PUBLIC+anon + GRANT authenticated auf NEUER Signatur.
7. **Migration-Timestamp-Ordering (326):** < 333 → greenfield-Reihenfolge bricht. → 20260618140000.
8. **Modal-players-Source:** CreatePollModal hatte keinen players-Prop → falls prop-drilling über CreatePollButton+AdminVotesTab vergessen → Picker leer. → `usePlayerNames()` intern im Modal (self-contained), kein Drilling.
