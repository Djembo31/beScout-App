# Slice 262 Pre-Review (D62-Pattern)

**Verdict:** REWORK (3 P0, 4 P1, 2 P2) — vor Anil-Multi-Choice fixen
**Spec:** `worklog/specs/262-hero-mode-detection-manager-block.md`
**Time:** ~25 min (inkl. 2 abgeschnittener Reviewer-Agent-Runs + Primary-Verify)

---

## P0 — must fix before BUILD

### F-01 · Spec §2 + §4 — useHomeData importiert HEUTE NICHT useLeagueScope (Faktenfehler)

**Issue:** Spec sagt „State-Sources (alle existing): useLeagueScope() — leagueId/leagueName SSOT". Aber `grep useLeagueScope src/app/(app)/hooks/useHomeData.ts` → 0 Treffer. Heute nutzt useHomeData KEINEN League-Scope. Spec gibt also „import-add ist trivial, übersehe nicht" mit, das ist faktisch ein BUILD-Schritt der explizit dokumentiert sein muss.

**Fix:** Spec §2 ergänzt: `// BUILD-Step 1: Import-Add useLeagueScope in useHomeData.ts:6` als expliziter Schritt. §3 „Betroffene Files" Cell für useHomeData ergänzt: `+ Import useLeagueScope, +1 Lookup für scopedLeagueId`. Verhindert Habit-Blindspot „der Import-Add wurde vergessen, heroMode immer 'scout'".

**Self-Verify post-BUILD:**
```bash
grep -n "useLeagueScope" src/app/\(app\)/hooks/useHomeData.ts  # erwarte 2 Zeilen (import + call)
```

---

### F-02 · Spec §9 Decision D + §13 PM-2 — placeholderData-Wiring fehlt

**Issue:** Decision D=c „placeholderData aus persist-cache" als Empfehlung. Aber:
- `qk.events.all = ['events', 'list']` ist persisted (kein USER_SCOPED_DOMAIN, kein UUID) — gut so weit.
- ABER `useEvents()` (`src/lib/queries/events.ts`) selbst nutzt heute KEIN `placeholderData`. Die Spec sagt nicht WIE der placeholderData-Wiring konkret aussehen soll.

**Drei Optionen die Spec klären muss:**

| Option | Beschreibung | Risiko |
|--------|--------------|--------|
| (a) `useEvents()` selbst um `placeholderData` ergänzen | Cross-Component-Impact — alle Konsumenten von useEvents betroffen | M (Sentry-Watch nötig) |
| (b) Lokaler hero-spezifischer Hook `useEventsForHeroMode()` mit placeholderData | Isoliert. Aber: `useEvents()` und `useEventsForHeroMode()` haben dann 2 Caches → Drift-Risk | S |
| (c) Akzeptieren: Cold-Start `heroMode='scout'`-Default für ~50ms bis events-Cache hit, kein placeholderData | Persist-Cache reicht ohnehin (events landen direkt nach Re-Mount aus localStorage). Flicker-Risk niedriger als gedacht. | XS |

