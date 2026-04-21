# TR-Locale Pre-Audit Findings (2026-04-21)

Pre-Audit-Arbeit VOR dem Deutsch-Türke-Review. 36 Findings aus 802 TR-Strings ausgespürt.

**Pipeline-Artefakte:** `qa-screenshots/synthetic/profile-c-tr-locale/` (gitignored)
- `tr-strings.txt` — 802 unique strings, generiert von Synthetic-Suite
- `audit-report.md` — kategorisierte Findings (generiert von `pnpm run audit:tr-strings`)
- `audit-root-causes.md` — Root-Cause-Trace zu Code-Quellen + Fix-Empfehlungen

**Script:** `scripts/audit/tr-strings.mjs` (`pnpm run audit:tr-strings`)

## Beta-Blocker (Anil-Entscheidung)

### 🚨 Bug 1 — Ländernamen hart-codiert DE (`src/lib/leagues.ts:13-22`)

TR-User sehen "Türkei" statt "Türkiye", "Almanya" statt "Deutschland" etc. in Rankings, Fantasy, Clubs, Marktplatz, Kader, Portfolio.

```ts
const COUNTRY_NAMES: Record<string, string> = {
  DE: 'Deutschland',  // ← sollte per Locale switchen
  TR: 'Türkei',       // ← "Türkiye" in TR
  ...
};
```

**Fix (1h):** `getCountryName(code, locale)` + zweites Mapping `COUNTRY_NAMES_TR`. 7 Call-Sites mit `useLocale()` anpassen.

**Vorhandene Ressource:** `messages/tr.json` hat die TR-Namen schon (`jurisdictionTR: "Türkiye"`, `region.turkey: "Türkiye"`), nur nicht in diesem Kontext genutzt.

---

### 🚨 Bug 2 — Community-Feed-Posts alle auf DE (20+ posts in Production DB)

10 hart-codierte DE-Templates in `e2e/bots/ai/agent.ts:475` (und umliegende `ANALYST_TEMPLATES`, `TRADER_TEMPLATES`, `LURKER_TEMPLATES`). AI-Bots posten in Production-DB.

Beispiele:
- "Emre Gökay ist einer der besten Spieler bei Sivasspor! L5 Score: 67. Unterschaetzt vom Markt."
- "Bekir Karadeniz Analyse: Position: MID | Club: ... Trend: steigend Starker Performer..."

**Fix-Optionen:**
- **A.** DB-Cleanup einmalig: `DELETE FROM community_posts WHERE user_id IN (SELECT id FROM auth.users WHERE handle LIKE 'bot0%')`. **5 Min.**
- **B.** Bot-Templates bilingual (`{de: ..., tr: ...}` + Bot-Locale aus Config). **3h.**
- **C.** Bots bis Beta-End abschalten + DB-Cleanup. **10 Min.**

**Empfehlung:** C — Bot-Posts ziehen keinen Beta-Tester-Wert, riskieren aber Locale-Inkonsistenz.

---

### 🚨 Bug 3 — "IPO erken erişim" verstößt AR-7 Glossar-Regel

`messages/tr.json:4926`: `"extraIpoEarly": "IPO erken erişim"`

Business-Rule: user-facing "IPO" = SPK/MASAK-Red-Flag. Muss "Kulüp Satışı" sein.

**Fix (2 Min):** String in tr.json ersetzen. Check weitere Vorkommnisse:
```bash
grep -n '"IPO' messages/tr.json
```

---

## Non-Blocker (post-Beta OK)

- **"Gestartet"** im Manager (2): Event-Status. Check wo DE hart-codiert.
- **"DOUBTFUL"** Injury-Status (1): Enum aus API-Football direkt gerendert. Brauchen i18n-Enum-Map.
- **"LIVE"** Event-Badge (1): Inkonsistent zu "CANLI" (das existiert schon). Vereinheitlichen.
- **"Name"** Column-Header (1): Minor.
- **"Find undervalued ATT in Adana"** (1): Community-Prompt, wahrscheinlich DB-Seed.
- **Bot-Handles "Trader 07" etc.** (9): DB-Seeds, verstößt AR-17 "Trader" aber Seeds sind post-Beta-OK.

---

## Aufwand-Übersicht

| Bug | Beta-Blocker | Aufwand |
|-----|--------------|---------|
| 1 Ländernamen | JA | 1h |
| 2 Bot-Posts | JA (Option C) | 10 Min |
| 3 IPO-Wording | JA | 2 Min |
| **Summe Beta** | | **~1h 15 Min** |
| 4-7 Non-Blocker | — | 2-3h post-Beta |

## Nächste Schritte

1. **Anil entscheidet:** Option A, B oder C für Bug 2?
2. **Ein einziger Slice** für Bug 1+2+3 (≤2h): `fix(i18n): tr-locale beta-blockers`
3. Nach Fix: `pnpm run test:synthetic` + `pnpm run audit:tr-strings` — erwartet Total von 36 → ~5 Findings
4. TR-Strings-Dump als letzte Zeile an Deutsch-Türke-Reviewer für manuelle Feinabstimmung
