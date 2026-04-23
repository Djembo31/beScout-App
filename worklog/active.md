# Active Slice

```
status: idle
slice: —
stage: —
spec: —
impact: —
proof: —
review: —
```

## Zuletzt (Session 2026-04-23)

- **Slice 156** (2026-04-23) — Event+Lineup Ferrari + P2.3 Migration. REVIEW FAIL v1 → PASS v2 nach Baseline-Rewrite. 25 Tests neu, 184 total grün. Knowledge-Capture: common-errors §2 CREATE OR REPLACE Patch-Audit.
- **Slice 153b** (2026-04-23) — usePlayerTrading Ferrari (7 Handler). Commit `565e2c1b`.
- **Slice 153a** (2026-04-23) — trading.ts Ferrari (4 Mutation-Hooks). Commit `9d417e68`.
- **Slice 152d** (2026-04-23) — WalletProvider Elimination, Phase 2 COMPLETE.

## Phase-Status

| Phase | Status |
|-------|--------|
| Phase 1 Mutation-Hardening | Komplett (151a-d + 151c.2) |
| Phase 1.5 ClubProvider-RESET | Komplett (151b-RESET) |
| Phase 2 Money-Cleanup | Komplett (152a-d) |
| **Phase 3 UX-Hotspots** | In progress (**153 ✅**, **156 ✅**, 157 → 158 pending) |
| Phase 4 Rest + Norm | Spaeter (159 Profile, 160 Codification) |

## Nahtlos-Naechste-Session

**Start-Punkt:** Slice 157 — naechste UX-Hotspot-Welle.

**Mögliche Kandidaten (aus 150-mutation-audit.md Tier 1-2):**
- `useClubCreate` / `useClubDelete` Mutations
- `useOfferActions` (P2P-Offers make/accept/reject)
- `useFollowUser` / `useUnfollowUser` (analog useToggleFollowClub)

**Vorher pruefen:** `worklog/proofs/150-mutation-audit.md` → Top-Priority-Kandidaten nach Money-Path + User-Impact.

## Carry-Over

- ⏸ Slice 157 Scope-Entscheidung (Anil-CEO)
- ⏸ Slice 160 Codification: `useQueryClient()`-Konvention + Ferrari-Blueprint als CLAUDE.md-Rule

## Lessons (Slice 156 Post-Mortem)

- **CREATE OR REPLACE FUNCTION** auf SECURITY DEFINER RPC = **Patch-Audit Pflicht** (alle Vorgaenger-Migrations greppen, letzter File = Baseline). Codifiziert in common-errors.md §2.
- **Migration-Header-Template**: "Source-of-truth: <baseline-file>" + "Applied patches: ..." + "Diff-Intent (nur N Zeilen)".
- **Post-Apply-Audit**: `pg_get_functiondef ILIKE '%<guard>%'` fuer jedes preserved Feature als Quick-Check.
