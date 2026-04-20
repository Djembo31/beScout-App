# Active Slice

```
status: idle
slice: —
stage: —
spec: —
impact: —
proof: —
```

## Letzte Session 2026-04-20 (ongoing)

| Slice | Title | Status |
|-------|-------|--------|
| 102 | Nationality Full-Name → ISO Mapper (Flag Rendering Fix) | ✅ DONE (commit 053e5084) |
| 101 | Stadia v3 — Wikipedia Retry mit Exponential Backoff | 🟡 BUILD done, PROVE pending (Script-Run) |
| 103 | Nationality-Enrichment Option (a) — Per-player API-Football | 🔵 queued |

## Slice 102 Recap

- Bug: Osimhen zeigt kein Flag — Root-Cause `nationality=Full-Name` in DB, Component erwartet ISO
- Fix: `src/lib/utils/countryNameToIso.ts` 180-Entry Mapper + `?? 'TR'` Default entfernt
- Coverage: **4163/4556 mapped (91.4%), 0 unmapped, 393 NULL-empty**
- Playwright-verifiziert: Osimhen (NG grün-weiß-grün) + Walker-Peters (GB-ENG St George's Cross)
- 185/185 tests passing incl. 145 neue Mapper-Tests

## Nächste Action

Slice 101 PROVE: Wikipedia-Cooldown ist durch (verifiziert 18:18). Script-Run:
```bash
node scripts/fetch-stadium-images.mjs --exclude-league=TFF1
```
Target ≥40 neue Stadion-Bilder (67 → ≥107), Output nach `worklog/proofs/101-stadia-v3-run.txt`.
