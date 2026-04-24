# Current Sprint — Session 2026-04-24 Close

## Stand (2026-04-24 Session-Ende)

- **Branch:** main — pushed (`95adb3df` HEAD)
- **Letzter Commit:** `95adb3df docs(hygiene): Slice 187b abschluss — active.md idle + log.md`
- **Session-Output:** 8 Slices + 3 Hygiene-Commits (in dieser Session)
- **Tests:** tsc clean, 3122/3128 vitest grün, 44/44 db-invariants + order-lifecycle grün
- **Production:** www.bescout.net live auf HEAD (auto-deploy funktional)

## Session-Highlights (2026-04-24)

### Radix-Migration Phase 1 (vollständig)
- 46 Dialog-Sites + 3 AlertDialog-Sites migriert (Custom-Modal → Radix)
- Module `@/components/ui/Modal` + `ConfirmDialog` **deleted** (~130 LOC)
- Single Source of Truth: `@radix-ui/react-dialog` + `@radix-ui/react-alert-dialog`

### Infra-Blocker (Vercel Hobby)
- Root-Cause: `dedup-cleanup` cron hourly-schedule → Hobby-Tier rejected
- 17 Commits waren unsichtbar stuck seit 15:41 UTC
- Workaround: daily `15 3 * * *` (TODO zurück auf hourly bei Pro-Restore)

### DB-Invariant-Cleanup (Data-Integrity)
- INV-35 (Logo-Source): 1 → 0 (Gençlerbirliği)
- INV-38 (Orphan-Stale): 37 → 0 (transfermarkt_stale flag)
- INV-39+INV-40 (Ghost-Rows): 14 → 0 (club_id=NULL on apps=0 doppelgänger)
- SM-ORD-04 (Expired Orders): 158 → 0 (via `expire_pending_orders` RPC, Escrow released)

### Cron-Gap geschlossen
- `expire-orders` Route fehlte komplett → 158 stale orders accumulation
- Neue Route + vercel.json Entry (05:30 UTC daily, Hobby-safe)

## Aktueller Fokus: Session beenden, Backlog-Items triage

### Offen für Anil (CEO-Scope)

1. **Vercel-Plan-Entscheidung** — Hobby (bewusst) vs Pro-Upgrade? 2 Crons auf Hobby-Workaround (dedup-cleanup, expire-orders). Pro erlaubt hourly + 40 Jobs.
2. **3 Beta-Tester organisieren** (aus früherem Handoff) — min. 1 türkisch-sprachig, 1 ohne Fußball-Kontext
3. **1 Deutsch-Türke für TR-Locale-Review** — 802 TR-Strings ready in qa-screenshots/synthetic/profile-c-tr-locale/tr-strings.txt

### Backlog (separate Slices)

| Item | Priorität | Aufwand |
|------|-----------|---------|
| **181g** JoinConfirmDialog Custom-DOM → Radix | LOW | ~30 min |
| **INV-35 Regression-Guard** (Admin-UI Logo-URL Validation) | LOW | ~20 min |
| **Ghost-Prevention** in sync-players-daily (INV-39/40 Recurrence) | MEDIUM | ~30-60 min |
| **CI-Check Cron-Route-Registry-Audit** | LOW | ~15 min |
| **Vercel Pro Cron-Restore** (nach Anil-Entscheidung) | LOW | ~5 min |

### Beta-Launch Status (aus älterem Handoff)

- **Phase 1-3a:** DONE (Smoke-Suite, Synthetic, Secrets, Infrastructure)
- **Phase 3b:** Wartet auf 3 echte Tester (Anil organisiert)
- **Testplan:** memory/beta-testplan.md — 8 Tasks pro Zoom-Call, Anil moderiert

## Technische Änderungen heute

- `src/components/ui/Dialog.tsx` — Radix-Wrapper (existed, now Source-of-Truth)
- `src/components/ui/AlertDialog.tsx` — Radix-Wrapper (existed, now in EventDetailModal live)
- `src/components/ui/Modal.tsx` — DELETED (Function removed from index.tsx)
- `src/components/ui/ConfirmDialog.tsx` — DELETED (file deleted)
- `src/app/api/cron/expire-orders/route.ts` — NEU
- `vercel.json` — +1 cron entry (expire-orders), dedup-cleanup daily

## DB-State-Änderungen (via Supabase MCP, keine Code-Commits)

- 1 `clubs.logo_url` updated (Gençlerbirliği)
- 37 `players.mv_source = 'transfermarkt_stale'` updated
- 9 `players.club_id = NULL` updated (Ghost-Rows orphaned)
- 158 `orders.status = 'cancelled'` (+ `wallets.locked_balance` Release + Transaction-Log)

## Referenzen

- Slice-Historie: worklog/log.md (neueste oben, 8 neue Einträge)
- Session-Decisions: memory/decisions.md (D34-D35 aus Vor-Session, keine neuen in dieser Session)
- Session-Handoff: memory/session-handoff.md (auto-generated)
- Proofs: worklog/proofs/181e*, 181f-h*, 187*, 187b*
- Reviews: worklog/reviews/181e1, 181e2, 181f+h, 187
