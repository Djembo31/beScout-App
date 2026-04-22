# Next Session Briefing — 2026-04-24

## TL;DR (3 Sätze)

Session 2026-04-22 (2. Session dieses Tages) hat 8 Code-Commits geliefert: Slice 140b (manual cleanup stale GW30), 141+141b (TM-Club-ID-Discovery 134/134), 142 (Unfollow-Wipe-Fix), 143 (Follower-Count-Integrity), 144+144b (B3 TM-Squad-Scraper Full-Run), 145 (Reviewer-Hook strict-block + 6-Stufen-SHIP-Loop). SHIP-Loop ist jetzt 6-stufig mit REVIEW-Gate. 225 Transfer-Moves warten auf Anil-Entscheidung (`--allow-transfers` y/n).

**Erste Aktion morgen:** `git log --oneline -10` + Session-Self-Assessment 2x-durchlesen (Gap #2-10 aus Session 2026-04-22 Final) → entscheiden ob Visual-QA-Hook oder Transfer-Apply nächstes ist.

---

## State-Snapshot

### DB-Truth
- 134/134 Clubs mit `club_external_ids(source='transfermarkt')`
- 4556 players total, 2616 mit `last_squad_check` (57% nach 1. Full-Run)
- 225 transfer pending (gefunden via Squad-Scraper, nicht applied)
- 295 unknown TM-players (Insert-Pfad bei sync-players-daily)
- 324 players mit `mv_source='transfermarkt_stale'` (Slice 081-Protected)

### Code-State
- SHIP-Loop: SPEC → IMPACT → BUILD → REVIEW → PROVE → LOG (6 Stufen)
- Hook `ship-cto-review-gate.sh`: strict-block, heredoc-exempt entfernt
- ClubProvider: Skip-Reconcile auf BEIDEN Follow/Unfollow-Paths (Slice 139+142)
- React Query Cache: setQueryData für clubs.followers + isFollowing nach toggleFollow (Slice 143)
- TM-Squad-Scraper: parseSquadTable + scripts/tm-squad-scrape-local.ts operational

### Infrastructure
- CRON_SECRET aktuell (Anil 2026-04-22 aktualisiert)
- Supabase alter sb_secret_vT7ae… noch aktiv in Dashboard (Revoken empfohlen, noch offen)
- Vercel Deploy auf HEAD `6c26fb9e` + pending `1d396aaa` (Slice 144)

---

## Drei Optionen für Start

### Option A: Transfer-Apply Full-Run (10 min Anil-gated)
- `npx tsx scripts/tm-squad-scrape-local.ts --allow-transfers`
- 225 Transfer-Moves werden live (club_id-UPDATEs)
- Pre-Check: Sind Spieler mit Holdings in Orderbook? Dann Cross-Club-Trade-Konsistenz prüfen.
- Post: DB-Verify + Proof-Commit 144c

### Option B: Visual-QA-Hook (P1 Gap #3 aus Self-Assessment) (1-2h Claude)
- Neuer Hook `ship-visual-qa-gate.sh`: Blockt Commits mit `src/app/` oder `src/components/`-Changes ohne `worklog/qa/<slice>-screenshot.png` (gegen bescout.net)
- Slice 148 (M) — analog zu Slice 145 Struktur
- Schließt die zweite Session-Self-Assessment-Lücke

### Option C: Follow-up Cleanup-Slices (2-4h, batched)
- **144c XS:** last_squad_check auch für transfer-detected players (20 min)
- **144e XS:** WER-Cluster null-club-id audit (30 min)
- **146 XS:** merge-wildmatch anchoring in ship-*-gate.sh (20 min)
- **147 XS:** /ship new Skill-Template review:-Key (10 min)
- **B0 (Gold-Standard CSV):** 134 unknown-Spieler via CSV-Import (3-4h Anil-manual)

**Meine Empfehlung:** Option B. Gap #3 (Visual-QA) ist die strukturelle Lücke die nach #1 (Reviewer) die größte Hebelwirkung hat. Transfer-Apply (A) ist 10 min aber riskanter — besser nach Visual-QA-Hook-Stabilität.

---

## Session-Bilanz 2026-04-22 (Session 2, persistiert)

### Code-Slices (8)

| Commit | Slice | Scope | Impact |
|---|---|---|---|
| `b031bc85` | 140b | manual cleanup 4 stale SL GW30 Fixtures | DB via API-Football direct fetch |
| `ec1463f1` | 141 | TM-Club-ID-Discovery-Script initial | Pre-Condition für B3 |
| `e7a346ab` | 141b | Parser anchor-based + U19-filter | 134/134 Clubs mapped (100%) |
| `a0c1982d` | 142 | Skip reconcile on unfollow-success too | Multi-Club-Unfollow-Wipe-Bug gefixt |
| `5a91a008` | 143 | Follower-Count Integrity | Silent-Fail + setQueryData Cache-Propagation |
| `1961457f` | 144 spec | B3 Squad-Scraper Spec | M-Klassifizierung |
| `1d396aaa` | 144 | B3 Squad-Scraper Build | Parser + Tests + Script + Migration |
| `6c26fb9e` | 145+144b | Reviewer-Hook + Full-Run Proof | 6-Stufen-SHIP-Loop + 2841 matched |

### Decisions (2 neu)

- **D13 PROCESS:** Reviewer-Agent als Pflicht-Stage nach BUILD (strict-block Hook).
- **D14 ARCHITECTURE:** TM-Squad-Page-Strategie statt Search-Profile-Pattern (75× weniger Requests).

### Patterns (6 neu in common-errors.md)

1. Shell case-statement wildcard promiskuös (Section 7, `*"merge"*`)
2. Heredoc-Backdoor in Commit-Gates (Section 7)
3. Nested-tr + non-greedy regex mid-row cutoff (Section 10, tr-depth-counter)
4. HTML-Attribut-Order-Sensitivity (Section 10, 2-step extraction)
5. DE-EN Name-Drift in Fuzzy-Match (Section 10, Locale-Drift bei externen Scrapers)
6. URL-based Canonical-ID statt Fuzzy-Match (Section 10)
7. setQueryData statt invalidateQueries bei deterministic optimistic (Section 11, neu)

### Session-Self-Assessment (Note: 2- / Gut minus)

Output stark (8 Commits, echte Data, Tests, Proofs), aber 10 Discipline-Gaps:

| # | Gap | Status |
|---|-----|--------|
| 1 | Reviewer-Agent nie dispatched | ✅ **Hook live (Slice 145)** |
| 2 | Agent-Dispatch bei 3+ Files | offen |
| 3 | Visual-QA fehlt | offen (Option B) |
| 4 | Parser 3-Iteration-Drift | Pattern dokumentiert in common-errors.md |
| 5 | Follower-Count reaktiv | ad-hoc fixed (Slice 143) |
| 6 | Known-Issues in Backlog statt Fix | offen |
| 7 | context7 MCP überspringen | offen |
| 8 | Knowledge-Flywheel teilweise | ✅ common-errors.md updated (6 neue Patterns) |
| 9 | Notion-Sync | offen |
| 10 | Inline-Spec statt /ship new | offen |

---

## Risiko-Watch

- **Slice 142 Live-Verify:** Fix ist auf main, Vercel-Deploy pending. Test: 2 Clubs folgen, einen unfollowen → nur einer verschwindet (nicht beide).
- **Squad-Scraper Transfer-Backlog:** 225 Spieler mit `club_id`-Drift in DB. Je länger das wartet, desto mehr können dazukommen (jeder Transfer-Window-Cycle).
- **Reviewer-Hook Dogfood:** Heute 1× durchlaufen (Slice 144b + 145 selbst). Frische DX-Observation: Read-Only-Reviewer konnte Files nicht schreiben → Primary-Claude musste Content aus Agent-Output kopieren. Pragmatisch aber friktional.
- **CRON_SECRET wurde aktualisiert** — lokaler Dev-Flow kann jetzt wieder Admin-Routes triggern. Stale-Detection falls Script wieder 401 wirft.

---

## Anil-Action-Items (offen)

| # | Task | Aufwand |
|---|------|---------|
| ~~A0~~ | ~~Supabase sb_secret_vT7ae… revoken~~ | 5 min (empfohlen diese Woche) |
| A1 | 3 Beta-Tester organisieren | extern |
| A2 | Deutsch-Türke für TR-Locale-Review | extern |
| A3 | Decision: Squad Transfer-Apply `--allow-transfers`? | 5 min |
| A4 | Decision: Visual-QA-Hook jetzt oder später? | 5 min |

---

## Confidence der Übergabe

- ✅ 9 Commits auf main
- ✅ active.md idle
- ✅ worklog/log.md updated (Slices 140b, 141, 141b, 142, 143, 144, 144b, 145)
- ✅ common-errors.md updated (6 neue Patterns, Stand 001-145)
- ✅ decisions.md updated (D13 + D14)
- ✅ backlog.md updated (B3 DONE, B6-B11 new)
- ✅ 2 neue Review-Files in worklog/reviews/
- ✅ Neue Directory worklog/reviews/
- ⚠️ Notion-Kanban Sync fehlt (manueller Anil-Schritt)
- ⚠️ Vercel-Deploy für letzten Commit (`6c26fb9e`) evtl. noch im CI
