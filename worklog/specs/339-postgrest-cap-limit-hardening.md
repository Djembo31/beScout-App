# Slice 339 — PostgREST-1000-Cap-Härtung: getPlayerNames + Follower-Notify

**Slice-Type:** Service
**Größe:** S
**CEO-Scope:** Nein (interne Korrektheit, kein Money-Path, kein Wording, kein Schema). CTO-autonom.

---

## 1. Problem-Statement (Evidence)

Drei `.select()`-Queries laufen ohne `.range()`/Pagination → PostgREST cappt still bei 1000 Rows (`common-errors.md §1 "PostgREST 1000-row cap"`). Quelle: Slice-334-Review-NIT#3 + Slice-336-Review-NIT#2 (Handoff `memory/session-handoff.md` „KLEINE BACKLOG-FUNDE").

1. **`getPlayerNames`** (`src/lib/services/players.ts:42`): `.from('players').select('id,first_name,last_name,position').order('last_name')` — kein Range. `players` hat **>4000 Rows** (`common-errors.md`: „players (>4k)"). → Spieler-Picker (CreatePollModal/CreateResearchModal via `usePlayerNames`) sieht **nur ~1000 Spieler**, der Rest ist unauffindbar (silent, kein Error).
2. **Follower-Notify Club** (`src/lib/services/communityPolls.ts:97`): `.from('club_followers').select('user_id').eq('club_id', …)` — kein Range. Mega-Club (polls.md §1: „Galatasaray ~35 Mio Fans") mit >1000 Followern → nur die ersten 1000 bekommen die `poll_new`-Benachrichtigung. **Zerstört genau die Skalen-Story, die Polls als B2B-Geldmaschine verkauft.**
3. **Follower-Notify User** (`src/lib/services/communityPolls.ts:101`): `.from('user_follows').select('follower_id').eq('following_id', …)` — kein Range. Populärer Creator mit >1000 Followern → gleicher Cap.

Kein Money-Path direkt berührt (Notify ist best-effort; Picker ist Lese-Pfad). Korrektheits-/Vollständigkeits-Bug.

---

## 2. Lösungs-Design

Etabliertes Inline-Range-Loop-Pattern aus `src/lib/services/club.ts:388-400` 1:1 übernehmen (kein neuer shared Helper — Konsistenz mit Bestandscode, Simplicity First):

```ts
const PAGE = 1000;
const all: Row[] = [];
for (let offset = 0; ; offset += PAGE) {
  const { data, error } = await supabase.from('t').select(...).<filter/order>.range(offset, offset + PAGE - 1);
  if (error) throw new Error(error.message);   // bzw. follower-notify: best-effort try/catch bleibt
  const rows = data ?? [];
  all.push(...rows);
  if (rows.length < PAGE) break;
}
```

- **`getPlayerNames`**: Range-Loop, akkumuliert rows, dann `.map(...)` wie bisher. Error → throw (wie bisher, Zeile 47).
- **`communityPolls` Club-Follower**: Range-Loop in den bestehenden best-effort `try`-Block; `.eq('club_id', …)` + `.range(...)`. Error wirft INNERHALB des try → landet im bestehenden `catch` (best-effort bleibt).
- **`communityPolls` User-Follower**: gleiches Pattern, `.eq('following_id', …)`.

Reihenfolge/Order: getPlayerNames behält `.order('last_name')` (Range + Order kombinierbar). Follower-Queries brauchen keine Order (Set von IDs).

---

## 3. Betroffene Files

| File | Änderung | Begründung |
|------|----------|-----------|
| `src/lib/services/players.ts` | `getPlayerNames` Range-Loop | >4k Spieler vollständig |
| `src/lib/services/communityPolls.ts` | Club- + User-Follower-Query Range-Loop | alle Follower benachrichtigen |
| `src/lib/services/__tests__/players-*.test.ts` (neu od. erweitern) | Pagination-Test getPlayerNames | beweist >1000 wird gelesen |
| `src/lib/services/__tests__/communityPolls-*.test.ts` | Follower-Notify Pagination-Test | beweist >1000 Follower |

---

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

1. `src/lib/services/club.ts:362-422` — **Pattern-Source** (Range-Loop, PAGE=1000, error-throw, accumulate). ✅ gelesen.
2. `src/lib/services/players.ts:40-53` — `getPlayerNames` Ist-Stand + `PlayerName`-Shape + `toPos`. ✅ gelesen.
3. `src/lib/services/communityPolls.ts:90-117` — Follower-Notify best-effort-Block (try/catch, Promise.all createNotification). ✅ gelesen.
4. `src/lib/services/__tests__/` — gibt es `players-*.test.ts`? Welches Supabase-Mock-Pattern nutzen die communityPolls-Tests (chainable `.range()`-Mock)? ZU PRÜFEN vor Test-Schreiben.
5. `src/lib/__tests__/db-invariants.test.ts:1788-1798` — Referenz wie ein Range-Loop getestet/gemockt wird (chainable builder). ZU LESEN falls Mock-Frage offen.

---

## 5. Pattern-References

- **common-errors.md §1** „PostgREST 1000-row cap — MONEY-CRITICAL": `.limit(N)` ist KEIN Override, nur `.range(offset, offset+999)`-Loop bis `data.length < PAGE`.
- **common-errors.md §1** „`.in()` Chunking + Upstream-Query auch prüfen" (Slice 082/086) — hier nicht nötig (kein `.in()` auf großer Liste; Follower-IDs werden danach einzeln in Promise.all genutzt, nicht re-gequeried).
- **club.ts:362** Doc-Comment (Slice 079b Fix-Muster) — exakte Vorlage.

---

## 6. Acceptance Criteria

- **AC-01** [HAPPY] `getPlayerNames` liest ALLE Spieler (>1000). VERIFY: vitest mit Mock der Seite-1 = 1000 rows, Seite-2 = 500 rows → Ergebnis-Länge 1500, `.range` 2× aufgerufen mit (0,999) + (1000,1999).
- **AC-02** [EDGE] `getPlayerNames` < 1000 Spieler (1 Seite). VERIFY: Mock 1 Seite = 300 rows → Länge 300, `.range` 1× (Loop bricht weil 300<1000).
- **AC-03** [HAPPY] `getPlayerNames` Error in einer Seite → throw (kein silent leeres Array). VERIFY: Mock error auf Seite-1 → `expect().rejects`.
- **AC-04** [HAPPY] Club-Follower-Notify liest >1000 Follower. VERIFY: vitest createCommunityPoll source='club', club_followers-Mock 1000+200 → `createNotification` 1200× aufgerufen.
- **AC-05** [EDGE] Follower-Notify Fehler bleibt best-effort (kein throw aus createCommunityPoll). VERIFY: club_followers-Query-Error → createCommunityPoll resolved trotzdem (poll_id zurück), `console.error` geloggt.
- **AC-06** [HAPPY] User-Follower-Notify Range-Loop (source='user'). VERIFY: user_follows-Mock 1000+50 → createNotification 1050×.
- **AC-07** [REGRESSION] tsc clean + bestehende players/communityPolls-Tests bleiben grün.

---

## 7. Edge Cases

| # | Fall | Erwartet |
|---|------|----------|
| 1 | players exakt 1000 | Loop: Seite-1 1000 → Seite-2 0 rows → break. Länge 1000. |
| 2 | players 0 (leer) | Seite-1 0 rows <1000 → break. Länge 0, kein Crash. |
| 3 | club_followers 0 | followerIds=[] → kein createNotification (bestehender `length>0`-Guard). |
| 4 | Follower-Query error | best-effort catch fängt, poll_id wird trotzdem zurückgegeben. |
| 5 | exakt 1000 Follower | Seite-2 0 rows → break. 1000 Notifications. |
| 6 | createNotification wirft für 1 uid | Promise.all rejected → landet im best-effort catch (wie heute, kein Regress). |
| 7 | getPlayerNames Order bei Pagination | `.order('last_name')` muss VOR `.range()` stehen, sonst inkonsistente Seiten. |

---

## 8. Self-Verification Commands

```bash
# Keine unbounded selects mehr in den zwei Files (außer .single/.maybeSingle/.eq-by-pk)
grep -n "\.select(" src/lib/services/players.ts src/lib/services/communityPolls.ts
# tsc + betroffene Tests
pnpm exec tsc --noEmit
CI=true pnpm exec vitest run src/lib/services/__tests__/players src/lib/services/__tests__/communityPolls
```

---

## 9. Open-Questions

- **Autonom-Zone (CTO):** PAGE-Größe (1000, wie club.ts), Test-Mock-Mechanik, ob getPlayerNames-Test in neuem od. bestehendem File, ob ein winziger lokaler Helper (nur falls Code sonst 3× dupliziert — sonst inline wie club.ts).
- **Pflicht-Klärung:** keine (kein Money/Wording/Schema).
- **Scope-Out:** andere unbounded selects projektweit (separater Audit-Slice), polls.md §9 Doku-Refresh (eigener Doc-Commit danach), bounty reward_cents-Drift + AR-43 (eigene Mini-Slices).

---

## 10. Proof-Plan

- vitest-Output (players + communityPolls Pagination-Tests grün) → `worklog/proofs/339-vitest.txt`.
- `git diff --stat` + grep-Beleg dass beide Files Range-Loop nutzen.
- tsc clean.

---

## 11. Scope-Out (NICHT in diesem Slice)

- Projektweiter Audit aller unbounded `.select()` (es gibt sicher mehr — eigener `silent-fail-audit`-Lauf).
- `polls.md` §9 Current-State-Doku-Refresh (separater Doc-Commit; E0-W2gov-Kopplung).
- bounty `reward_cents`-Max-Drift (CHECK 100k vs RPC 1M) + `auto_close_expired_bounties` getrackte Migration (AR-43) — eigene Fix-Slices.
- Kein neuer shared Pagination-Helper (Refactor-Scope, nicht hier).

---

## 12. Stage-Chain (geplant)

SPEC → IMPACT (skipped: kein Contract-Change — Return-Typen identisch, nur mehr Rows; Begründung in active.md) → BUILD (players.ts → communityPolls.ts → Tests) → REVIEW (Cold-Context, S-Slice Pflicht) → PROVE (vitest + tsc) → LOG (+ common-errors.md-Verweis falls neue Erkenntnis).

---

## 13. Pre-Mortem (optional bei S)

1. **`.range()` vor/nach `.order()`**: PostgREST braucht order vor range für stabile Seiten. → getPlayerNames: `.select().order().range()`-Reihenfolge.
2. **Mock-Falle:** chainable Supabase-Mock muss `.range()` als letztes Glied auflösen, sonst Test grün ohne echte Pagination. → Mock an `club.ts`-Tests/db-invariants orientieren; AC prüft `.range`-Call-Args explizit.
3. **Best-effort-Regress:** throw im Follower-Loop darf createCommunityPoll NICHT brechen. → Loop bleibt INNERHALB des bestehenden try; AC-05 prüft.
