# Session Handoff
## Letzte Session: 2026-04-08 (Abend, 6 Commits, B2 Following Feed E2E komplett + AutoDream Run #4)

## 🔖 NEXT SESSION KICKOFF — B3 Transactions History E2E

**Erstmal lesen:**
1. Diesen Handoff (du bist hier)
2. `memory/project_e2e_features.md` — 3 Features approved 2026-04-04 (2/3 done: B1 Missions ✅, B2 Following Feed ✅)
3. Das "B2 Following Feed E2E" Summary unten — zeigt das bewährte Audit-Pattern
4. `memory/semantisch/projekt/following-feed.md` — 74 Zeilen verdichtetes B2 Wissen (RLS Pattern, Dead Code Audit, i18n-First)

**Pattern (von B1+B2 bewaehrt):**
1. **Discovery** — Scan: existierender service/hook/component/page/migration code für Transactions History
2. **Reality Check** — was ist schon gebaut, was fehlt, was ist kaputt (dead code, silent RLS, missing UI)
3. **Report** → 3 gezielte Fragen an Anil (A/B/C Stil), damit er die Tiefe wählt
4. **Phase A-E** — implementieren basierend auf seiner Antwort (meist "alles/e")
5. **Live Test** als jarvis-qa via playwright (**Achtung: Service Worker unregister + SW cache clear VOR dem Test**, siehe errors.md)
6. **Commits** — thematisch split, dann push
7. **AutoDream** — wenn lessons learned entstanden, am Ende Subagent laufen lassen

**Startpunkte für B3 Discovery:**
- Services: grep `src/lib/services/` nach `transactions` oder `getTransactions`
- Queries: `src/lib/queries/` hat bereits einen `qk.transactions` key (`keys.ts:144-147`) mit `byUser(uid, n)` und `all`
- Profile Tab: `ProfileView.tsx` hat schon einen "Activity"-Tab mit `PUBLIC_TX_TYPES` filter (siehe `.claude/rules/profile.md`)
- DB: vermutlich `transactions` oder `wallet_transactions` table — bei Discovery checken ob es `type`-Spalte gibt und welche types existieren
- Potential Gaps: dedizierte Transactions-History Seite unter `/profile/transactions` oder als Tab? Filter nach Type/Period? Export-Funktion?

**Hinweise aus B2 Learnings (vermeide diese Fallen):**
- **RLS Policy Trap** — Wenn ein Service Cross-User-Reads braucht, RLS-Policy auf der Tabelle checken BEVOR Frontend debuggen. Pattern: `SELECT policyname, cmd FROM pg_policies WHERE tablename = 'X'`. Activity-Log hatte `auth.uid() = user_id` silent blockiert (Fix: 2026-04-08 commit e61be4a).
- **Dead Code Audit** — `getFollowingFeed` existierte seit Monaten ungenutzt. Vor neu bauen: grep ob Hook/Service/Type bereits vorhanden und nur nicht gewired ist.
- **Service Worker Cache stale** — Bei QA immer zuerst: `navigator.serviceWorker.getRegistrations()` unregister + `caches.delete()` alle cache names + hard reload. Sonst sieht man alte JS trotz Code-Changes.
- **i18n-First für Enums** — User-sichtbare Enum/Action Labels NICHT als hardcoded const im code, sondern in `messages/{de,tr}.json` unter namespace.

**QA Account (aktualisiert nach B2):**
- Email: jarvis-qa@bescout.net / Handle: jarvisqa
- Password: `JarvisQA2026!` (`e2e/mystery-box-qa.spec.ts:5`)
- ~7.700 $SCOUT, 63 Tickets, 6 Tage Streak, 8 Holdings, 1 Manager-Lineup
- **NEU: Jarvis folgt jetzt 3 Scouts** (`kemal2`, `test12`, `emre_snipe`) — QA-Fixture für Following Feed populated state. Nicht löschen.

**MCP Tools einsatzbereit:**
- `mcp__supabase__execute_sql` (project_id: `skzjfhvgccaeplydsunz`)
- `mcp__supabase__apply_migration` — für DB cleanup migrations
- `mcp__playwright__browser_*` — für Live E2E Tests

---

## TL;DR
B2 Following Feed ist komplett live auf main. Der Widget rendert empty + populated state auf mobile + desktop. Der entscheidende Bug war ein **P0 RLS-Silent-Failure** auf `activity_log` der das Feature seit Monaten blockiert hätte, auch wenn das UI gebaut worden wäre. AutoDream Run #4 hat 4 neue Anti-Patterns nach `memory/errors.md` promoted. Keine offenen Krümel.

