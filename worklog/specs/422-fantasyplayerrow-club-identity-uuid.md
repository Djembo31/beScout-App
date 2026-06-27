# Slice 422 — FantasyPlayerRow Club-Identität (eigen + Gegner) aus zuverlässiger Quelle

**Slice-Type:** UI
**Größe:** S
**CEO-Scope:** nein (reines UI-Display, kein Geld, kein DB-Change, keine Wording-Änderung)
**Datum:** 2026-06-27

---

## 1. Problem-Statement (Evidence)

FantasyPlayerRow leitet **beide** Club-Logos aus unzuverlässigen String-Keys ab statt aus der aufgelösten/UUID-Quelle — der Kern-Anti-Pattern des Mock→Pro-Programms (Datenschicht hat die Wahrheit bereits, Komponente re-derived sie falsch). Zwei benachbarte Zeilen, beide faktenbasiert als Falsch-Daten belegt:

1. **Gegner-Logo** (`FantasyPlayerRow.tsx:72` `getClub(nextFixture.opponentShort)`): Short-Code ist mehrdeutig — **BAY = Leverkusen ↔ Bayern, same-league Bundesliga** (errors-frontend **S276**). `getClub(short)` returnt bei Kollision `null` (clubs.ts:93 — Konflikt-Shorts fliegen aus dem globalen Cache) → **kein/falsches Logo**. Explizit als Display-Rest in `fantasy.md` (Scoring, Slice 420) + Handoff als Folge-Slice vermerkt. `NextFixtureInfo.opponentLogoUrl` (per UUID-Join aufgelöst, Slice 420) liegt im Aufrufer-Scope bereit, wird aber weggeworfen.
2. **Eigenes Club-Logo** (`FantasyPlayerRow.tsx:71` `getClub(player.club)` + Zeile 152 Text `{player.club}`): `player.club` = `players.club` = **Legacy-Freitext-String** (String→UUID-Migration offen, mock2pro-plan Carry-over E). **DB-Probe (2026-06-27, Projekt skzjfhvgccaeplydsunz):** clubs.name eindeutig (0 Dupes); **294 von 4472 Spielern (6,6 %)** → String-aufgelöstes Logo ≠ `club_id`-aufgelöstes Logo, löst auf einen **anderen Club** auf (stale String vs UUID-Wahrheit). Der holdingMapper selbst nutzt für die Liga-Auflösung bereits `getClub(club_id)` (UUID), nicht den String — das Team behandelt den String schon als unzuverlässig. `clubId` (UUID) liegt im Prop-Scope bereit.

**Wirkung:** ~6,6 % der Fantasy-Rows zeigen ein falsches eigenes Club-Logo + falschen Club-Namen; BAY-Spieler zeigen falsches/kein Gegner-Logo. User-facing, visual-first (Anil-Prio).

## 2. Lösungs-Design

FantasyPlayerRow liest Club-Identität ab jetzt **aus der zuverlässigen Quelle**, nicht aus dem Freitext/Short:

- **Gegner:** Prop `nextFixture` um `opponentLogoUrl: string | null` erweitern → direkt rendern (`<Image src={nextFixture.opponentLogoUrl}>`), `getClub(opponentShort)` + lokale `opponentClub`-Variable **entfernen**. Das Logo ist upstream (Slice 420) bereits per UUID-Join aufgelöst — keine erneute Ableitung in der Komponente. Display-Text bleibt `opponentShort` (Kürzel ist als Label korrekt, nur als Lookup-Key verboten).
- **Eigenes:** Prop `player` um `clubId?: string | null` erweitern → `clubData = player.clubId ? getClub(player.clubId) : getClub(player.club)` (UUID zuerst, Freitext nur Fallback wenn clubId NULL). Logo aus `clubData?.logo`; Club-**Name-Text** Zeile 152 wird konsistent aus derselben Quelle: `clubData?.name ?? player.club` (sonst korrektes Logo + stale Name = inkonsistent). `getClub(uuid)` ist zuverlässig (clubs.ts:78, Cache nach UUID indiziert).

Beide Aufrufer (`PlayerPicker.tsx:128`, `LineupBuilder.tsx:214`) reichen die schon vorhandenen Felder durch (`opponentLogoUrl: nextFix.opponentLogoUrl`, `clubId: player.clubId`). Kein DB-/Service-/Mapper-Change.

