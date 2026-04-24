<!-- auto:handoff-start -->
# Session Handoff — Auto (placeholder)

Wird beim naechsten Stop-Hook-Lauf gefuellt.

<!-- auto:handoff-end -->

---

# Rich Handoff — 2026-04-24 Abschluss

## Status
- **Branch main** clean bis auf erwartete auto-Drift.
- **active.md idle.** 25 Slices in Session 2026-04-24 gesamt (incl. Idempotency-Pipeline 178a-f + 185b Bundle + 186 common-errors Split).
- **Live DB (Supabase skzjfhvgccaeplydsunz):** 7 Money-RPCs mit `p_idempotency_key TEXT DEFAULT NULL` Signatur live. Alte Signaturen DROPped.

## Was diese Session brachte

### Phase 1 — Priority-1-Marathon (178b-f)
Money-Defense-in-Depth End-to-End aktiv:
- **Server:** 178 Foundation + 7 Money-RPCs integriert (178a buy_player_sc, 178c subscribe, 178e-a buy_from_order, 178e-b place_sell_order, 178e-c place_buy_order, 178e-d liquidate_player, 178e-e open_mystery_box_v2) + 178b Cleanup-Cron (hourly).
- **Client:** 178d `useSafeIdempotentMutation` + `newIdempotencyKey()`. 178f migriert 6 Money-Hooks (market.buy, market.placeBuyOrder, player.buy, player.sell, membership.subscribe, mb.open, admin.liquidate).
- **Scope-Out:** buyFromIpo + cancelBuyOrder + cancelOrder nicht integriert (kein Retry-Double-Spend-Risk bei IPO; Cancels sind idempotent-by-nature).

### Phase 2 — Bundle-Budget (185b)
- `bundle-budget.json` mit thresholds (162 kB shared baseline, 10-15 kB Headroom pro tracked Route, 51 Routes total).
- `scripts/check-bundle-size.ts` parst `next build` output, CI-Gate im build-Job.
- `pnpm run size` als lokaler Command.

### Phase 3 — Hygiene (186)
- `memory/session-handoff.md` Hook rebuilt mit awk-state-machine Merge (Marker `<!-- auto:handoff-start/-end -->`). Rich-Content bleibt ab jetzt persistent.
- `.claude/rules/common-errors.md` von 55 KB auf **6 KB Navigator + Silent-Fails** reduziert. Rest verteilt auf:
  - `errors-db.md` (11 KB) — DB + RPCs + Auth + Cache
  - `errors-frontend.md` (7 KB) — React/TS/CSS + i18n
  - `errors-infra.md` (11 KB) — Build/Deploy + Bundle + Hooks + Beta-Ops
  - `errors-scraper.md` (6 KB) — TM + API-Football + HTML-Parsing

### Decisions dokumentiert (memory/decisions.md)
- **D30** useSafeIdempotentMutation als Money-Path Standard-Primitive
- **D31** Auto-generated Files mit Merge-Markern (Hook-Fix)
- **D32** Bundle-Budget-Gate in CI
- **D33** common-errors.md Split in Domain-Files

## Nahtloser Start fuer naechste Session

**Offene Entscheidung:** User will fuer naechste Session ein UI-Foundation-Thema. Optionen:

| # | Scope | Design-Entscheid noetig |
|---|-------|-------------------------|
| 181 | Radix UI-Primitives | Welche Primitives zuerst? Dialog/Popover/DropdownMenu/Tooltip/AlertDialog. Migration-Reihenfolge: Modal→Dialog, ConfirmDialog→AlertDialog. |
| 182 | React Hook Form + Zod | Welche Forms migrieren? Auth, Club-Admin-Settings, Create-Event? Zod-Schema-Konvention. |
| 183 | Design Tokens (CSS vars) | Welche Farben/Spacing/Radius als Custom Properties? Naming-Convention. |
| 184 | Motion Design | Timing-Curves, reduced-motion-Strategy, shared animation-library. |

**Ich empfehle 181 Radix** — groesster User-Impact (Accessibility + Keyboard-Nav), und die Pattern-Migration (Modal → Dialog etc.) ist mechanisch nach Entscheidung. Radix-Dialog + AlertDialog + DropdownMenu als erste drei Primitives waere pragmatischer Scope.

## Open Follow-ups (weiterhin offen)

| Prio | Scope |
|------|-------|
| MED | 181/182/183/184 UI-Foundation (siehe oben) |
| LOW | buyFromIpo Idempotency-Integration (falls gewuenscht) |
| LOW | 185c per-chunk size-limit fuer grosse Libs (country-flag-icons, lucide-react) |
| LOW | 185b2 Bundle-Budget-Thresholds tighten nach Optimierungs-Slices |
| LOW | 180b Service-Shape votes/adminDeletePost/adminTogglePin |
| LOW | Error-Boundary 2-Scopes Pattern (176d, noch in Queue) |
| LOW | pattern_observability_stack.md Addendum (176d) |

## Live-DB-Stand (Supabase project skzjfhvgccaeplydsunz)

Idempotency-Infrastructure:
- **Table:** `public.request_dedup_keys(user_id, dedup_key, response JSONB, status, created_at, expires_at)` — PK composite, Index on expires_at, RLS select-own.
- **Helper:** `public.check_or_reserve_dedup_key(UUID, TEXT, INT) → (is_new, existing_response)` SECURITY DEFINER.
- **Cleanup-Cron:** `/api/cron/dedup-cleanup` hourly via Vercel Cron.

Money-RPCs (alle 4-arg, old signatures DROPped):
- `buy_player_sc(UUID, UUID, INT, TEXT DEFAULT NULL)`
- `buy_from_order(UUID, UUID, INT, TEXT DEFAULT NULL)`
- `place_sell_order(UUID, UUID, INT, BIGINT, TEXT DEFAULT NULL)`
- `place_buy_order(UUID, UUID, INT, BIGINT, TEXT DEFAULT NULL)`
- `subscribe_to_club(UUID, UUID, TEXT, TEXT DEFAULT NULL)`
- `liquidate_player(UUID, UUID, INT DEFAULT 0, TEXT DEFAULT NULL)`
- `open_mystery_box_v2(BOOLEAN DEFAULT false, TEXT DEFAULT NULL)`

Append-Only-Guard (Slice 179):
- Trigger `transactions_append_only_guard` BEFORE UPDATE/DELETE → RAISE EXCEPTION (mit GUC-Opt-In-Bypass via `SET LOCAL bescout.allow_transactions_mutation`).
- `REVOKE UPDATE, DELETE FROM anon, authenticated`.

## CI / Pipeline

- **Build-Job:** `next build | tee build-output.txt` → `cat | npx tsx scripts/check-bundle-size.ts` → exit 1 bei Regression.
- **Pre-commit:** commitlint + lint-staged aktiv.
- **Baseline:** 162 kB shared / 51 routes / 0 violations.

## Notion-Action (wenn noch nicht gemacht)
- Slice 178/178a/178b/178c/178d/178e-a..e/178f/185b/186 → „Erledigt" markieren.
- Kanban: neuer Item fuer 181 Radix-Scope-Deliberation erstellen wenn UI-Foundation-Thema naechstes ist.

## CEO-Scope-Reminder
- Voriger CEO-Grant "voller Zugriff" war session-scoped. Naechste Session startet fresh.
- Money-RPCs bleiben CEO-Scope per-default.
- 181-184 UI-Foundation sind **nicht** CEO-Scope — Claude darf Design-Entscheidungen mit Begruendung selbst treffen, solange keine user-facing Text-/Money-/Compliance-Flows betroffen sind.
