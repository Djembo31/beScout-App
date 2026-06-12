# Lighthouse-Baseline AUTHENTICATED — 2026-06-12 (Slice 282b)

> **Erste valide App-Messung.** Alle früheren Runs (Slice 279, 2026-05-06 ff.) maßen die
> /login-Redirect-Page (siehe `worklog/audits/2026-06-11/lighthouse-baseline.md`).
> Setup: lokaler `pnpm run lighthouse:local` — eingeloggt als jarvis-qa (puppeteerScript),
> mobile 393px, 4× CPU-Slowdown, 1.6 Mbps simuliert, 3 Runs/URL, disableStorageReset.
> Code-Stand: Slice 282 live (Home ohne 4,2-MB-/api/players), Market noch MIT.

## Alle 9 Runs (Median-of-3 = *)

| URL | Perf | FCP | LCP | TBT | SI | CLS |
|---|---|---|---|---|---|---|
| / | 62 | 817 | 3067 | 1553 | 2526 | 0.149 |
| / | 59 | 886 | 3216 | 1984 | 3053 | 0.143 |
| / * | 46 | 893 | 3029 | 1569 | 3192 | **0.551** |
| /market | 57 | 905 | 2574 | 1917 | 4257 | 0.210 |
| /market | 47 | 1088 | 3575 | **7701** | 5732 | 0.189 |
| /market * | 50 | 871 | 3335 | **5413** | 3617 | 0.209 |
| /community | 65 | 919 | 3205 | 2038 | 2679 | 0.039 |
| /community | 54 | 986 | 3400 | 3124 | 3468 | 0.162 |
| /community * | 57 | 862 | 3231 | 3168 | 3612 | 0.136 |

## Befunde (Hebel-Ranking für D70-Track)

1. **`/market` TBT 1,9–7,7s (Median 5,4s)** — mit Abstand schlechtester Wert. Das ist der
   4,2-MB-`/api/players`-Parse + Client-Enrichment auf 4×-throttled CPU (Market konsumiert
   weiterhin `usePlayers()` via `useEnrichedPlayers`). **Bestätigt: Market-Entkopplung
   (Server-Pagination, L-Slice) ist der nächste große Cold-Start-Hebel.**
2. **`/` CLS bis 0.551** — massiver Layout-Shift auf Home (Schwelle „good" = 0.1).
   Kandidat: nachladende Above-fold-Sections ohne reservierte Höhen (Spotlight/Hero-Swaps).
   Eigener Fix-Slice-Kandidat (CLS ist UX-spürbar: „Seite springt").
3. **LCP ~3,0–3,4s über alle Pages** — konsistent; FCP ~0,9s ist gut, die Lücke
   FCP→LCP ist Hydration + Daten-Fetch.
4. /community ist die gesündeste Page (CLS 0.04–0.16, TBT-Median 3,2s).

## Vergleich /login-Baseline (zur Einordnung, NICHT als Trend)

/login (2026-06-11): Perf ~61, LCP ~6,3s — aber andere Page, anderes Mess-Objekt.
Die scheinbar „besseren" LCP-Werte der App (~3,1s vs 6,3s) kommen u.a. durch
disableStorageReset-Warm-Cache-Effekte zwischen Runs — Werte sind über Zeit
vergleichbar (gleiche Methode), nicht mit der /login-Serie.

## Phase-3-Schwellen (NACH 3-5 GHA-Runs ableiten)

Lokale Single-Session-Werte streuen (TBT /market 1917→7701). Schwellen erst aus
GHA-Runs (gleiche Runner-Klasse) mit Mean ± 1.5×StdDev ableiten — Sammel-Start
mit diesem Slice (jeder Deploy triggert authed Run). Bis dahin WARN-only.

## Methodik-Notizen

- `disableStorageReset: true` ist Pflicht (Session überlebt Audit-Runs) — Trade-off
  dokumentiert: Runs 2+3 je URL profitieren von warm cache.
- Login 1× pro URL-Gruppe (Cookie-Check-Skip), ~6s Overhead pro Collection.
- Messung läuft als jarvis-qa (Holdings + Streak vorhanden) — konsistente Persona
  mit Smoke/Synthetic.