## 3. Betroffene Files

| File | Änderung | Begründung |
|------|----------|------------|
| `src/components/fantasy/FantasyPlayerRow.tsx` | Prop-Typ `player.clubId` + `nextFixture.opponentLogoUrl`; Logo-Ableitung eigen (UUID) + Gegner (URL direkt); Name-Text aus clubData | Kern-Fix |
| `src/features/fantasy/components/lineup/PlayerPicker.tsx` | `clubId: player.clubId` in player-Obj + `opponentLogoUrl: nextFix.opponentLogoUrl` in nextFixture | Aufrufer 1 |
| `src/features/fantasy/components/lineup/LineupBuilder.tsx` | dito | Aufrufer 2 |
| `src/components/fantasy/__tests__/*` (falls FantasyPlayerRow-Test existiert) | ggf. Fixture um neue Felder | tsc/Test grün |

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

1. `src/components/fantasy/FantasyPlayerRow.tsx` — Prop-Shape (15-47), Logo-Render (71-72, 148-151, 168-172, Text 152). **Frage:** rendert Zeile 152 wirklich `{player.club}` als Text, und ist das die einzige Stelle für den Club-Namen? ✅ ja (gelesen).
2. `src/lib/clubs.ts` — `getClub` (162-164, Cache by UUID/slug/name/unique-short), `getClubByShortInLeague` (Konflikt-Map). **Frage:** ist `getClub(uuid)` kollisionsfrei? ✅ ja (UUID-Key eindeutig, Zeile 78).
3. `src/features/fantasy/services/fixtures.ts` — `NextFixtureInfo` (484-491): hat `opponentClubId` **und** `opponentLogoUrl` (UUID-Join, 536/548/607). **Frage:** ist opponentLogoUrl im Aufrufer-Scope? ✅ ja (`nextFix`).
4. `src/features/fantasy/components/lineup/PlayerPicker.tsx:85-133` + `LineupBuilder.tsx:170-218` — beide bauen `nextFixture`-Obj + haben `player.clubId` (UserDpcHolding) + `nextFix` in Scope. **Frage:** sind beide identisch im Pattern? ✅ ja.
5. `src/features/fantasy/mappers/holdingMapper.ts` — `clubId: h.player.club_id` (42) ist gesetzt; `club: h.player.club` (41) Freitext; nutzt selbst `getClub(club_id)` für Liga (33). **Frage:** liefert die Quelle clubId? ✅ ja.
6. FantasyPlayerRow-Test (falls vorhanden) — Snapshot/Assertion auf Logo/Club-Text? (grep im BUILD).

## 5. Pattern-References

- **S276** (errors-frontend) — Lookup-Map nach mehrdeutigem Short-Key überschreibt silent; `getByKeyAndLeague`/UUID-Disambiguator. Diese Slice schließt den von 420 offengelassenen Display-Rest.
- **Slice 420** (fantasy.md Scoring) — „Heim/Auswärts + Gegner + FDR = Club-UUID, nicht Short/Majority-Vote". `NextFixtureInfo.opponentLogoUrl/opponentClubId` stammen daher.
- **S368b** (errors-frontend) — „Display-Anker aus Source-of-Truth, nicht aus vergifteter denormalisierter Spalte." `players.club` (stale Freitext) = exakt diese Klasse.
- **S149b** (errors-frontend) — neue optional Prop → Caller-Threading manuell greppen (optional = kein tsc-Error). Hier `clubId?`/`opponentLogoUrl` beide Caller explizit bedienen.

## 6. Acceptance Criteria