**Empfehlung Reviewer:** **(c)** — Persist-Cache (Slice 261 Aktiv) füllt useEvents bei Cold-Start aus localStorage in <50ms. Echtes Flicker-Risk ist klein. (a) wäre Cross-Cutting-Refactor außerhalb Slice-262-Scope, (b) baut Drift. Decision D=c bleibt richtig in der Wirkung („nutze persist-cache"), aber Wiring-Annahme „placeholderData explicit" ist falsch — Wiring ist „nichts tun, persist-cache reicht".

**Fix:** Spec §9 Decision D umformuliert: „(a) Akzeptieren persist-cache-Cold-Start (~<50ms) — (b) explizit `placeholderData` auf useEvents — (c) lokaler Wrapper-Hook." CTO-Empfehlung **a** (war c, falsche Annahme korrigiert).

---

### F-03 · Spec §3 + §6 AC-05 — HomeStoryHeader Wrapper-vs-Body-Trennung unklar

**Issue:** Spec sagt „HomeStoryHeader wird Dispatcher (intern early-return Manager)". HomeStoryHeader-Outer ist aber:
```tsx
<div className="relative -mx-4 -mt-4 lg:-mx-6 lg:-mt-6 px-4 pt-6 pb-6 lg:px-6 lg:pt-8 lg:pb-8 bg-hero-stadium overflow-hidden">
  <div className="absolute inset-0 bg-hero-vignette pointer-events-none" aria-hidden="true" />
  <div className="relative z-10">
    <GameweekStatusBar />  // <-- bleibt sichtbar im Manager-Mode? JA wenn drinnen
    /* Greeting + Hero Number + Pills + 0-Holdings-CTA */
  </div>
</div>
```

Wenn Dispatcher early-return rendert ManagerBlock, dann muss klar sein: rendert ManagerBlock auch GW-Bar? Oder rendert HomeStoryHeader weiterhin GW-Bar oben + ManagerBlock darunter?

**Fix:** Spec §2 + §6 AC-05 explizit klären:

```
HomeStoryHeader-Render-Tree (Manager-Mode):
  <div Wrapper>           ← bleibt gleich
    <Vignette />          ← bleibt gleich
    <div className="relative z-10">
      <GameweekStatusBar />  ← bleibt gleich (oberhalb ManagerBlock)
      <ManagerBlock {...props} />  ← ersetzt Greeting + Hero-Number + Pills + 0-CTA
    </div>
  </div>

HomeStoryHeader-Render-Tree (Scout-Mode = status quo):
  <div Wrapper>
    ...
    <GameweekStatusBar />
    /* Greeting + Hero Number + Pills + Story + 0-Holdings-CTA */  ← unverändert
  </div>
```

Damit ist klar: Wrapper + Vignette + GW-Bar IMMER persistent. ManagerBlock ist NUR der Greeting-bis-CTA-Inhalt-Replacement. AC-05 ergänzt: „GameweekStatusBar bleibt im Manager-Mode sichtbar (gleiche Position wie Scout-Mode)".

---

## P1 — should fix

### F-04 · Spec §6 AC-03 + §7 EC-04 + D63 Konsistenz — 0-Holdings + aktive GW

**Issue:** Spec heroMode-Logic: `hasActiveGwInLeague ? 'manager' : holdings.length > 0 ? 'scout' : 'cta-new'`. Konsequenz: 0-Holdings + aktive GW = Manager-Mode. **D63-Tabelle Zeile 4 sagt aber:** „0-Holdings + Aktive GW → Manager-CTA primär, Scout-CTA klein."

Frage: Ist „Manager-CTA" einfach der ManagerBlock mit Lineup-CTA-prominent (wie Spec EC-05 schon andeutet), ODER ein separater Mode `'manager-cta-new'`?

**Reviewer-Empfehlung:** Erstes — ManagerBlock zeigt sich bei 0-Holdings adaptiv (Lineup-CTA stark, Captain hidden bis Lineup gesetzt). Kein neuer Mode. Aber Spec dokumentiert das nicht klar.

**Fix:** Spec §2 ergänzt nach heroMode-Logik:
> Hinweis: heroMode='manager' covered auch 0-Holdings+aktiveGW (D63-Konsistenz). ManagerBlock adaptiert intern: bei `holdings.length === 0` zeigt es Lineup-CTA prominent + Mystery-Box-Hint statt Hero-Number-Region. Slice 262 Out-of-scope: kombinierter Manager+Scout-CTA-Layout (Slice 263).

§7 EC-05 schärfen: „Aktive GW + 0 Lineup gesetzt + 0 Holdings: ManagerBlock zeigt nur Lineup-CTA + GW-Number, keine Captain-Region (= cascading)."

---

### F-05 · Spec §9 Decision E TR-Wording — „Selam" inkonsistent zu existing Codebase

**Issue:** Vorschlag „Selam {firstName}" — `messages/tr.json` Zeile 299: existing pattern ist `"greeting": "Tekrar hoş geldin"` und `"welcomeGreeting": "Hoş geldin, {name}!"`. „Selam" wäre ein neues 4. Greeting-Pattern → Sprach-Drift.

**Fix:** ManagerBlock nutzt existing `t('home.greeting')` als Prefix-Text, kein neuer Key. ODER neuer Manager-spezifischer Greeting-Key: 

| Key | DE | TR |
|-----|-----|-----|
| `home.manager.greetingPrefix` | „Spieltag {n}" | „Hafta {n}" |

Greeting-Prefix-Begriff komplett weg — der GW-Number-Headline ist der primäre Identifier im Manager-Mode. Reduziert i18n-Surface.

**Spec §9 Decision E** ergänzt: TR-Wording-Tabelle entfernt `home.manager.greetingPrefix` Zeile, ManagerBlock zeigt nur firstName als Sub-Header (wie Scout-Mode), GW-Number-Headline ist primär.

---

### F-06 · Spec §3 — fehlende Service-Lücke `getLineup` braucht eventId

**Issue:** Spec sagt useHomeData bekommt „1 neuen Service-Call: `getLineup(eventId, userId)`". Aber `eventId` kommt woher? Aus `nextEvent` (existing memo in useHomeData), aber dieser nimmt das **erste** active event über alle Ligas — nicht das scoped-league-Event. Im Multi-Liga-Setup könnte `nextEvent` aus Liga A kommen, scoped-Liga ist B → Lineup-Query liest falsches Event.

**Fix:** Spec §2 ergänzt: derive `barEvent` analog zu `GameweekStatusBar.pickBarEvent()` — gleiches Filter-Pattern (`league_id === scopedLeagueId` ODER `getClub(club_id)?.league_id === scopedLeagueId`). `nextEvent` (existing) bleibt für Spotlight-Logic, aber NEU `scopedActiveEvent` für ManagerBlock + heroMode.

```ts
// in useHomeData
const scopedActiveEvent = useMemo(() => {
  if (!scopedLeagueId) return null;
  return pickBarEvent(events, scopedLeagueId);  // shared-helper auslagern aus GameweekStatusBar
}, [events, scopedLeagueId]);
```

§3 ergänzt: helper `pickBarEvent` MUSS aus `GameweekStatusBar.tsx` in `helpers.tsx` extrahiert werden (Single-Source statt Duplicate).

---

### F-07 · Spec §6 AC-08 — `captain_slot` ist Slot-Token, nicht Player-Name

**Issue:** AC-08 sagt „Captain-OK-Pill mit `captainName`". Aber `captain_slot` in DB ist `'gk'`/`'def1'`/etc. — nicht direkt der Player-Name. Um Name anzuzeigen muss Service:
1. `getLineup(eventId, userId).captain_slot` → z.B. `'def1'`
2. Slot-Lookup auf Player-ID via `lineups.player_def1` (oder ALL_SLOT_KEYS-Pattern)
3. Player-Lookup für Name

ODER `getLineupWithPlayers()` nutzen (existing), das resolved automatisch alle Slots zu Players.

**Fix:** Spec §2 + §6 AC-08 klären: ManagerBlock nutzt `getLineupWithPlayers()` (nicht raw `getLineup`), das returnt enriched Player-Data inkl. captain. Service-Call in useHomeData: `useLineupWithPlayers(scopedActiveEvent?.id, uid)` als neuer optional Hook (skipped wenn `!scopedActiveEvent`).

**Bonus-Risk:** `getLineupWithPlayers` returnt **Map oder Array?** errors-frontend.md „Map/Set-typed React-Query-Data + Persist/SSR = stille Korruption" (Slice 267). Wenn Map → Defense-in-Depth-Pattern aus Slice 267 anwenden ODER Array verwenden. Spec MUSS das verifizieren.

---

## P2 — nice-to-have

### F-08 · Spec §6 AC-12 nicht executable

**Issue:** „Mode-Switch ohne Flicker" ist subjektiv. Wie misst der Tester?

**Fix:** AC-12 umformulieren: „Liga-Switch (A=aktive GW → B=keine GW) zeigt zwischen Frame N und N+1 NICHT 'cta-new'-Default mit weißem Block. Test: Anil Mobile-PROVE — Liga-Switch-Tap, Slow-Motion-Recording 60fps, Frame-für-Frame-Check." Nicht in Vitest, nur Anil-PROVE.

---

### F-09 · Spec §10 Proof-Plan — fehlt Scout-Mode-Regression-Proof

**Issue:** Spec listet Manager-393 + Liga-Switch als Proofs. Aber HomeStoryHeader-Refactor RISKIERT Scout-Mode-Regression (F-03 Wrapper-Trennung). Spec proof-plan deckt das nicht.

**Fix:** §10 ergänzt: „Scout-Mode-Regression-Screenshot: Mobile-393 in Liga ohne aktive GW, Greeting + Hero-Number + Pills + Story unverändert vs Slice-261-pre-Diff." Anil-PROVE 2 Modi: Manager + Scout in 2 Test-Accounts oder Liga-Switch.

---

## Was gut war

- **Pattern-References** sind echt relevant (D62/D63/D64 + Slice 254 Stateless + errors-frontend Cache-Invalidation), nicht copy-paste-aller-38.
- **Pre-Mortem** mit 5 Szenarien Pflicht für M-Slice erfüllt, PM-3 zeigt explizit das `pickBarEvent`-Pattern als shared-Risk-Source.
- **Multi-Choice-Format (D64)** sauber strukturiert, CTO-Empfehlungen begründet.
- **Slice-Type Header** + Größe-Klassifikation vorhanden (Hook ship-spec-quality-gate.sh-konform).
- **Scope-Out-Sektion §11** explizit was NICHT drin ist — verhindert Scope-Creep.

---

## Anil-Decision-Hinweise (Bias-Check der CTO-Empfehlungen)

| # | Reviewer-Note |
|---|---------------|
| A | Empfehlung **b** korrekt — Wrapper-Continuity ist starkes Argument. ABER F-03 muss in Spec geklärt werden (GW-Bar-Position). |
| B | Empfehlung **a** korrekt — useHomeData hat schon alle Inputs (nach F-01-Fix). |
| C | Empfehlung **a** korrekt — Slice-265-266-Lehre. F-04 + F-07 müssen Spec-internal trotzdem klären. |
| D | Empfehlung **c→a** umstellen (siehe F-02). Persist-Cache reicht, kein placeholderData-Wiring nötig. |
| E | Empfehlung **a** akzeptiert MIT F-05-Fix (Selam→Hoş geldin oder gar kein neuer Greeting-Key). |

---

## Nächster Schritt

1. CTO arbeitet F-01 bis F-07 in Spec v2 ein (P0 + P1 = 7 Findings).
2. F-08 + F-09 in Spec v2 als Inline-Note.
3. Spec v2 wird Anil als kompakte Multi-Choice-Tabelle gezeigt (D64 Format) — KEIN kompletter Re-Read der Spec, nur die 5 Decisions A-E + die 7 Findings als „Reviewer fand X, ich habe Y eingebaut, OK?".
4. Anil's Multi-Choice-Antworten + ggf. Override → Spec v3 final.
5. BUILD startet erst nach Spec v3.

**Empfohlene Effort:** ~30 min Spec v2 + 5 min Anil-Decision-Round-Trip + 2-3h BUILD + 20 min Reviewer post-BUILD + Anil PROVE.
