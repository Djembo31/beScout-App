# Preflight — Monthly Leaderboard e2e (nächste Session)

> **Anil (2026-06-23):** „weiter mit monthly leader board, das wurde wie vieles angefangen, aber nicht e2e verfolgt."
> Diese Notiz = Bestandsaufnahme (gescopt in Session 356), damit der nächste Slice nicht bei Null kartiert.
> S7-Tracker-Bezug: `worklog/s7-phase3-remaining.md` Block #2 (Leaderboard-Konsolidierung) — Monthly-Board = der noch offene Teil.

## Was LEBT (bereits verkabelt)

| Baustein | Datei | Stand |
|---|---|---|
| Sieger-Anzeige UI | `src/components/rankings/MonthlyWinners.tsx` → gerendert auf `/rankings` (`src/app/(app)/rankings/page.tsx:42`) | ✅ live, mit $SCOUT-Reward-Disclaimer (FIX-16) |
| Monats-Abschluss + Payout | RPC `close_monthly_liga(p_month)`, Admin-Trigger in `src/app/(app)/bescout-admin/AdminLigaTab.tsx:37` | ✅ verkabelt — **payoutfähig, aber KEIN Cron** (manueller Admin-Klick) |
| Sieger-Tabelle | `monthly_liga_winners` | ✅ existiert |

## Was TOT ist (Orphan ohne Konsument)

| Baustein | Datei | Problem |
|---|---|---|
| Live-Monats-Rangliste (Service) | `getMonthlyLeaderboard(month, dimension)` — `src/lib/services/scoutScores.ts:216` | ⚠️ `console.error`+`return` statt throw (Silent-Fail-Klasse, errors-db) — bei e2e-Verkabelung mitfixen |
| Live-Monats-Rangliste (Hook) | `useMonthlyLeaderboard(month, dimension)` — `src/lib/queries/gamification.ts:69` | **0 UI-Konsumenten** (grep bestätigt) → reiner Orphan-Chain |

→ D. h.: die **laufende** Monats-Rangliste (wer führt diesen Monat?) hat Service+Hook, aber **keine UI**. Nur die **abgeschlossenen Sieger** (MonthlyWinners) werden gezeigt.

## Die e2e-Lücke (der Kern dessen, was „nicht verfolgt" wurde)

Der Zyklus ist **nicht geschlossen**:
1. ❌ **Kein Cron** der `close_monthly_liga` automatisch am Monatsende feuert → Monate werden nur geschlossen, wenn ein Admin manuell klickt. Ohne das: nie Sieger, MonthlyWinners bleibt leer.
2. ❌ **Keine Live-Board-UI** → Fans sehen während des laufenden Monats NICHT, wo sie stehen (kein Anreiz mitzumachen). Service+Hook liegen ungenutzt bereit.
3. ❓ **Payout-Verifikation:** `close_monthly_liga` ist „payoutfähig" — VOR Aktivierung: Live-`pg_get_functiondef` lesen (D87), Geld-Pfad + Treasury/Wallet-Quelle prüfen, Idempotenz (doppelter Monatsabschluss?), Fee/Reward-Quelle gegen business.md. **Money-Path → selbst, nicht delegieren (§3).**

## Activate-vs-Delete-Entscheidung (D80) — für nächste Session

Anil-Intention laut Aussage = **e2e fertig verfolgen (activate)**, nicht löschen. Heißt der Slice baut den Kreis zu:
- **(A) Live-Board-UI** an die vorhandene `useMonthlyLeaderboard`-Infrastruktur (Tab/Section auf `/rankings` neben MonthlyWinners) + `getMonthlyLeaderboard` swallow→throw heilen.
- **(B) Cron/GHA** für `close_monthly_liga` (Monatsende) — ODER bewusst manuell lassen (Admin-Klick) wenn Auto-Payout zu früh ist (Beta).
- **(C) Money-Audit** von `close_monthly_liga` ZUERST (D87 Live-functiondef), bevor irgendwas Auto-getriggert wird.

**Offene Anil-Fragen vor BUILD:**
- Soll der Monatsabschluss **automatisch** (Cron) laufen oder **manuell** (Admin) bleiben? (Payout-Automatik = Geld-Risiko in Beta.)
- Welche **Dimension(en)** zeigt das Live-Board (overall / scout / fantasy)? `getMonthlyLeaderboard` nimmt `dimension`-Param.

## Reihenfolge-Vorschlag nächste Session
1. SPEC starten → ZUERST `close_monthly_liga` Live-functiondef lesen (Money, D87) + `getMonthlyLeaderboard`-Shape.
2. Anil: Cron-vs-manuell + Dimension klären (2 Fragen oben).
3. BUILD: Live-Board-UI + swallow→throw-Heal; Cron nur wenn (1)+(2) grünes Licht.
4. PROVE: Money-Smoke auf `close_monthly_liga` (BEGIN…ROLLBACK) wenn Payout berührt.

## Verwandte tote/halbe Features (S7 Dormant-Batch, NICHT dieser Slice)
`worklog/s7-phase3-remaining.md` #3: Research · 2 Voting-Systeme · Creator-Fund · Wildcard. Und der große geld-nahe Brocken `scout_scores`↔`user_stats`-Konsolidierung (#2) — separat, mit Anil-Freigabe.