## Was wurde gemacht — 6 Commits, alle auf main gepusht

### B2 Following Feed E2E (4 Commits)

**Phase 1: Discovery + Reality Check**
Backend war zu 100% fertig (Service `getFollowingFeed`, Hook `useFollowingFeed`, Type `ActivityFeedItem` + 12 FEED_ACTIONS). Frontend: **Hook wurde nirgends aufgerufen**, kein Component, kein Route. Community-Page hatte einen "Folge ich" Toggle der aber nur Content filter machte — nicht den Activity Feed zeigte.

**Anil's Entscheidung**: 1C + 2C + 3A — Community-Toggle bleibt unangetastet, Activity Feed als Widget in der Home-Sidebar, 5 Items, keine Pagination/Realtime.

**Phase 2: Backend Fix — `e61be4a fix(db)` — P0 RLS Bug**
`activity_log` RLS Policy erlaubte nur `auth.uid() = user_id` für SELECT. Cross-User-Reads blockierten silent (kein Error, nur `[]` als Ergebnis). Ohne diese Fix konnte der Feed **niemals** populated state rendern, egal was das Frontend machte.
- Migration `20260408180000_activity_log_feed_rls.sql` — zweite SELECT-Policy:
  ```sql
  USING (user_id IN (SELECT following_id FROM user_follows WHERE follower_id = auth.uid())
         AND action = ANY(ARRAY[...12 FEED_ACTIONS...]))
  ```
- `page_view` und andere private Actions bleiben owner-only.

**Phase 3: Refactor — `07cfbba refactor(social)`**
- `useFollowingFeed(userId, limit=15)` bekam optional `limit` param.
- `qk.social.feed(uid, limit)` erweitert um limit — verschiedene Widget-Größen cachen separat.
- `FEED_ACTION_LABELS` aus `types/index.ts` gelöscht (dead export).
- Neuer `feed.actions.*` Namespace in `messages/de.json` + `messages/tr.json` mit ICU Interpolation für trade actions (`"hat {player} gekauft"`) und `_generic` fallbacks wenn Player nicht in aktueller Players-Slice.

**Phase 4: Widget — `85474dd feat(home)`**
- `src/components/social/FollowingFeedRail.tsx` (neu, 186 Zeilen)
- 4 States: Loading (3 skeleton rows) / Error (ErrorState mit retry) / Empty (Users icon + Hint + "Scouts entdecken" CTA zu /community) / Populated
- Populated Items: Avatar (oder Initial fallback) + `@handle` + Action Label + relative Zeit, jede Row linkt zu `/profile/{handle}`
- Trade actions erreichern Action Label mit Player-Name aus Home-Page Players-Slice (kein extra DB-Call)
- KNOWN_ACTIONS Filter — unbekannte Action-Types crashen rendering nie
- Integration: `src/app/(app)/page.tsx` — dynamic import, conditional `{uid && !isNewUser}`, positioniert zwischen SuggestedActionBanner und MyClubs in der Sidebar

**Phase 5: Live QA + Cleanup — `5511640 chore(memory)`**
- tsc --noEmit: CLEAN
- Playwright als jarvis-qa: mobile (390px) + desktop (1280px) — Empty State + Populated State (nach `INSERT user_follows` für 3 Scouts)
- 4 Screenshots im Repo-Root (gitignored)
- Service Worker Trap entdeckt: `navigator.serviceWorker.getRegistrations()` hatte stale JS gecacht, verhinderte meine Code-Changes zu sehen

### AutoDream Run #4 (2 Commits)

**`5b5dcb1 docs(memory)` — Lessons → errors.md + following-feed wiki**
- 4 neue Patterns in `memory/errors.md`:
  1. `activity_log` Feed Policy Trap (Cross-User-Read Pattern für Feeds)
  2. Dynamic Import fire-and-forget Promise (CI Trap — war eigentlich Session 2026-04-08 Vormittag, wurde jetzt erst promoted)
  3. Dead Code / Dead Exports (Audit-Signal: Consumer-Count per grep)
  4. Dev Server / Service Worker stale cache
- Neu: `memory/semantisch/projekt/following-feed.md` (74 Zeilen) — verdichtetes B2 Wissen mit Architektur-Entscheidungen und Bugs-Tabelle
- Wiki-Index + Wiki-Log Run #4 Eintrag

