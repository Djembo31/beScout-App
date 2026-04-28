# Archived Once-Off Scripts (2026-04-28)

Slice 240 Triage. Diese Scripts wurden archiviert weil sie One-Time-Jobs sind die abgeschlossen wurden. Sie bleiben im Repo für historische Referenz, aber nicht in `scripts/` weil sie Discovery-Noise produzieren.

## Inventar

| Script | Original-Path | Phase / Slice | Zweck |
|--------|---------------|---------------|-------|
| `tm-club-id-discovery.ts` | `scripts/tm-club-id-discovery.ts` | Slice 141 | Multi-League TM-Club-ID-Mapping (alle 7 Ligen, Phase B done) |
| `tm-squad-scrape-local.ts` | `scripts/tm-squad-scrape-local.ts` | Slice 144 | TM-Squad-Page-Scraper Initial-Run (alle Clubs squad-scraped, Phase B done) |
| `tm-html-inspect.mjs` | `scripts/tm-html-inspect.mjs` | Dev-Tool | 9-Liner-Helper für tm-parser-sanity, dev-time-only Debug |
| `fix-bug-004.ts` | `scripts/fix-bug-004.ts` | BUG-004 | Once-off Reset für 13 events stuck status='running' (gefixt) |
| `fix-migration-history.sh` | `scripts/fix-migration-history.sh` | 2026-04-09 | Supabase Migration-History-Repair (drift-Fix, einmalig) |

## Rationale für Archivieren statt Löschen

- **Reversibel**: Falls Phase-B-Style-Operation in Zukunft wieder nötig (z.B. neue Liga, neuer Bug), Script kopierbar
- **History-Preservation**: `git mv` behält File-History, `git log --follow scripts/archived/.../<name>` zeigt Pre-Move-History
- **Discovery-Reduction**: `scripts/` enthält jetzt nur operational + active Tools

## Wenn doch nochmal gebraucht

```bash
# Restore aus archive:
git mv scripts/archived/2026-04-28-once-off/<name> scripts/<name>

# Oder kopieren als Vorlage für neue Slice:
cp scripts/archived/2026-04-28-once-off/<name> scripts/<new-name>
```

## Was BLEIBT in `scripts/` (operational manual-tools)

- `tm-parser-sanity.ts` + `tm-parser-verify.ts` — TM-Parser-Regression-Tests bei Parser-Edits
- `tm-profile-local.ts` — TM-Profile-Scraper (Cloudflare-Workaround), recurring
- `tm-rescrape-stale.ts` — Stale-TM-Data-Maintenance, recurring
- `tm-search-local.ts` — TM-Search (Cloudflare-Workaround), recurring
- `tm-search-scrape-unknown.ts` — Unknown-Player-Recovery, recurring
- `enrich-nationality-tm.ts` — Nationality-Backfill, manual on Multi-League-Import
- `verify-nationality-coverage.ts` — Audit-Tool, manual on demand

Diese stehen auch weiterhin in `scripts/wiring-check.ts` `KNOWN_ORPHANS`-Allowlist.
