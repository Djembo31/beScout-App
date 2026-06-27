# Slice 425 — Welle-2 Display-Truth Cleanup (gebündelt A/B/C)

**Slice-Type:** UI
**Größe:** M
**Status:** SPEC
**CEO-Scope:** Nein (display-only, money-neutral, kein Migration, kein Wording-Change). CTO-autonom (Anil-Wahl 2026-06-27: „Welle-2-Cleanup abschließen").

## 1. Problem-Statement (Evidence)

Drei verifizierte Display-Smells aus dem **424-Review** (errors-frontend S424). Alle: die UI zeigt eine **Client-Approximation / stale Freitext** statt der **Server-Wahrheit**. Money-neutral — `score_event` UNBERÜHRT.

- **(A) Scored-Synergie zeigt Client-Vorschau statt gesettelten Bonus.** `ScoreBreakdown.tsx:184` rendert im **scored** Zweig `synergyPreview` (= Client-`calculateSynergyPreview`, `useLineupBuilder.ts:237`). Verifiziert (`grep synergy_bonus_pct` → 0 Render-Consumer): die gesettelte `lineups.synergy_bonus_pct` + `synergy_details` (DB, `types/index.ts:845-846`) werden NIE angezeigt. Folge: die finale Ansicht zeigt nicht den tatsächlich gebuchten Bonus — bei **Surge ×2** (Server `LEAST 30`) divergiert Client (max 15) vom echten Wert; bei Transfer-/Verkauf-Drift seit Settle ebenfalls.
- **(B) Scored-Breakdown-Zeile zeigt `player.club`-Freitext.** `ScoreBreakdown.tsx:154` `{player.club}` = stale Freitext (DB-belegt 294/4472 = 6,6 % falsch, S368b/S276; z.B. Amine Adli `players.club`="Bournemouth"). `UserDpcHolding.clubId` (UUID, kanonisch) liegt bereit.
- **(C) Kader-Club-Filter über `player.club`-Freitext-String.** `KaderTab.tsx:279` `availableClubs = Set(player.club)`, `clubFilter: string`, Filter `item.player.club === clubFilter` (Z.314). Gleiche stale-Freitext-Klasse → ein Spieler mit stale `club` landet im falschen Filter-Bucket / unter falschem Namen. `player.clubId` kanonisch (in `clubGroups` Z.334 + `nextFixturesMap` Z.361 schon genutzt).

## 2. Lösungs-Design

Pro Smell die Anzeige an die **kanonische Quelle** binden. Kein Server-/Schema-/Wording-Change.

- **(A)** `useLineupBuilder` exponiert `settledSynergy: { pct: number; details: SynergyDetail[] } | null` aus `dbLineup` beim DB-Load (Coercion `Math.round(Number(...))` — **Faktum: `synergy_bonus_pct` ist runtime NUMERIC-String "10.00"**, da `getLineup` `.select('*')`+`as DbLineup` ohne Mapping macht). Reset auf `null` in else/catch-Zweigen. EventDetailModal + AufstellenTab reichen `settledSynergy={lb.settledSynergy}` an `LineupBuilder` durch → an `ScoreBreakdown`. Im scored Synergie-Banner: settled bevorzugen, Fallback `synergyPreview` nur wenn settled null (Legacy-Lineups vor Feld-Existenz). **Faktum: `synergy_details.source` = Club-Name** (DB-Probe: "Amedspor"/"Erzurumspor FK") → `d.source` direkt rendern, kein `getClub`.
- **(B)** `ScoreBreakdown.tsx:154` → `{getClub(player.clubId)?.name ?? player.club}` (Import `getClub` aus `@/lib/clubs`).
- **(C)** `availableClubs: { id: string; name: string }[]` aus `clubId` (Name via `getClub(id)?.name ?? freitext`, dedupe nach id). `clubFilter` = clubId. Filter `item.player.clubId === clubFilter`. KaderToolbar-Dropdown `value=id`, `label=name` (Key≠Label, S276). `clubGroups.clubName` ebenfalls auf `getClub(id)?.name` heilen (Z.339).

## 3. Betroffene Files (geschätzt)

| File | Smell | Änderung |
|------|-------|----------|
| `src/features/fantasy/hooks/useLineupBuilder.ts` | A | `settledSynergy` State + DB-Load-Set + Return |
| `src/components/fantasy/EventDetailModal.tsx` | A | `settledSynergy`-Prop durchreichen |
| `src/features/manager/components/aufstellen/AufstellenTab.tsx` | A | dito |
| `src/features/fantasy/components/lineup/LineupBuilder.tsx` | A | Prop durchreichen an ScoreBreakdown |
| `src/features/fantasy/components/lineup/ScoreBreakdown.tsx` | A+B | scored Synergie aus settled + `{player.club}`→getClub |
| `src/features/manager/components/kader/KaderTab.tsx` | C | availableClubs/clubFilter/filter/clubGroups auf clubId |
| `src/features/manager/components/kader/KaderToolbar.tsx` | C | `availableClubs`-Prop-Type + Dropdown value/label |

## 4. Code-Reading-Liste (vor Implementation — ERLEDIGT)

1. `useLineupBuilder.ts:371-444` — DB-Load: `getLineup`→`dbLineup`, setzt `slot_scores/total_score/rank`. ✅ `synergy_bonus_pct`/`synergy_details` hier mitlesbar.
2. `lineups.queries.ts:59-68` — `getLineup` = `.select('*')` + `return data as DbLineup`, **kein Mapping** → NUMERIC kommt als String. ✅ Coercion nötig.
3. `types/index.ts:845-846,881` — `DbLineup.synergy_bonus_pct: number` (Type-Lüge), `synergy_details: SynergyDetail[]|null`, `SynergyDetail = {type:'club';source:string;bonus_pct:number;count?:number}`. ✅
4. DB-Probe `lineups.synergy_details` — `source`=Club-Name (nicht UUID). ✅ kein getClub für (A).
5. `ScoreBreakdown.tsx:54,184-194,154` — `synergyPreview`-Prop, scored Banner, `{player.club}`. ✅
6. `LineupBuilder.tsx:43,88,283` — `synergyPreview` Prop + ScoreBreakdown-Render. ✅ rein präsentational.
7. `EventDetailModal.tsx:101,327-333` + `AufstellenTab.tsx:60` — beide via `useLineupBuilder`-Hook (`lb`). ✅ zentral.
8. `KaderTab.tsx:271-280,314,330-343` — availableClubs/clubFilter/filter/clubGroups. ✅ clubId vorhanden.
9. `KaderToolbar.tsx:30,143-151` — `availableClubs: string[]` + Dropdown. ✅
10. `lib/clubs.ts:103` — `getClub(short)` returnt null bei Short-Kollision; `getClub(uuid)` sicher. ✅ nur UUID nutzen.

## 5. Pattern-References

- **errors-frontend S424** — „Surface liest Server" gegen echten Render-Consumer verifizieren, nicht Feld-Existenz (genau dieser Slice = Folge-Heilung).
- **errors-frontend S276** — Lookup nie nach ambiguem Key (short); UUID nutzen, Key≠Label im Dropdown.
- **errors-frontend S368b** — Display-Anker aus Source-of-Truth, nicht aus vergifteter denormalisierter Spalte (`players.club`).
- **Slice 422-424** — gleiche Klasse, Fantasy-Surfaces bereits geheilt (UUID-Identität); (B)/(C) = die letzten Reste.

## 6. Acceptance Criteria (executable)

- **AC1 (A):** Im scored Zustand zeigt das Synergie-Banner `Math.round(Number(dbLineup.synergy_bonus_pct))` % (z.B. 10, nicht „10.00"). VERIFY: Unit-Test `Number("10.00")`→10; Live-Render scored Event.
- **AC2 (A):** Bei `synergy_bonus_pct=0` (oder settled=null + preview 0) bleibt das scored Banner versteckt. VERIFY: ScoreBreakdown-Render-Bedingung `(settled?.pct ?? preview.totalPct) > 0`.
- **AC3 (A):** Surge-Fall: settled `pct` > Client-Max 15 wird korrekt gezeigt (kein Cap auf 15 in Anzeige). VERIFY: code-review (Anzeige nutzt settled-Wert ungecappt).
- **AC4 (A):** Bau-Zustand (`!isScored`, SynergyPreview-Banner) UNVERÄNDERT (nutzt weiter Client-`synergyPreview`). VERIFY: `git diff` SynergyPreview.tsx = 0 Zeilen.
- **AC5 (B):** ScoreBreakdown-Zeile zeigt `getClub(player.clubId)?.name ?? player.club`. VERIFY: grep ScoreBreakdown kein nacktes `{player.club}`; tsc 0.
- **AC6 (C):** Kader-Filter-Dropdown: value=clubId, label=aufgelöster Name; Filter matched `player.clubId`. VERIFY: KaderTab Filter `item.player.clubId === clubFilter`; Dropdown `value={c.id}`.
- **AC7 (C):** Filter-Reset + leerer Filter (`clubFilter===''`) zeigt alle (kein Regress). VERIFY: `if (clubFilter)` Guard bleibt.
- **AC8 (alle):** `tsc --noEmit` 0 + betroffene vitest grün. VERIFY: `pnpm exec tsc --noEmit` + `vitest run` fantasy+manager.

## 7. Edge Cases

| Fall | Verhalten |
|------|-----------|
| `synergy_bonus_pct` = NUMERIC-String "10.00" | `Math.round(Number())` → 10 |
| `synergy_details` = null (kein Synergie) | settled.details = [], Banner versteckt (pct 0) |
| Legacy-Lineup ohne synergy-Feld | settled=null → Fallback Client-preview (kein Crash) |
| Surge aktiv, settled.pct=30 | Anzeige 30 % ungecappt (Verbesserung ggü Client-15) |
| `player.clubId` null (stale Spieler ohne UUID) | `getClub(null)`→undefined → `?? player.club` Freitext-Fallback |
| Kader: Spieler mit clubId=null | dedupe-Key `id ?? club`, Name `getClub(id)?.name ?? club` |
| Kader: clubFilter alter String-Wert in State | default '' → alle; kein persistierter Cross-Session-State (useState lokal) |
| Zwei Clubs gleicher Name diff Liga | clubId-Filter trennt korrekt (vorher String-Merge) |

## 8. Self-Verification Commands

```bash
pnpm exec tsc --noEmit
CI=true pnpm exec vitest run src/features/fantasy src/features/manager src/types/__tests__/synergy-preview.test.ts
grep -n "player.club\b" src/features/fantasy/components/lineup/ScoreBreakdown.tsx   # nur noch getClub-aufgelöst
grep -n "clubFilter\|availableClubs" src/features/manager/components/kader/KaderTab.tsx
git diff --stat
git diff src/features/fantasy/components/lineup/SynergyPreview.tsx   # MUSS leer (AC4)
```

## 9. Open Questions

- **Pflicht-Klärung:** keine (CEO-Wahl bereits getroffen: Cleanup; Synergie BEHALTEN = D114).
- **Autonom-Zone:** Prop-Naming (`settledSynergy`), ob ein vs. zwei Props (Entscheid: ein Objekt-Prop), Dropdown-Markup-Detail.

## 10. Proof-Plan

- `pnpm exec tsc --noEmit` 0 → `.txt`.
- `vitest run` fantasy+manager+synergy grün → `.txt`.
- Neuer/erweiterter Unit-Test: Coercion `Number("10.00")`→10 + settled-bevorzugt-vor-preview Logik (Helper-extrahiert falls testbar).
- DB-Shape-Probe (synergy_details.source=Name) → `.txt` (bereits geholt).
- Optional Live-Render scored Event auf bescout.net (jarvis-qa) wenn ein gesettelter Event mit Synergie erreichbar.

## 11. Scope-Out

- `score_event` / jede RPC / Migration — UNBERÜHRT (display-only).
- Bau-Synergie-Banner (`SynergyPreview.tsx`) — unverändert (Client-Vorschau korrekt seit 424).
- Player-Domain `getClub(player.club)` in PlayerHero/PlayerRow/TradingCardFrame/index.tsx — **eigener** Smell-Cluster (Trading/Card-Identität), NICHT Welle-2-Scoring → separater Slice (gemeldet, nicht hier).
- Admin-Gameweek-Engine / Ranking-Konsolidierung / Welle 3 — CEO-Forks (offen).

## 12. Stage-Chain (geplant)

SPEC ✅ → IMPACT `skipped (display-only, kein Service-Contract/RPC/Schema-Change; Consumer = nur die 7 gelisteten Render-Files)` → BUILD → REVIEW (Reviewer-Agent Pflicht) → PROVE → LOG.

## 13. Pre-Mortem (M-optional, kurz)

1. **NUMERIC-String nicht gecoerct** → Banner „10.00 %". Mitigation: AC1 + Coercion im Hook.
2. **Prop-Threading vergisst eine Surface** (EventDetailModal ODER AufstellenTab) → tsc fängt fehlende required Prop NICHT wenn optional. Mitigation: `settledSynergy` als **required** Prop an LineupBuilder/ScoreBreakdown (Caller müssen `?? null` setzen, S149b).
3. **(C) clubFilter-State-Typ-Drift** (alter String-Wert) → useState lokal, default '' → kein persistenter Bug.
4. **(B) getClub(clubId) bei null** → `?? player.club` Fallback (kein leerer Name).
5. **SynergyPreview versehentlich mitgeändert** → AC4 git-diff-Gate.