- **AC-1 [HAPPY-Gegner]:** Ein BAY-Spieler (Gegner Leverkusen ODER Bayern) zeigt das **korrekte** Gegner-Logo. VERIFY: Live-Render bescout.net, Augen-Check Logo == Gegner aus `opponentClubId`. FAIL-IF: kein Logo / falsches Logo.
- **AC-2 [HAPPY-eigen]:** Ein Spieler aus den 294 stale-String-Fällen zeigt das **club_id**-Logo + **club_id**-Namen (nicht den stale String). VERIFY: gezielt einen solchen Spieler im Picker rendern. FAIL-IF: Logo/Name aus stale String.
- **AC-3 [Regression]:** Spieler ohne Kollision/Stale zeigen unverändert korrektes Logo+Name. VERIFY: Standard-Row visuell unverändert.
- **AC-4 [NULL-safe]:** `clubId === null` → Fallback `getClub(player.club)` (kein Crash, alter Pfad). `opponentLogoUrl === null` → kein `<Image>` (kein broken-img). VERIFY: tsc + Render mit null-Fixture.
- **AC-5 [build]:** `npx tsc --noEmit` grün + FantasyPlayerRow-betreffende Tests grün.
- **AC-6 [no-leak]:** Kein neuer `getClub(short)`-Aufruf in FantasyPlayerRow. VERIFY: `grep -n "getClub(" src/components/fantasy/FantasyPlayerRow.tsx` → nur UUID/Fallback.

## 7. Edge Cases

| Fall | Verhalten |
|------|-----------|
| `player.clubId === null` | Fallback `getClub(player.club)` (alter Pfad, kein Regress) |
| `getClub(clubId) === null` (Cache cold) | `clubData?.logo`/`?.name` → kein Logo + Fallback `player.club`-Text (graceful, wie bisher) |
| `nextFixture.opponentLogoUrl === null` | `{opponentLogoUrl && <Image>}` → kein broken-img, Label bleibt |
| `nextFixture === null` (kein Spiel) | bestehender `--`-Zweig unverändert |
| Cache noch nicht ready (Cold-Load) | beide getClub → null → graceful (bestehendes Verhalten, S286 nicht verschärft) |
| stale String == zufällig korrekt | UUID-Pfad liefert dasselbe → kein Unterschied |

## 8. Self-Verification Commands

```bash
npx tsc --noEmit
grep -n "getClub(" src/components/fantasy/FantasyPlayerRow.tsx     # erwartet: nur clubId/Fallback, kein opponentShort
grep -rn "opponentLogoUrl\|clubId:" src/features/fantasy/components/lineup/PlayerPicker.tsx src/features/fantasy/components/lineup/LineupBuilder.tsx
CI=true npx vitest run src/components/fantasy src/features/fantasy/components/lineup 2>&1 | tail -20
```

## 9. Open-Questions

- **Autonom-Zone (CTO):** Threading-Mechanik, Fallback-Reihenfolge (UUID zuerst, String-Fallback), Name-Text-Konsistenz. Entschieden.
- **Keine CEO-Frage:** kein Geld, kein Wording (Logos/Namen sind Daten, keine compliance-relevanten Strings), kein Breaking-Change.
- **Scope-Grenze:** Die `players.club`-String→UUID-**Daten**-Migration (Carry-over E, API-Football-Key gesperrt) bleibt out — diese Slice fixt nur die **Anzeige**, liest die UUID-Wahrheit (S368b: keine Backfill der vergifteten Spalte).

## 10. Proof-Plan

- Playwright/Chrome-DevTools gegen bescout.net (jarvis-qa), Fantasy-Picker: Screenshot mit (a) BAY-Gegner-Logo korrekt, (b) ein stale-String-Spieler mit korrektem eigenem Logo+Name. + tsc/vitest-Output als `.txt`. Proof `worklog/proofs/422-club-identity.txt` (+ png).

## 11. Scope-Out

- `players.club` String→UUID DB-Migration (Carry-over E).
- KaderPlayerRow / andere Surfaces mit demselben Muster (eigene Slices, falls Probe sie zeigt — hier nur FantasyPlayerRow, der gemeldete Smell).
- Admin-38-Hardcodes (separater gemeldeter Slice).

## 12. Stage-Chain (geplant)

SPEC → IMPACT (skipped: reines UI-Prop-Routing entlang vorhandener Felder, kein DB/Service/Mapper-Change) → BUILD → REVIEW (Pflicht, S) → PROVE (Live-Screenshot) → LOG.

## 13. Pre-Mortem (optional bei S)

- „Caller reicht clubId nicht durch" → optional Prop, kein tsc-Error → S149b: beide Caller explizit gegrept + bedient.
- „Name-Text wird inkonsistent (Logo neu, Text alt)" → Text mit auf clubData umgestellt.
- „Test-Fixture bricht (neues required Feld)" → Felder **optional** (`clubId?`, opponentLogoUrl in optionalem nextFixture-Obj) → kein Bruch; trotzdem Test-grep im BUILD (S375).