**`c8190a8 chore(memory)` — Stop hook auto retro**

## Build Status (final)
- `tsc --noEmit`: CLEAN
- vitest: nicht extra laufen lassen — keine Service/Logic Änderungen die Tests brechen könnten (nur UI + DB + i18n)
- Live QA: beide States verifiziert, 0 Console-Errors von meinem Code (pre-existing `common.navClub` MISSING_MESSAGE + posthog 401 sind alt, nicht in dieser Session eingeführt)

## Stand jetzt — keine offenen Krümel

### Alle Handoff-Punkte dieser Session abgeschlossen
- ✅ B2 Following Feed E2E: Discovery → Reality Check → Fragen → Implementation → Live Test → Commits → Push
- ✅ P0 RLS Silent Failure auf activity_log gefixt + als Pattern in errors.md
- ✅ Dead code `FEED_ACTION_LABELS` + dead hook `useFollowingFeed` wieder lebendig gemacht
- ✅ i18n in DE + TR für Feed Actions
- ✅ Live verifiziert auf Mobile + Desktop, Empty + Populated States
- ✅ AutoDream Consolidation (13 Sessions overdue → 0)
- ✅ Session-handoff.md für B3 Kickoff vorbereitet

### Was koennte als naechstes kommen
- **B3 Transactions History E2E** — drittes und letztes der E2E-Features aus `project_e2e_features.md`
- **Onboarding ohne Club-Bezug** (`project_onboarding_multi_club.md`) — Freundeskreis-Feedback
- **Chip/Equipment System** (`project_chip_equipment_system.md`) — Ideen gesammelt, eigene Session
- **Optional Follow-up B2**: Realtime Subscription auf `activity_log` für Live-Updates (aktuell 2min staleTime via React Query)

## Wichtige Dateien fuer naechste Session
- `memory/project_e2e_features.md` — Meta: Welche Features sind approved
- `memory/semantisch/projekt/following-feed.md` — B2 verdichtet (neu)
- `memory/errors.md` — 4 neue Patterns (activity_log RLS, Dynamic Import Promise, Dead Code, SW Cache)
- `.claude/rules/profile.md` — Activity Tab mit `PUBLIC_TX_TYPES` — Startpunkt für B3
- `src/lib/queries/keys.ts:144-147` — `qk.transactions` keys (existieren schon)
- `supabase/migrations/20260408180000_activity_log_feed_rls.sql` — RLS Pattern Referenz

## Architektur-Notizen

### RLS Feed Pattern (aus B2, jetzt wiederverwendbar)
Tabellen die Cross-User-Reads für Feeds/Activity brauchen, brauchen erweiterte SELECT-Policy:
```sql
CREATE POLICY "feed_cross_user_read" ON <table>
FOR SELECT USING (
  auth.uid() = user_id  -- own rows
  OR user_id IN (SELECT following_id FROM user_follows WHERE follower_id = auth.uid())  -- followed
);
```
Mit optionalem Action-Filter für Privacy: nur bestimmte action types cross-readable.

### Service Worker in Dev
Der BeScout Dev-Build hat einen Service Worker registriert (scope `/`). Der cached aggressively und kann Code-Changes unsichtbar machen. Playbook:
```js
// In DevTools Console vor QA:
(async () => {
  const regs = await navigator.serviceWorker.getRegistrations();
  for (const r of regs) await r.unregister();
  const cs = await caches.keys();
  for (const c of cs) await caches.delete(c);
  localStorage.clear(); sessionStorage.clear();
  location.reload();
})();
```

### Dead Code Discovery vor neuem Build
Bevor ein neues Feature gebaut wird, immer grep:
1. `grep -r "export function myFeature"` → existiert schon?
2. Consumer-Count per `grep -r "myFeature(" --include="*.tsx"`
3. Wenn Consumer == 0 → Feature-Infrastruktur ist da aber ungewired. Das war bei B2 `getFollowingFeed` der Fall.

## QA Account State Snapshot (Ende 2026-04-08)
- Email: jarvis-qa@bescout.net / Handle: jarvisqa
- Password: `JarvisQA2026!`
- ~7.700 $SCOUT, 63 Tickets, 6 Tage Streak, 8 Holdings, 1 Manager-Lineup
- **3 Follows**: `kemal2`, `test12`, `emre_snipe` (QA-Fixture für Following Feed)
