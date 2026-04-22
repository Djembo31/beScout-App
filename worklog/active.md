# Active Slice

```
status: idle
slice: —
stage: —
spec: —
impact: —
proof: —
```

## Zuletzt: Slice 141 (2026-04-22) — TM-Club-ID-Discovery-Script (S)

Lokaler Playwright-Script (`scripts/tm-club-id-discovery.ts`) leitet TM-Club-IDs aus
bestehenden Player-TM-Mappings ab → UPSERT `club_external_ids`. Löst Cloudflare-
Block für Vercel-IPs. Pre-Condition für Backlog-Item B3.

**Next:** Anil führt lokal `npx tsx scripts/tm-club-id-discovery.ts --dry-run --league="Süper Lig"` aus (Smoke-Test), dann Full-Run ohne --dry-run. Proof-Commit `141b-script-run.txt` danach. Unblockt B3.
