# Active Slice

```
status: spec
slice: 144
stage: SPEC
spec: worklog/specs/144-b3-tm-squad-page-scraper.md
impact: required (players + player_external_ids writes, last_squad_check ADD COLUMN migration)
proof: —
```

## Slice 144 — B3 TM-Squad-Page-Scraper (M)

Neue Scrape-Strategie: Pro Club 1 Request auf TM-Squad-Page statt ~25-70 Player-Profile-Requests. **75× weniger Netzwerk-Last** als aktueller Scraper. Slice 141b lieferte Pre-Condition (134/134 Clubs haben TM-IDs).

**SPEC bereit.** Nächster Step nach Anil-Approval (M-size → CEO-Approval-Matrix scannen):
- BUILD: parser + tests + lokaler Script + migration + service helper
- PROOF: vitest + dry-run-log + DB-verify + comparison vs current DB-State

Offene Frage für Anil:
- "Leihspieler" in Squad-Table zählen als Club-Member (diese Saison beim Leihverein)? Meine Empfehlung: **JA** (Alternative: Stammverein-Loyalty — weniger intuitiv für Fans).
