# Frontend Journal: Slice 198b Track C — Fantasy + Brand Top-5

## Gestartet: 2026-04-25

### Verstaendnis
- Was: 5 Findings: F-12 sticky countdown, C-04 predictions-limit hint, C-05 top-predictor leaderboard, K-02 most-owned players, Brand #11 PitchView token-migration.
- Betroffene Files: Fantasy components, Club-Squad-Tab, PitchView, messages/{de,tr}.json
- Risiken: i18n-compliance (kein "gewinn"), neue RPC vermeiden, Worktree-Path-Trap.

### Entscheidungen
| # | Entscheidung | Warum |
|---|---|---|
| 1 | Skip C-05/K-02 wenn neuer RPC noetig | Briefing-Constraint |
| 2 | Sticky-Countdown via position:sticky | CSS-only, kein layout-thrash |
| 3 | C-04 Wording: "Qualität über Quantität" | compliance-konform |

### Fortschritt
- [x] F-12 Sticky-Countdown — sticky-bar in EventDetailHeader, top-0, backdrop-blur
- [x] C-04 Predictions-Limit-Hint — "Max. 5 Tipps pro Spieltag — Qualität über Quantität" (DE+TR), tooltip + visible <p>
- [-] C-05 Top-Predictor Leaderboard — SKIPPED: aggregate ueber predictions GROUP BY user_id braucht neuer SECURITY DEFINER RPC (RLS schuetzt pending predictions). Backlog: Slice 199.
- [-] K-02 Most-Owned Players — SKIPPED: holdings RLS blockiert cross-user reads. Existing `get_player_holder_count` ist single-player; Aggregat per Club braucht neuer RPC (oder list-Variante mit Pagination). Backlog: Slice 199.
- [x] Brand #11 PitchView Z235+238 (originally noted Z221+224) — bg-black/40 → bg-bg-main/40, bg-black/30 → bg-bg-main/30. Token-konform.

### AFTER Phase (8-Punkt Checkliste)
- [x] Types propagiert: keine Type-Aenderungen
- [x] i18n DE+TR: deadlineLabel + limitHint beidseitig
- [x] Column-Names: keine DB-Edits
- [x] Consumers aktualisiert: keine Service-Edits
- [x] UI-Text $SCOUT/Tickets-Kontext: predictions-Hint clean (Tipps, nicht Trading)
- [x] Keine Duplikate
- [x] Service Layer: keine Service-Edits, nur UI
- [x] Edge Cases: F-12 hides countdown when status='ended' (kein "0d 0h 0m")

### Frontend-Specific
- [x] Components aus Skill Registry: useTranslations, Clock-icon, kein neuer Component
- [x] Design Tokens: bg-bg-main, gold, white/50, white/[0.06] — alle dokumentiert
- [x] Touch targets: keine neuen Buttons
- [x] aria-labels: Clock-icons mit aria-hidden="true"
- [x] Kein verbotenes CSS pattern

### Runden-Log
- Runde 1 (2026-04-25 23:54): Implementierung erfolgreich.
  - tsc --noEmit clean (EXIT=0)
  - vitest src/components/fantasy: 15 files, 133 tests passed
  - Compliance audit: 0 hits "gewinn|prämie|preis|win|prize|kazan" auf neue Strings

### Skips Begruendung
- C-05 + K-02: Briefing erlaubt explicit Skip wenn neuer RPC noetig — nicht in Track-C Scope (kein Backend, kein DB-Schema). Beide Items setzen aggregierte Reads voraus, die RLS verhindert. Alternative wuerde Service-Layer-Drift erzeugen.

### LEARNINGS
- Sticky-Pattern in Modal-Body: `sticky top-0` funktioniert relativ zum scrollenden Parent (`overflow-y-auto`). `-mx-4 md:-mx-5 -mt-4 md:-mt-5` gleicht das Body-Padding aus, sodass die Bar full-width pinned bleibt.
- bg-bg-main Token (`#0a0a0a` aus tailwind.config.ts) ist sauberer Ersatz fuer hardcoded `bg-black` — strict darker-than-bg-black aber identisch fuer Dark-Mode-Only Codebase.
- Compliance-Wording fuer "Predictions/Tipps": "Qualität über Quantität" + "kalite önemli" sind clean (keine "gewinn"/"kazan"-Stamm-Toxic).

