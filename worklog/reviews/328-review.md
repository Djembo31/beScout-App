# Slice 328 Review — IPO-Erstellung MV-Anker + Vorschlagspreis

**Reviewer:** Cold-Context-Agent (read-only) · **Verdict: PASS**

## Spec-Coverage (alle AC ✓)
- AC1 `selectIpoPlayer` setzt `ipoPrice = round(MV/1000)` als anpassbaren Default (`useAdminPlayersState.ts`)
- AC2 MV + Vorschlag angezeigt (`AdminPlayersTab.tsx`)
- AC3 EUR-Orientierung „≈ X €/Card"
- AC4 Preis frei überschreibbar (`setIpoPrice` direkt verdrahtet)
- AC5 MV=0/null → kein Vorschlag, Input leer, kein Crash
- AC6 DE + TR Keys vorhanden

## Money-Formel-Verifikation
| Prüfung | Ergebnis |
|---------|----------|
| Vorschlag `round(MV/1000)` $SCOUT | ✓ |
| `Player.marketValue` = EUR | ✓ |
| `fmtScout` erwartet $SCOUT (kein doppelter centsToBsd) | ✓ |
| EUR-Orientierung `ipoPrice × 0,01 €` | ✓ |
| Create-Path `bsdToCents(ipoPrice)` → create_ipo | ✓ einheiten-konsistent |
| Osimhen-Probe MV 75M → 75.000 $SCOUT / 750 € | ✓ deckt sich mit Concept §3.4 |
| Faktor-100-Falle | keine |

## Edge-Cases (§7) — alle ✓
MV=0/null, Vorschlag<10 (server-Guard), Spieler-Abwahl, ipoPrice leer (kein NaN), Spieler-Wechsel-Override.

## Findings
| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| 1 | NIT | MV-Anzeige `(MV/1e6).toFixed(1)` zeigt bei MV<1M „0.0M €" | Optional post-Beta: bei MV<1M „X.000 €". Nicht blockierend. |

## Konsistenz / Patterns
selectIpoPlayer statt setIpoPlayerId im Select ✓ · defensive null (Slice-265-Pattern) ✓ · kein Dynamic-Tailwind ✓ · kein Hardcode-DE-Leak ✓ · i18n-Platzhalter DE+TR identisch, TR-Wording korrekt ✓ · Scope-Out eingehalten (keine RPC/Formel-Änderung, Create-Player unberührt) ✓

**time-spent:** ~9 Min.
