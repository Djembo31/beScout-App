# Active Slice

```
status: idle
slice: —
stage: —
spec: —
impact: —
proof: —
```

## Session 2026-04-20 Progress

| Slice | Title | Status |
|-------|-------|--------|
| 102 | Nationality Full-Name → ISO Mapper (Flag Fix) | ✅ DONE (053e5084 + ba3a2fe7) |
| 101 | Stadia v3 — Wikipedia Retry mit Exponential Backoff | ✅ DONE (41bb3945) |
| 103 | Nationality-Enrichment via TM + Ghost-Cleanup + DE-Aliases | ✅ DONE (pending commit) |
| 104 | Perf-Foundation (parallele Session) | 🟡 fremde Session, nicht angetastet |

## Slice 103 Recap

- **Phase 1**: 152/153 TM-scrape success (1 Fletcher timeout). TM.de lieferte deutsche Namen — gefixt durch Mapper-Erweiterung (+60 German aliases + malta fix)
- **Phase 2**: 106 Ghost-Spieler `club_id = NULL` (Safety-verified: 0 holdings/trades/orders)
- **Final Coverage**: 3672/3681 (99.76%) der visible non-TFF1 Spieler haben nationality
- **Tests**: 205 grün (184 mapper + 21 parser)

## Open (Scope-Outs)

- 126 TFF1 missing nationality → CEO-Sperrgebiet-Entscheidung nötig
- Fletcher (tm_id 1011140) + 8 active-ohne-TM → bei nächstem Full-TM-Rescrape
