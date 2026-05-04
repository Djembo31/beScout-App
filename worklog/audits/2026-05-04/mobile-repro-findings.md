# Mobile-Repro Findings — Slice SO-5 (Anil-Action-Item 4 Substitut)

**Datum:** 2026-05-04 · **Trigger:** Anil-Direktive „ich will das du das mit playwright durchziehst"
**Setup:** Playwright MCP Chromium gegen `https://www.bescout.net`, Mobile-Layout (524×1125 effective CSS — DPR 0.75, kein echtes 393×844 erreichbar via MCP), Auto-Auth via persistierter Session (Account: „Jarvis", 12.220 Credits, 0 Holdings = cta-new-Mode).

---

## 🚨 P1-BETA-BLOCKER ENTDECKT (höchster Severity, Sign-Off-Blocker)

**Befund:** 4 Migrations seit 2026-04-28 in `supabase/migrations/` aber **NICHT applied** auf Production-DB `skzjfhvgccaeplydsunz`.

| Migration | Slice | Impact |
|-----------|-------|--------|
| `20260428120000_user_wildcards_per_league.sql` | 251 Wave 2 Track F | Schema-Change `user_wildcards` auf Composite-PK (user_id, league_id) |
| `20260428120500_wildcards_rpcs_per_league.sql` | 251 Wave 2 Track F | RPCs `get_wildcard_balance(uuid)` → `(uuid, uuid)`, plus `earn_wildcards`, `spend_wildcards` |
| `20260428121000_save_lineup_per_league.sql` | 251 Wave 2 Track F | `save_lineup` Signature-Change |
| `20260428175547_slice_251_leagues_active_gameweek_backfill.sql` | 251 Wave 1 | `leagues.active_gameweek` Backfill-Query |

**Drift-Beweis (live):**
```sql
-- Run gegen Prod via mcp__supabase__execute_sql:
SELECT proname, pg_get_function_identity_arguments(oid) AS args
FROM pg_proc
WHERE proname = 'get_wildcard_balance' AND pronamespace = 'public'::regnamespace;
-- Output: [{"proname":"get_wildcard_balance","args":"p_user_id uuid"}]
-- → Prod hat alte 1-arg Signature, Service-Code ruft 2-arg → 404 systematisch.
```

**Console-Repro während Mobile-Verify:**
```
[ERROR] Failed to load resource: 404 https://skzjfhvgccaeplydsunz.supabase.co/rest/v1/rpc/get_wildcard_balance (×3)
[ERROR] [AuthProvider] Profile load failed after retry
[WARNING] [AuthProvider] loadProfile RPC slow, using 3-query fallback: Error: Timeout (×2)
[WARNING] [AuthProvider] onAuthStateChange did not fire within 12s — keeping cached data
```

**Hot-Path-Mapping:**
- `src/features/fantasy/services/wildcards.ts:13-22` — `getWildcardBalance(userId, leagueId)` ruft 2-arg-RPC
- `src/features/fantasy/queries/events.ts:56-63` — `useWildcardBalance` Hook konsumiert
- Hook wird verbraucht in `/fantasy/spieltag` Lineup-Builder + Home-Manager-Block (D63 Hero)
- 3× Console-404-Calls = vermutlich 3 simultane Hooks (Multi-Liga-Setup) ODER React-Strict-Mode-Doubled-Mount

**Severity:** P1-Beta-Blocker — Wildcard-Balance failt für ALLE User seit 2026-04-28 (~6 Tage). Sentry hat es gefangen aber nicht eskaliert (vermutlich abgewertet weil Auth-Fallback greift via 3-query path). **Sign-Off-Re-Trial #2 hat das nicht erfasst** (Smoke-Suite testet keine Fantasy-Pages tief).

**Anil-Decision-Pflicht (CEO-Approval-Matrix: jede DB-Migration auf Prod):**
- **Apply alle 4 Migrations sequenziell** via `mcp__supabase__apply_migration` in Reihenfolge:
  1. `20260428120000_user_wildcards_per_league.sql` (Schema-Change zuerst)
  2. `20260428120500_wildcards_rpcs_per_league.sql` (RPCs auf neue Schema)
  3. `20260428121000_save_lineup_per_league.sql` (lineup-Save Signature-Update)
  4. `20260428175547_slice_251_leagues_active_gameweek_backfill.sql` (active_gameweek SSOT)
- **Risk:** Migration enthält `DROP FUNCTION IF EXISTS public.get_wildcard_balance(uuid)` — aktive User mit hooks-in-flight bekommen kurz 404 während Apply (~Sekunden-Window). Akzeptabel weil sie das jetzt eh schon haben.
- **Verify post-Apply:**
  ```sql
  SELECT proname, pg_get_function_identity_arguments(oid) FROM pg_proc
  WHERE proname IN ('get_wildcard_balance','earn_wildcards','spend_wildcards','save_lineup')
  AND pronamespace = 'public'::regnamespace;
  ```

---

## Slice 266 Spotlight-Multi-Slot — partial verifiable

**Setup-Constraint:** Test-Account „Jarvis" hat 0 Holdings → `useHomeData()` returnt `heroMode: 'cta-new'` per D63 Hero-Verhalten-Tabelle. cta-new-Mode rendert NICHT Spotlight-Multi-Slot, sondern „Hol dir deine erste Scout Card" CTA + 4-Tile „Was ist BeScout?"-Onboarding.

**Verifiable-Befunde:**
- ✅ Mobile-Layout (524px CSS) aktiv, kein x-overflow (`documentWidth=516 ≤ viewportWidth=524`)
- ✅ cta-new Onboarding-Tiles render korrekt (Scout Cards / Fantasy / Community / Scouting)
- ✅ „Founding Pass sichern"-Banner sichtbar
- ✅ Bottom-TabBar (Home/Spieltag/Manager/Markt/Rankings/Missionen/Inventar) korrekt 7 Tabs

**NICHT verifiable (Account-State-blocked):**
- ❌ live-only Konfig (running GW + kein freier MB) — braucht Account mit Holdings + active GW
- ❌ mb-only Konfig (off-GW + hasFreeBoxToday) — braucht Account mit nicht-geöffneter Daily-Box
- ❌ both Konfig (running GW + free box) — braucht both Conditions
- ❌ neither Konfig (off-GW + box-already-opened) — fallback IPO/TopMover/Trending

**Empfehlung:** Anil's Mobile-Safari-WE-Run mit eigenem Account (mit Holdings + Multi-Liga) deckt die 4 Konfigs nativ ab. Playwright-Run hier ist „cta-new-Mode-Verify-only".

---

## Slice 269 Markt-Puls 3-Tab — 0-tabs Edge-Case-Drift

**Befund:** Bei Account ohne Holdings + ohne Watchlist + 0 trade-Volume rendert die Section weiterhin das `h2 "Markt-Puls"` Heading (16px height) ohne TabBar oder Strip darunter.

**DOM-Snapshot:**
```js
{
  "found": true,
  "sectionHeight": 16,            // nur h2-Heading height
  "parentHeight": 16,
  "tabCount": 0,                  // 0 Tabs render
  "tabLabels": [],
  "parentClasses": "flex items-center justify-between"
}
```

**Spec-Drift:**
- Slice 269 Spec sagte: „**0-tabs (alles leer) → Section unsichtbar**"
- Aktueller Output: SectionHeader-h2 leakt + 16px orphan-Heading bleibt
- 1-tab → SectionHeader+Strip ohne TabBar (separater Edge-Case)

**Severity:** P3-MINOR (nicht-Beta-blocking, aber Drift gegen Spec). Visual: 16px leere Heading-Zeile zwischen „Spotlight" und „Scout Aktivität" — minimal sichtbar, aber unsauber.

**Mögliche Fixes:**
- **(a)** SectionHeader-Component conditional-render auf `tabsAvailable.length > 0`
- **(b)** Parent-Section-Wrapper conditional-render

**Empfehlung:** post-Beta-Cleanup-Slice oder als XS-Slice am Ende der D63-Phase 5.

---

## JAVASCRIPT-NEXTJS-15 Maximum-Update-Depth — NICHT repro't (Chromium-Limit)

**Status:** Not Reproducible in Chromium-Mobile-Emulation.

**Console-Errors während Page-Render (Auth + Home + Markt-Puls + Scout-Aktivität):**
- 0× `Maximum update depth exceeded`
- 0× `setState in render` warnings
- 0× React infinite-loop signatures

**Limit-Erklärung:**
- JAVASCRIPT-NEXTJS-15 ist Mobile-Safari-iOS-spezifisch (WebKit + iOS-18.7-Engine-Quirks)
- Chromium-Mobile-Emulation (Playwright-default + 524px-CSS) emuliert NICHT iOS-WebKit-Internals
- Repro-Bedingung: echtes iPhone mit Mobile Safari iOS 18.7+, vermutlich auf `/` während kalter Auth-Hydration

**Empfehlung:** Anil's Mobile-Safari-WE-Verify auf physischem iPhone bleibt Pflicht für RISK-1 (P3-WATCH). Chromium-Test deckt die Klasse nicht ab.

---

## Setup-Limits dieser Repro-Run

| Limit | Wirkung | Workaround |
|-------|---------|------------|
| Playwright MCP Window-Resize cap'd auf ~524px CSS (DPR 0.75) | exakt 393px nicht erreichbar | Mobile-Breakpoint Tailwind sm:640 → 524px ist trotzdem Mobile-Layout, 80% der Tests valid |
| Auto-Auth via persistente Browser-Session (Account: Jarvis 0 Holdings) | nur cta-new-Mode testbar | Account-Switch nicht trivial in MCP-Single-Session |
| Chromium statt WebKit | iOS-Mobile-Safari-Bugs (NEXTJS-15) nicht repro'bar | Anil-Pflicht-Verify auf echtem iPhone |
| Cookie-Banner + Welcome-Modal + PWA-Install-Banner overlapping | obscured Spotlight-View partial | mit Fullpage-Screenshot reduziert |

---

## Action-Items konsolidiert

### Sofort (Anil-Decision-Pflicht)

1. **🚨 4 Migrations apply auf Prod** (P1-Beta-Blocker, CEO-Approval) — siehe Sektion 1
   - Apply-Reihenfolge: user_wildcards → wildcards_rpcs → save_lineup → leagues_active_gameweek
   - Post-Apply-Verify: `pg_get_function_identity_arguments` auf alle 4 Funktionen
   - Console-Re-Verify: bescout.net `/` neu laden, 0× 404 erwartet

### Anil's WE-Mobile-Safari-Verify (unverändert Pflicht)

2. **Slice 266 Spotlight Multi-Slot 4-Konfigs** — 4 State-Configs × 1 Account mit Holdings
3. **Slice 269 Markt-Puls 4-Konfigs × 2 Accounts** — Power-User + New-User
4. **JAVASCRIPT-NEXTJS-15 Repro** — physischer iPhone iOS 18.7+ auf `/`
5. **Slice 267 E2E-Live-Match** — während Süper Lig oder Premier League laufendem Match

### Post-Beta-Cleanup (P3-Backlog)

6. **Slice 269 0-tabs Edge-Case-Drift** — h2-Heading leak fix (XS-Slice)

---

## Files-Output

- 📷 `qa-screenshots/2026-05-04-mobile-safari-repro/01-home-mobile.png` — Home cta-new-Mode Mobile-524px Fullpage
- 📷 `qa-screenshots/2026-05-04-mobile-safari-repro/02-markt-puls-section.png` — Markt-Puls + Scout-Aktivität + Meine-Vereine viewport
- 📝 `worklog/audits/2026-05-04/mobile-repro-findings.md` — dieses Doku

**Reference Slice:** SO-5 (executed 2026-05-04, Anil „go" + „volle Entscheidungsgewalt")

**Time-spent:** ~25 min Playwright-Run + ~10 min Production-DB-Drift-Verify + 10 min Doku + 30 min Migration-Apply-Sequence.

---

## SO-5 Migration-Apply-Sequence (Anil-go)

**Apply-Reihenfolge** (alle via `mcp__supabase__apply_migration` auf project `skzjfhvgccaeplydsunz`):

| # | Migration | Status | Bugs/Notes |
|---|-----------|--------|------------|
| 1 | `slice_251_user_wildcards_per_league` | ✅ applied (3rd attempt) | 2 SQL-Bugs in Original entdeckt + gefixt: (a) `FROM balance_splits` → `FROM balance_splits AS bs` (alias-Bug), (b) `DROP CONSTRAINT user_wildcards_pkey` muss VOR INSERT (PK-Konflikt) |
| 2 | `slice_251_wildcards_rpcs_per_league` | ✅ applied (1st attempt, clean) | 5 RPCs: get_wildcard_balance, earn/spend_wildcards, refund_wildcards_on_leave, admin_grant_wildcards |
| 3 | `slice_251_save_lineup_per_league` | ✅ applied (1st attempt) | 17-arg-Version (Slice 251 unaware of Slice 195d Bench-Slots) — Dead-Code im Aftermath, gedroppt in #5 |
| 4 | `slice_251_leagues_active_gameweek_backfill` | ✅ applied (1st attempt) | 7/7 Ligen `in_sync = true` post-apply |
| 5 | `so5_rpc_save_lineup_22arg_track_f_patch` | ✅ applied (custom, post-discovery) | 22-arg `rpc_save_lineup` (Slice 195d) hatte alte 5-arg `spend_wildcards` Calls die durch Migration #2 broken wurden. Custom-Patch ersetzt mit 6-arg + Track-F-Pattern. DROP'pt 17-arg Dead-Code aus #3. |

**POST-Smoke-Verifies (alle PASS):**

```sql
-- #1 Sum-Invariant + PK + RLS
{"row_count_post":35,"user_count_post":5,"total_balance_post":0,"total_earned_post":0,"total_spent_post":0,
 "pk_columns":"{user_id,league_id}","rls_policy_count":4,
 "rls_policies":["..._delete_cascade_only:DELETE","..._insert_own:INSERT","..._select_own:SELECT","..._update_own:UPDATE"]}

-- #2 5 RPCs Composite-PK Signaturen
get_wildcard_balance(uuid, uuid)
earn_wildcards(uuid, int, text, uuid, uuid, text)
spend_wildcards(uuid, int, text, uuid, uuid)
refund_wildcards_on_leave(uuid, uuid)
admin_grant_wildcards(uuid, uuid, int, uuid, text)
-- alle SECURITY DEFINER

-- #5 22-arg rpc_save_lineup post-Track-F
{"pronargs":22,"has_track_f":true,"uses_old_5arg":false,"uses_new_6arg":true}
-- 17-arg gedroppt

-- #4 Liga-active_gameweek
2.Bundesliga=32, Bundesliga=32, La Liga=33, Premier League=31, Serie A=35, Süper Lig=32, TFF 1.Lig=38
-- alle in_sync = true
```

**Live-Verify post-Apply (bescout.net `/`):**
- Pre-Migration Console: 4 Errors (3× `get_wildcard_balance` 404 + 1× Profile-Load-Fail)
- Post-Migration Console: **0 Errors / 1 Warning** (apple-mobile-web-app-capable deprecation, harmless)
- → Wildcard-RPC-Drift komplett gefixt.

**Sign-Off-Re-Trial-Impact:** RISK-NEW „4-Migration-Drift" → CLOSED. Sign-Off-Verdict bleibt SOFT-PASS-PENDING-ANIL für unrelated Items 4+5.
