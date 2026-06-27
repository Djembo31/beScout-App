# Review — Slice 424 (Synergie-Vorschau == Server)

**Reviewer:** Cold-Context reviewer-Agent · **Datum:** 2026-06-27 · **time-spent:** ~14 min

## Verdict: CONCERNS → adressiert (Doku-Korrektur, kein Code-Fix nötig)

## Findings

| # | Severity | Location | Issue | Status |
|---|----------|----------|-------|--------|
| 1 | MEDIUM (Doku, kein Code) | Spec §4#5/§6 AC-7/§13; LineupPanel:762, ScoreBreakdown:184 | **Spec-Prämisse falsch.** Ich behauptete, die Scored-Banner lesen Server-`synergy_details.bonus_pct` und seien „unberührt". **Selbst verifiziert (LineupPanel:762 + grep):** beide Scored-Banner nutzen `synergyPreview.totalPct` = den Client-`calculateSynergyPreview`; **0 Render konsumieren** das Server-`synergy_bonus_pct`/`synergy_details` (nur DB-Row-Type + Test-Fixtures). → Mein Fix ändert den Scored-Banner mit (macht ihn **korrekter**, nicht falsch). AC-7 war auf falscher Annahme. | ✅ **Doku korrigiert** (active.md/Proof/Log: Scored-Banner nutzt Client-Preview, Fix macht ALLE Synergie-Anzeigen server-formel-treu). Kein Code-Change (Verhalten wird korrekter). Folge-Slice notiert. |
| 2 | LOW | useLineupBuilder:226 (clubId null → Freitext-Fallback) | Zwei null-clubId-Spieler mit divergierendem Freitext desselben echten Vereins würden gesplittet (Preview < Server). Durch Slice 422 clubId-Resolution selten; ehrlichste Näherung ohne Server-Roundtrip. | Akzeptiert (Edge §7 dokumentiert). |
| 3 | LOW (Fehlalarm) | Kommentar-Zeilen | Grep zeigte `\` statt `//` — Datei-Read bestätigt korrekte `//` (ripgrep-Non-ASCII-Artefakt). | Kein Issue. |

## One-Line
Display-only Angleichung der Client-Synergie an `score_event` ist formel-korrekt, sauber getestet (6 Unit-ACs) und money-neutral — mergebar nach Richtigstellung der (benignen) Spec-Aussage über die Scored-Banner.

## Belege (Reviewer, verifiziert)
- **Formel spiegelt Server exakt:** group by club_id, count≥2 → bonus_pct 5 flat, `Math.min(15, +5)` inkrementell, alle Details gelistet. Cap >3 Vereine = 15 (mirror `LEAST(15)`). Tests AC-1(5%/×3) / AC-2(10%) / AC-3(Cap 15) / AC-4(club_id-Gruppierung trotz stale Namen, first-seen Name) grün.
- **×N an beiden Bau-Bannern** (SynergyPreview:169, LineupPanel:826) via `d.count`. Scored-Banner zeigt `(bonus_pct%)` — nutzt aber denselben Client-Preview (Finding #1).
- **Money unberührt:** Diff rein TS, kein Migration. `score_event` = Wahrheit, unverändert.
- **`count?` optional** → Server-JSONB-Cast (`synergy_details: SynergyDetail[] | null`) + alte Events bleiben kompatibel; Render-Fallback `?? Math.ceil(bonus_pct/5)+1`.
- **Pill 5 flat** konsistent über alle 3 Picker, clubId-keyed.

## Knowledge-Capture (Reviewer-Learning, übernommen)
- **Code-Reading-Disziplin:** „Surface X liest Server" gegen die echte **Prop-Verkabelung / `grep <wert>`-Render-Consumer** verifizieren, NICHT gegen die Existenz des DB-Row-Felds. Hier existiert `synergy_bonus_pct` als DB-Type, wird aber von **0 Render** konsumiert → alle Synergie-Banner (Bau + Scored) hängen am Client-Rechner. Klasse errors-frontend S414-416 (Surface-Verwechslung).

## Folge-Slice (notiert, money-neutral)
- **Scored-Fantasy-View an echten Server-Wert binden:** der gescorte Synergie-Banner zeigt eine Client-Approximation statt des tatsächlich gesettleten `synergy_bonus_pct` (das die Surge-×2 enthält). Display-Drift gegenüber dem echten Reward — eigener Slice.
