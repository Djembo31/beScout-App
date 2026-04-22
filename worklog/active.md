# Active Slice

```
status: prove
slice: 141
stage: PROVE
spec: worklog/specs/141-tm-club-id-discovery-script.md
impact: skipped (additiver Parser + isolierter lokaler Script, kein Service/RPC/RLS-Change)
proof: worklog/proofs/141-vitest.txt + 141-db-baseline.txt + 141-runbook.txt
```

## Slice 141 — TM-Club-ID-Discovery-Script (Pre-Condition für B3)

**BUILD komplett:**
- `src/lib/scrapers/transfermarkt-profile.ts` +`parseCurrentClubTmId()` (Regex auf erste 10k-char, Title-Attribut + Slug-Fallback)
- `src/lib/scrapers/transfermarkt-profile.test.ts` +7 Tests (27 total grün)
- `scripts/tm-club-id-discovery.ts` (Playwright + Supabase service-role, Fuzzy-Match via Token-Overlap, --dry-run + --only-unmapped + --rate Flags)

**PROVE:**
- Tests: 27/27 grün (`worklog/proofs/141-vitest.txt`)
- DB-Baseline: 134 Clubs, 0 TM-mapped (Pre-Condition bestätigt), 134 Clubs mit TM-Player (100% Upper-Bound)
- Runbook für Anil: `worklog/proofs/141-runbook.txt`

**Script-Run wartet auf Anil** (Vercel-Cloudflare-Block → lokaler Laptop-Run nötig). Nach Run: proof-commit `141b-script-run.txt`.

**Nächster Step:** /ship done — Commit dieser Slice.
