# Slice 344 — E1.1: Fan-Rang-Leiter sichtbar + Perk-Katalog (Plattform-Default)

**Status:** SPEC · **Größe:** M · **Slice-Type:** UI · **Scope:** CTO (Display-only, keine Geld-Formel) · **Datum:** 2026-06-18

> Erster Slice der **Fan-Reward-Engine (E1)**. Design-Alignment mit Anil (2026-06-18): Perks/Gating zuerst, Airdrop später. Dieser Slice macht den Fan-Rang **sichtbar + verständlich** (Leiter + was jede Stufe freischaltet), ohne die Geld-Formel anzufassen. Kontext: `docs/knowledge/domain/treasury.md` §8, `reward-ranking.md` §2 (W2-A/B/D).

---

## 1. Problem Statement

Der Fan-Rang existiert technisch (`fan_rankings`, 6 Tiers Zuschauer→Vereinsikone, `FanRankBadge`, `FanRankOverview` auf der Club-Page), aber dem User ist **unklar, was er davon hat**:
- **Keine Leiter:** `FanRankOverview` zeigt nur das *aktuelle* Tier-Badge + 5 Dimensions-Bars + Score. Die **6-Stufen-Leiter** (wohin kann ich aufsteigen?) ist nirgends sichtbar.
- **Kein Perk-Bezug:** Nirgends steht, **was eine Stufe freischaltet**. Der einzige reale Perk — Poll-Stimmgewicht (Slice 343: Ultra/Legende 2×, Ehren/Ikone 3×) — ist „still" (Handoff 343: „UI-Surfacing des eigenen Gewichts (Backlog)").

**Evidence:** `reward-ranking.md` §2 W2-A („Fan-Rang hat seit 343 einen realen Hebel, aber unsichtbar") + W2-B/W2-D („Treue weder sichtbar noch greifbar"). Anil-Design-Alignment 2026-06-18: „Perks/Gating zuerst … macht Follow/Fan-Rang endlich wirksam."

**Wer/wie oft:** Jeder eingeloggte User auf jeder Club-Detail-Page (`/club/[slug]`), DE+TR, Mobile-primär. Conversion-Hebel: die Leiter ist der erste sichtbare Anreiz, aktiver zu werden.

## 2. Lösungs-Design (Architektur)

