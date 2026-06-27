# Slice 424 — Synergie-Vorschau == Server (Formel + clubId + count)

**Slice-Type:** UI · **Größe:** M · **CEO-Scope:** nein (Display-only; `score_event`/Money-RPC unberührt) · **Datum:** 2026-06-27
**CEO-Entscheid (Anil 2026-06-27):** Synergie BEHALTEN + „Vorschau == Server".

## 1. Problem-Statement (Evidence, Live-`functiondef` D87)

`score_event` (Server-Wahrheit) rechnet Synergie so: pro **distinct club_id mit ≥2 Lineup-Spielern** → **+5 %** (flat), `LEAST(15)`, danach `synergy_surge`-Chip ×2 (`LEAST(30)`). Die Client-Vorschau divergiert mehrfach:

- **Banner** `calculateSynergyPreview` (`src/types/index.ts:884`), Quelle `useLineupBuilder.ts:228` (`clubs = …map(h => h.club)`):
  1. **Key = `h.club`-Freitext** (stale für 6,6 % der Spieler, DB-belegt Slice 422) → Banner-Synergie weicht vom Server (club_id) ab. Slice 423 fixte die Picker, **nicht** diesen Banner-Rechner.
  2. **Formel `Math.min(5*(count-1), 15)` pro Verein** statt server-flat `+5` → 3 Spieler gleicher Verein = Client **10 %**, Server **5 %**. Überzeichnet.
  3. **`count` fehlt im Detail** → Banner zeigt `×${Math.ceil(bonus_pct/5)+1}` (war unter alter Formel zufällig == count; nach flat-Fix immer „×2"). Falsch.
- **Row-Pill** (3 Picker): `synergyPct = synergyClubs.filter(c=>c===key).length * 4` → `synergyClubs` ist deduped Set (seit 423 clubId) → `length` immer 0/1 → Pill **immer 4 %** (Server-Per-Verein = 5 %).

## 2. Lösungs-Design

Client-Vorschau exakt an Server angleichen — **rein Display, `score_event` unberührt**:
- `calculateSynergyPreview(clubs: {id,name}[])`: gruppiert nach `id` (clubId), Formel **flat +5 % pro ≥2-Verein, `Math.min(15, …)`**; Detail trägt `count` (echte Spielerzahl) + `source = name` (aufgelöst, nicht UUID).
- `SynergyDetail` += `count?: number`.
- `useLineupBuilder.ts:226`: Quelle `{ id: h.clubId ?? h.club, name: getClub(h.clubId)?.name ?? h.club }`.
- Banner-Render (`SynergyPreview.tsx:169`, `LineupPanel.tsx:826`): `×${d.count ?? …}` statt aus `bonus_pct` abgeleitet.
- Row-Pill (PlayerPicker/LineupBuilder/useLineupPanelState): `synergyPct = hasSynergy ? 5 : null` (Server-Per-Verein-Wert; `hasSynergy` schon clubId-keyed seit 423).
- **Surge (×2): Scope-Out** — der `synergy_surge`-Chip-State liegt im Builder nicht vor (Server prüft `chip_usages`); Banner zeigt **Basis-Synergie** (wie bisher), Surge verdoppelt erst beim Settle. Explizit dokumentiert.

## 3. Betroffene Files

| File | Änderung |
|------|----------|
| `src/types/index.ts` | `SynergyDetail.count?`; `calculateSynergyPreview` Signatur `{id,name}[]` + flat-Formel + count |
| `src/features/fantasy/hooks/useLineupBuilder.ts` | Quelle clubId+name (getClub-Import) |
| `src/features/fantasy/components/lineup/SynergyPreview.tsx` | Banner `×${d.count}` |
| `src/components/fantasy/event-tabs/LineupPanel.tsx` | Banner `×${d.count}` (Z.826) |
| `src/features/fantasy/components/lineup/PlayerPicker.tsx` | Pill `*4`→`5` |
| `src/features/fantasy/components/lineup/LineupBuilder.tsx` | Pill `*4`→`5` |
| `src/components/fantasy/event-tabs/useLineupPanelState.ts` | Pill `*4`→`5` |

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

1. `score_event` Live-functiondef Synergie-Block — flat +5/≥2-club, LEAST 15, surge ×2 LEAST 30. ✅ verifiziert (D87).
2. `src/types/index.ts:881-898` — `SynergyDetail` + `calculateSynergyPreview` (alte Formel `5*(count-1)`). ✅ gelesen.
3. `useLineupBuilder.ts:224-229` — einzige calculateSynergyPreview-Quelle, nutzt `h.club`-String. ✅.
4. `SynergyPreview.tsx:163-173` + `LineupPanel.tsx:820-826` — Bau-Banner `×${Math.ceil(bonus_pct/5)+1}`. ✅.
5. Scored-Banner `LineupPanel.tsx:762-768` + `ScoreBreakdown.tsx:184-190` — lesen **Server**-`synergy_details` (`bonus_pct`), NICHT den Client-Preview → unberührt lassen. ✅.
6. 3 Picker Pill-Zeilen (synergyPct). ✅ (aus 423).
7. Tests, die `calculateSynergyPreview`/SynergyDetail/`synergy_details` mocken (grep im BUILD, S375).

## 5. Pattern-References

- **D87** Live-functiondef vor Money-Annahme (Server-Formel exakt gespiegelt).
- **Slice 423** — Picker-synergyClubs schon clubId; dieser Slice schließt den Banner-Rechner + Magnitude.
- **S368b** Source-of-Truth-Display (stale `players.club` raus).
- **errors-db S330/S379** — eine Logik an mehreren Flächen (Banner + 3 Pills + scored) → alle enumerieren, Server-vs-Client-Flächen unterscheiden.

## 6. Acceptance Criteria

- **AC-1:** Lineup mit 3 Spielern desselben Vereins → Banner zeigt **+5 %** (nicht 10 %) + `×3`. VERIFY: Logik/Unit.
- **AC-2:** Lineup mit 2 Vereinen je 2 Spieler → Banner +10 %, je `×2`. VERIFY.
- **AC-3:** 4 Vereine je 2 Spieler → Banner +15 % (Cap, nicht 20). VERIFY.
- **AC-4:** Banner gruppiert nach club_id — zwei stale-String-Spieler gleichen club_id zählen als 1 Verein (×2). VERIFY.
- **AC-5 [Pill]:** Kandidat, dessen Verein im Lineup ist → Pill „+5 %" (nicht +4). VERIFY: grep.
- **AC-6 [server-unberührt]:** kein Migration-File; `git diff --stat` nur TS. VERIFY.
- **AC-7 [scored-unberührt]:** Scored-Banner (`d.bonus_pct`) unverändert. VERIFY.
- **AC-8 [build]:** tsc 0 + betroffene Tests grün.

## 7. Edge Cases

| Fall | Verhalten |
|------|-----------|
| clubId null | Key-Fallback `h.club` (Name = `h.club`) |
| count alt fehlt im Server-detail (alte Events) | `count?` optional → Bau-Banner setzt count immer; Render `d.count ?? Math.round(bonus_pct/5)+1` Fallback |
| >3 ≥2-Vereine | totalPct cappt bei 15, alle Details gelistet (mirror Server) |
| Surge aktiv | Banner zeigt Basis (Scope-Out, Note) |
| 1 Spieler/Verein | kein Detail, totalPct 0 |

## 8. Self-Verification Commands

```bash
npx tsc --noEmit
git diff --stat   # nur TS, kein supabase/migrations
grep -n "calculateSynergyPreview\|count" src/types/index.ts | head
grep -rn "synergyPct = hasSynergy" src/features/fantasy/components/lineup/ src/components/fantasy/event-tabs/useLineupPanelState.ts
CI=true npx vitest run src/components/fantasy src/features/fantasy 2>&1 | tail -15
```

## 9. Open-Questions

- **Autonom-Zone:** Formel-Spiegelung, count-Feld, Pill-Wert. Entschieden gegen Live-functiondef.
- **Kein Money/CEO:** `score_event` unberührt (Server = Wahrheit). Anil-Entscheid „behalten + Vorschau==Server" liegt vor.
- **Scope-Out (Note):** Surge-×2 im Banner (Chip-State nicht im Builder) — eigener Slice falls gewünscht.

## 10. Proof-Plan

- `git diff --stat` (nur TS, kein Migration) + tsc + vitest + ein kleiner Unit-Smoke der `calculateSynergyPreview` (3-gleicher-Verein→5 %/×3; Cap-Fall) als Beleg + functiondef-Zitat (Server flat-5). → `worklog/proofs/424-synergy-parity.txt`. Live best-effort (Banner im offenen Event).

## 11. Scope-Out

- Surge-×2-Vorschau (Chip-State).
- `score_event` selbst (Server korrekt).
- Pill-Cap-Nuance (3.-Spieler-marginal-0): Pill bleibt simpler „+5 % wenn Verein im Lineup" (Banner trägt die exakte Summe).

## 12. Stage-Chain (geplant)

SPEC → IMPACT (skipped: Display-only) → BUILD → REVIEW (Pflicht, M, money-naher Display) → PROVE → LOG.

## 13. Pre-Mortem

- „Berührt Geld" → score_event unberührt, kein Migration (AC-6 Gate). Client-Vorschau ist Anzeige.
- „Scored-Ansicht bricht" → die liest Server-`synergy_details`, nicht den Client-Preview (AC-7).
- „SynergyDetail.count required bricht Server-Cast" → `count?` optional + Fallback.
- „calculateSynergyPreview-Signatur-Change bricht Tests" → grep im BUILD (S375).
