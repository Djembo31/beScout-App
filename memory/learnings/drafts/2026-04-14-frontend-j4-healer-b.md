# Frontend Learnings — J4 Healer B (Multi-League FantasyEvent/Holding Types + LeagueBadge)

**2026-04-14 — Type-Erweiterung + LeagueBadge Integration**

## Observation 1: Multi-League Type-Gap war Client-Side-Cache-Fix, NICHT RPC-Change

**Confidence: high**

Task-Package hatte mich gewarnt dass FIX-13 "ggf. RPC-Aenderung → CEO-Approval" triggern koennte.
Actual: `events` + `players` Tabellen haben KEINE direkte `league_id` Column — Liga wird via
`club_id → clubs.league_id → leagues` aufgeloest. Die `lib/clubs.ts` + `lib/leagues.ts` Caches
(beide sync-verfuegbar nach `initClubCache`/`initLeagueCache`) erlauben ZERO-BACKEND-Aenderung.

Pattern: `dbEventToFantasyEvent` nutzt gleiches Vorgehen wie `players.ts dbToPlayer` (J3-Pattern,
Zeile 129-132). Wiederverwendbar fuer kuenftige Liga-Propagation in FantasyLeague,
EventCompactRow, EventSpotlight.

**Audit-Signal:** Vor jedem "ggf. RPC-Change"-CEO-Trigger: **Client-Side Caches pruefen** —
`lib/clubs.ts` + `lib/leagues.ts` decken Club+Liga vollstaendig ab.

## Observation 2: getRowProps Pattern triple-duplicated in Fantasy

**Confidence: medium**

`function getRowProps(player: UserDpcHolding)` ist 3x in Fantasy-Code dupliziert:
- `PlayerPicker.tsx:81`
- `LineupBuilder.tsx:153`
- `useLineupPanelState.ts:92`

Alle 3 mappen `UserDpcHolding → FantasyPlayerRow.props.player`. Bei jeder Prop-Shape-Erweiterung
muessen ALLE 3 upgedatet werden sonst Liga-Badge nur halb sichtbar. Candidate fuer Shared-Helper
(post-Beta Refactor).

**Audit-Signal:** `grep -n "function getRowProps\|getRowProps = " src/` vor jedem FantasyPlayerRow
Prop-Change.

## Observation 3: Worktree-Agent hat auf main gearbeitet statt Worktree

**Confidence: high**

Worktree `agent-a3e95c88` existiert mit eigenem Branch `worktree-agent-a3e95c88`, aber alle Edits
gingen nach `C:/bescout-app/...` (main). Das passiert weil Task-Package absolute paths in `C:/bescout-app/...`
Format referenziert, und Agent-Skript `cd C:/bescout-app` in jedem Bash macht (shell state nicht
persistent). Dadurch laeuft Agent effektiv auf main statt Worktree.

**Mitigation:** Healer-Briefing sollte entweder (a) expliziten Worktree-Path angeben
(`cd $WORKTREE_PATH`), (b) paper den pwd-Check in Phase-0 machen, oder (c) akzeptieren dass
Agent auf main arbeitet und die "Zero-Overlap"-Regel manuell durchsetzt (Files strikt getrennt
zwischen Healer A + B).

Healer A (Commit 3603c00) und Healer B (mein Commit cae1f78) haben sich hier NICHT ueberlappt,
weil das Task-Package klare File-Trennung hatte.

**Audit-Signal:** Parallel Healer = `git diff --stat` pro Commit disjoint-Files-verify, sonst
Merge-Conflict-Risiko.