**Was ändert sich:** Eine **Perk-Katalog-Konstante** (SSOT, Plattform-Default) bildet pro Fan-Rang-Tier ab, was es freischaltet — heute ehrlich nur: **Poll-Stimmgewicht** (1×/2×/3×) + **Status-Badge/Identität**. Eine neue **`FanRankLadder`-Component** rendert die 6-Stufen-Leiter mit aktueller Stufe markiert, Fortschritt zur nächsten (Score X / nächste Schwelle) und den Perks pro Stufe. Eingebaut in `FanRankOverview` (ein Mount-Punkt, eine Datenquelle `ranking`), sichtbar **auch im Empty-State** (kein Rang → Leiter zeigt „was du erreichen kannst" = Conversion-Anreiz).

**Datenfluss:** unverändert. `FanRankOverview` bekommt `ranking: DbFanRanking | null` (bereits via `useClubData`). `FanRankLadder` liest `ranking.total_score` + `ranking.rank_tier` (oder `zuschauer`/score 0 im Empty-State) und kombiniert mit `FAN_RANK_TIERS` (Schwellen) + dem neuen Perk-Katalog. **Keine** neue Query, **kein** RPC, **keine** Migration.

**Perk-Katalog (neue SSOT) — exakte Shape:**
```ts
// src/lib/fanRankPerks.ts
export interface FanRankPerks {
  /** Poll vote weight — MIRROR von cast_community_poll_vote (Slice 343). Muss in Sync bleiben. */
  pollWeight: 1 | 2 | 3;
}
export const FAN_RANK_PERKS: Record<FanRankTier, FanRankPerks> = {
  zuschauer:     { pollWeight: 1 },
  stammgast:     { pollWeight: 1 },
  ultra:         { pollWeight: 2 },
  legende:       { pollWeight: 2 },
  ehrenmitglied: { pollWeight: 3 },
  vereinsikone:  { pollWeight: 3 },
};
```

**Drift-Schutz:** Die `pollWeight`-Werte spiegeln den RPC `cast_community_poll_vote` (343). Das ist die „Money-RPC-Pricing-Formel-Drift"-Klasse (`errors-db.md`). Mitigation: (a) expliziter `MIRROR`-Kommentar mit Slice-Ref, (b) Unit-Test der die Tabelle gegen die in 343 dokumentierten Werte asserted (Regression-Guard gegen versehentliche Änderung). Der RPC bleibt die Wahrheit; der Katalog ist Display-Spiegel.

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `src/lib/fanRankPerks.ts` | NEU | Perk-Katalog SSOT (Plattform-Default), Mirror 343 |
| `src/components/gamification/FanRankLadder.tsx` | NEU | 6-Stufen-Leiter + aktuelle Stufe + Fortschritt + Perks |
| `src/components/gamification/FanRankOverview.tsx` | EDIT | `FanRankLadder` einbinden; Empty-State zeigt Leiter statt nur CTA |
| `messages/de.json` | EDIT | neue `gamification`-Keys (Perk-Labels, Leiter-Texte) |
| `messages/tr.json` | EDIT | TR-Pendants (Anil-Review markiert) |
| `src/components/gamification/__tests__/FanRankLadder.test.tsx` | NEU | Render + Perk-Mirror-Regression + Empty-State + i18n-Key-Presence |

**Vor diesem Slice greppt man:** `grep -rn "FanRankOverview" src/` (1 Consumer: ClubContent) · `grep -rn "FAN_RANK_TIERS\|getFanRankByScore" src/` (Schwellen-Consumer) · `grep -rn "cast_community_poll_vote" supabase/migrations/` (Poll-Weight-Wahrheit, Slice 343).

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `src/lib/fanRanking.ts` | Schwellen-SSOT | `FAN_RANK_TIERS` (minScore/maxScore je Tier), `getFanRankByScore`, `getFanRankDef` — wiederverwenden, NICHT duplizieren |
| `src/components/gamification/FanRankOverview.tsx` | Einbau-Stelle + Style-Vorbild | Card-Layout, Loading/Empty-Branch, `DIMENSIONS`-Pattern, `t('gamification.*')`-Nutzung |
| `src/components/ui/FanRankBadge.tsx` | Badge + Tier-Config | `FAN_RANK_TIER_CONFIG` (Icon/Farben je Tier) — für Leiter-Icons wiederverwenden, `size`-Prop |
| `supabase/migrations/*slice_343*` (oder live `pg_get_functiondef('cast_community_poll_vote')`) | Poll-Weight-Wahrheit | Exakte Tier→Gewicht-Mapping (Ultra/Legende 2×, Ehren/Ikone 3×, sonst 1×) — Katalog MUSS exakt spiegeln |
| `src/app/(app)/club/[slug]/ClubContent.tsx` | Mount-Kontext | Zeile 535-544: `FanRankOverview` ist `userId`-gated; props `ranking`/`clubName`/`isLoading` |
| `messages/de.json` (Zeile ~3219-3284) | i18n-Namespace | `gamification`-Block: existierende `fanRank*`-Keys, wo neue Keys einfügen (kein Duplikat-Key-Drift, errors-frontend.md) |
| `.claude/rules/errors-frontend.md` "Missing i18n-Key" + "JSON Object/String-Duplicate-Key-Drift" | Bekannte Fallen | Beide Locales bedienen; namespace-aware Key-Check |
| `.claude/rules/business.md` "Gluecksspiel-Vokabel" + "Securities" | Compliance | Perk-Wording: kein gewinn*/kazan*/Rendite; „Stimmgewicht"/„Belohnung" neutral |

## 5. Pattern-References

- `errors-db.md` „Money-RPC Pricing-Formel Drift (Slice 108)" — Katalog spiegelt RPC, Drift-Guard via Test/Kommentar pflicht.
- `errors-frontend.md` „Missing i18n-Key bei neuer CTA-Component (Slice 198)" + „JSON Object/String-Duplicate-Key-Drift (263)" — neue Keys in DE+TR, namespace-aware prüfen.
- `ui-components.md` „States" + „Mobile-First" — Empty/Loading-States, 44px Touch, kein Overflow, `tabular-nums` auf Score.
- `reward-ranking.md` §2 (W2-A/B/D) — Begründung warum Fan-Rang-Sichtbarkeit der erste E1-Schritt ist.
- `treasury.md` §8 — Engine-Frame (Perks primär), `csf_multiplier` raus → NICHT als Perk surfacen.

## 6. Acceptance Criteria

```
AC-01: [HAPPY] Eingeloggter User mit Fan-Rang sieht auf /club/[slug] die 6-Stufen-Leiter mit seiner aktuellen Stufe markiert.
  VERIFY: Playwright gegen bescout.net, /club/<slug> mit fan_ranking-Row; FanRankLadder rendert 6 Tier-Zeilen, aktuelle hervorgehoben.
  EXPECTED: 6 Stufen Zuschauer→Vereinsikone, aktuelle mit Marker/Highlight, Perk (Poll-Gewicht) je Stufe sichtbar.
  FAIL IF: Leiter fehlt, < 6 Stufen, oder aktuelle Stufe nicht markiert.

AC-02: [EMPTY] User ohne Fan-Rang (ranking=null) sieht trotzdem die Leiter ("was du erreichen kannst") + bestehende CTA.
  VERIFY: FanRankLadder mit ranking=null → rendert Leiter, current = zuschauer/score 0, CTA bleibt.
  EXPECTED: Leiter sichtbar, keine Crash, CTA "Jetzt ein Fantasy Event spielen" bleibt.
  FAIL IF: Empty-State zeigt nur CTA ohne Leiter, oder wirft.

AC-03: [REGRESSION-MIRROR] Perk-Katalog spiegelt cast_community_poll_vote (343) exakt.
  VERIFY: vitest FanRankLadder.test — assert FAN_RANK_PERKS[tier].pollWeight === {zuschauer:1,stammgast:1,ultra:2,legende:2,ehrenmitglied:3,vereinsikone:3}[tier].
  EXPECTED: Test grün; bei Wert-Änderung ohne RPC-Sync → Test rot.
  FAIL IF: Werte weichen vom 343-RPC ab.

AC-04: [I18N-DE+TR] Alle neuen Labels in beiden Locales, keine MISSING_MESSAGE.
  VERIFY: node -e "m=require('./messages/de.json').gamification; [<keys>].forEach(k=>console.log(k, m[k]??'MISSING'))" (+ tr.json); Live-Render Console ohne MISSING_MESSAGE.
  EXPECTED: kein 'MISSING', kein roher Key im DOM.
  FAIL IF: ein Key fehlt in einer Locale oder im falschen Namespace.

AC-05: [MOBILE] Leiter rendert sauber auf 393px ohne Horizontal-Overflow, Touch-Targets ≥ 44px wo interaktiv.
  VERIFY: Playwright viewport 393px, /club/<slug>; kein overflow-x, Score/Perk lesbar (white/50+).
  EXPECTED: vertikale Leiter, kein Clipping, tabular-nums auf Score.
  FAIL IF: Overflow, abgeschnittene Labels, Kontrast < AA.

AC-06: [PROGRESS] Fortschritt zur nächsten Stufe korrekt (Score vs. nächste minScore).
  VERIFY: User mit total_score=30 (ultra, 25-39) → zeigt "noch 10 bis Legende" (40) oder Balken 30→40.
  EXPECTED: korrekte nächste Schwelle aus FAN_RANK_TIERS; Vereinsikone (top) zeigt "Höchste Stufe".
  FAIL IF: falsche Schwelle, Off-by-one, oder Crash bei Top-Tier (maxScore=null).

AC-07: [COMPLIANCE] Perk-Wording neutral (kein gewinn*/kazan*/Rendite/Investment).
  VERIFY: grep neue Keys gegen business.md-Verbotsliste.
  EXPECTED: "Stimmgewicht"/"Belohnung"/"Perk" neutral; keine Glücksspiel-/Securities-Vokabel.
  FAIL IF: ein verbotener Begriff user-facing.
```

## 7. Edge Cases Table

| # | Flow | Case | Input/State | Expected | Mitigation |
|---|------|------|-------------|----------|------------|
| 1 | Ladder | ranking=null | kein Fan-Rang | Leiter zeigt alle Stufen, current=zuschauer, keine Score-Zahl-Lüge | Empty-Branch in FanRankLadder, score ?? 0 |
| 2 | Progress | Top-Tier | tier=vereinsikone, maxScore=null | „Höchste Stufe erreicht", kein „noch X bis null" | Guard maxScore===null |
| 3 | Progress | Score exakt auf Schwelle | total_score=40 | tier=legende, Fortschritt zu ehrenmitglied | `>=` in getFanRankByScore (vorhanden) |
| 4 | Mirror | RPC-Wert driftet | pollWeight im Katalog ≠ 343 | Unit-Test rot | AC-03 Regression-Test |
| 5 | i18n | neuer Key nur in DE | tr.json vergessen | MISSING im TR-Render | AC-04 namespace-aware Check beide Locales |
| 6 | Loading | isLoading=true | fanRankingLoading | Skeleton (bestehend), keine Leiter-Flash | bestehender Loading-Branch beibehalten |
| 7 | Score > alle | total_score=200 | über vereinsikone-min | clamp auf Top-Tier, Progress=„höchste" | getFanRankByScore deckt ab |
| 8 | Tier-Wert unbekannt | rank_tier nicht in Config | (DB-Drift) | Fallback zuschauer, kein Crash | getFanRankDef-Fallback (vorhanden) |

## 8. Self-Verification Commands

```bash
# Pflicht
npx tsc --noEmit
CI=true npx vitest run src/components/gamification/__tests__/FanRankLadder.test.tsx

# Slice-spezifisch
grep -rn "FanRankLadder" src/                      # Consumer verifizieren (FanRankOverview)
grep -rn "FAN_RANK_PERKS" src/                      # Katalog-Nutzer
# i18n namespace-aware (beide Locales), pro neuem Key:
node -e "const m=require('./messages/de.json').gamification; ['fanRankLadderTitle','fanRankPollWeight','fanRankNextTier','fanRankTopTier','fanRankPerkLabel'].forEach(k=>console.log('de',k,m[k]??'MISSING'))"
node -e "const m=require('./messages/tr.json').gamification; ['fanRankLadderTitle','fanRankPollWeight','fanRankNextTier','fanRankTopTier','fanRankPerkLabel'].forEach(k=>console.log('tr',k,m[k]??'MISSING'))"
# Compliance
grep -iE "gewinn|kazan|rendite|invest|profit" messages/de.json messages/tr.json | grep -i "fanRank"
```

## 9. Open-Questions

**Pflicht-Klärung:** keine offen — Design-Alignment (Anil 2026-06-18) hat Reihenfolge + Scope geklärt. csf_multiplier wird NICHT gesurfaced (D83 raus).

**Autonom-Zone (ich entscheide):**
- Visuelles Leiter-Layout (vertikale Liste vs. kompakte Stufen-Reihe), Highlight-Stil der aktuellen Stufe.
- Ob `FanRankLadder` collapsible ist oder immer offen.
- Genaue Progress-Darstellung (Balken vs. „noch X Punkte"-Text).
- Komponenten-Aufteilung (Sub-Helper innerhalb FanRankLadder).
- Test-Tiefe je Edge-Case.

**Nicht-Autonom (Anil):**
- TR-Wording der neuen Keys → vor Commit zeigen (feedback_tr_i18n_validation; kein Blocker, nur Review).
- Falls später echte neue Perks dazukommen (E1.3) → eigener Slice.

## 10. Proof-Plan

| Change-Typ | Proof |
|------------|-------|
| UI-Change | Playwright-Screenshot gegen bescout.net (`/club/<slug>`, eingeloggt jarvis-qa) Desktop + 393px → `worklog/proofs/344-ladder.png` |
| Mirror-Test | `vitest run FanRankLadder.test` Output → `worklog/proofs/344-vitest.txt` |
| i18n | Console-Check (kein MISSING_MESSAGE) im Live-Render-Screenshot |

## 11. Scope-Out

- **Follow als fan_rank-Signal** → Slice E1.2 (Migration `calculate_fan_rank`, /impact, Money-nah).
- **Neue echte Perks** (exklusiver Community-Zugang etc.) → E1.3.
- **Airdrop** (Treasury-RAUS) → E1.4.
- **Club-Konfigurierbarkeit** der Perks → E1.5.
- **Eigenes Poll-Stimmgewicht im Poll-UI surfacen** (Polls-Backlog, 343) → bleibt im Polls-Track; hier nur Katalog-Ansicht auf Club-Page.
- **csf_multiplier-Entfernung** (DB) → eigener Aufräum-Slice (D83), hier nur „nicht anzeigen".
- **Recalc-Latenz des Fan-Rangs** (nur nach Event-Scoring) → unverändert; E1.2-Thema.

## 12. Stage-Chain (geplant)

```
SPEC → IMPACT (skipped: reine UI, kein RPC/Schema/Query-Key-Change, 1 Consumer) → BUILD → REVIEW (reviewer-Agent, UI+i18n+Mirror) → PROVE (Playwright + vitest) → LOG
```

## 13. Pre-Mortem (optional bei M — 4 Szenarien)

| # | Failure | Prob | Impact | Mitigation | Detection |
|---|---------|------|--------|------------|-----------|
| 1 | Perk-Katalog driftet von 343-RPC (jemand ändert Werte) | MED | mittel (falsches Perk-Versprechen, Money-nah) | MIRROR-Kommentar + AC-03 Regression-Test | vitest rot |
| 2 | Neuer i18n-Key fehlt in TR / falscher Namespace | MED | mittel (TR sieht rohen Key) | AC-04 namespace-aware Check beide Locales + Live-Console-Scan | MISSING_MESSAGE im Render |
| 3 | Empty-State crasht (null-ranking → score-Zugriff) | LOW | hoch (Club-Page bricht für neue User) | Edge #1 null-Guard + Test | vitest Empty-State + Live |
| 4 | Mobile-Overflow durch Leiter-Breite | LOW | mittel (393px Clipping) | Mobile-First Layout, AC-05 393px-Verify | Playwright 393px |

---

## Compliance-Check

- $SCOUT-Wording: Perk-Labels neutral („Stimmgewicht", „Belohnung", „Perk"). Kein Investment/ROI/Profit.
- IPO-Begriff: nicht berührt.
- Glücksspiel-Vokabel: kein gewinn*/kazan* — Poll-Gewicht ist neutral; „Stufe erreichen" statt „gewinnen".
- Asset-Klasse-Framing: nicht berührt.
- Disclaimer: keine $SCOUT/DPC-Trading-Fläche → kein TradingDisclaimer nötig.

## TR-Wording-Vorab (bei i18n — Anil-Review vor Commit)

| Key | DE | TR (Vorschlag) | business.md-Konformität |
|-----|----|----|-------------------------|
| `gamification.fanRankLadderTitle` | „Fan-Rang-Stufen" | „Fan Rütbe Seviyeleri" | ✓ neutral |
| `gamification.fanRankPollWeight` | „{n}× Stimmgewicht in Umfragen" | „Anketlerde {n}× oy ağırlığı" | ✓ kein kazan*/yatırım |
| `gamification.fanRankNextTier` | „Noch {n} bis {tier}" | „{tier} için {n} puan kaldı" | ✓ neutral |
| `gamification.fanRankTopTier` | „Höchste Stufe erreicht" | „En üst seviyeye ulaşıldı" | ✓ neutral |
| `gamification.fanRankPerkLabel` | „Schaltet frei" | „Açılır" / „Kazanımlar" → **„Avantajlar"** | ✓ „Avantajlar" neutral, kein kazan-Wurzel-Risiko |

(Finale TR-Strings im BUILD; Anil zeigt sich vor Commit.)

## Open Risiko

Hauptrisiko ist Perk-Katalog-Drift vom Live-RPC (Money-nah) — durch MIRROR-Kommentar + Regression-Test abgedeckt. Zweitrisiko: i18n-Lücke TR → namespace-aware Check + Live-Console-Scan. Beides bekannte, getestete Fallen. Kein Geld-Flow, keine Migration → niedriges Gesamtrisiko.
