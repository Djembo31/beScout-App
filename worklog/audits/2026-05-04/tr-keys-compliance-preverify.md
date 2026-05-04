# TR-Keys Compliance Pre-Verify — Slice 266 + 269

**Datum:** 2026-05-04 · **Slice-Scope:** 266 (Spotlight-Multi-Slot) + 269 (Markt-Puls 3-Tab)
**Anlass:** Sign-Off-Re-Trial #2 RISK-5 (P3-USER-ACTION) — TR-Pflicht-Review der 11 neuen Keys
**Verdict:** ✅ **PASS** (alle 11 Keys compliant + UX-clean + linguistisch korrekt)
**Anil-Restaufgabe:** 5 min Best-Practice-Skim statt 30 min Audit

---

## Scope: 11 Keys (Slice 266: 4 + Slice 269: 7)

### Slice 266 (Spotlight-Multi-Slot, 4 Keys)

| Key | TR | DE (Referenz) |
|-----|-----|---------------|
| `home.spotlightLiveScore` | Canlı · Hafta {gw} devam ediyor | Live · Spieltag {gw} läuft |
| `home.spotlightLiveScoreCta` | Canlı Skoru Gör | Live-Score ansehen |
| `home.spotlightMysteryBox` | Günlük Mystery Box · ücretsiz | Daily Mystery Box · gratis |
| `home.spotlightMysteryBoxCta` | Kutu Aç | Box öffnen |

### Slice 269 (Markt-Puls 3-Tab, 7 Keys)

| Key | TR | DE (Referenz) |
|-----|-----|---------------|
| `home.marketPulseTabs.movers` | Hareket | Bewegung |
| `home.marketPulseTabs.moversShort` | Hareket | Movers |
| `home.marketPulseTabs.trending` | Trendler | Trends |
| `home.marketPulseTabs.trendingShort` | Trend | Trends |
| `home.marketPulseTabs.watched` | İzlenen | Beobachtet |
| `home.marketPulseTabs.watchedShort` | İzlenen | Watched |
| `home.tradeCount` | `{count, plural, one {# işlem} other {# işlem}}` | `{count, plural, one {# Trade} other {# Trades}}` |

---

## Compliance-Audit Layer 1: business.md Verbots-Register

**Geprüft gegen** (`.claude/rules/business.md`):

### Securities-Terminologie (SPK/MASAK Red-Flag)
- ❌ `IPO` (Kürzel) → ✅ keine der 11 Keys nutzt das
- ❌ `Orderbuch` / `Teklif Derinliği` → ✅ keine
- ❌ `Trader` (Rolle) / `Portfolio` → ✅ keine
- ❌ `Handle clever` / `Akıllıca işlem` → ✅ keine

### Glücksspiel-Vokabel (StGB §284, MASAK §4)
- ❌ `Prize` / `Prämie` / `Preisgeld` → ✅ keine
- ❌ TR `kazan*` (kazandın, kazandı, kazandın) → ✅ **0 Treffer** in 11 Keys
- ❌ `Gewinner` / `Üst Sıralama`-Drift → ✅ keine

### Reinvestment-Anti-Pattern
- ❌ Trading-CTA in Post-Reward-Modal → ✅ N/A (Slice 266 LiveScore + MysteryBox sind Discovery, keine Reward-Modals; Slice 269 Markt-Puls ist Discovery-Tabs, keine Reinvestment-Aufforderung)

### Asset-Klasse-Verbote (Slice 224 erweitert)
- ❌ `Investiere in Spieler/BeScout` → ✅ keine
- ❌ `Rendite/Profit/Gewinn` (Subst.) → ✅ keine
- ❌ `Asset-Klasse, Anteile, Shares` → ✅ keine
- ❌ `unter-/überbewertet` / `düşük değerli` / `yüksek değerli` → ✅ keine
- ❌ Trading-`Position` / `pozisyon` (Trading-Sinn) → ✅ keine (existing `pozisyon` in `tr.json:60+651+806+1136` ist **Spielposition**, business.md-whitelist)

### Meme-Coin-Sprache (komplett verboten)
- ❌ `to the moon` / `HODL` / `degen` / `bagholder` / `x10` / `x100` / `moonshot` / `FOMO` → ✅ keine

### Audit-Kommando-Output
```bash
grep -nE "(kazan|yatırım|kâr|getiri|pay\b|hisse|pozisyon|moonshot|hodl|ape|degen|bagholder|akıllıca|prim|ipo)" messages/tr.json | grep -E "spotlightLive|spotlightMystery|marketPulseTabs|tradeCount"
# Output: <leer>
# → 0 Treffer in 11 Slice-266+269-Keys
```

**Layer 1 Verdict:** ✅ **PASS** — 0 Verbots-Treffer.

---

## Compliance-Audit Layer 2: business.md Empfohlene Wörter

### Wording-Empfehlungen erfüllt

| Empfehlung (business.md) | Slice-266+269 Anwendung |
|--------------------------|--------------------------|
| Reward = neutral OK | „ödül" wird nicht in 11 Keys verwendet → unproblematisch |
| Reward-Pool TR = „Ödül Havuzu" | N/A (kein Pool-String in Slice 266+269) |
| Manager-Identität: „Stelle Lineups auf" statt „Gewinne" | spotlightLiveScoreCta: „Canlı Skoru Gör" — neutral Discovery, kein Action-Push ✅ |
| Casual-Education statt Gambling-Trigger | „Günlük Mystery Box · ücretsiz" — daily-driver-discoverable, keine Spekulations-Andeutung ✅ |
| Sammler-Identität statt Trader-Identität | „İzlenen" (passive) statt „Takip ediliyor" (aktiv-Verfolgung) — neutraler, sammler-konform ✅ |

**Layer 2 Verdict:** ✅ **PASS** — Wording-Geist (Sammler/Casual statt Trader/Spekulant) eingehalten.

---

## UX-Quality-Audit Layer 3: Mobile-Tab + Imperativ + Konsistenz

### Imperativ-Form bei CTAs (UX-Standard)
- ✅ `spotlightLiveScoreCta` „Canlı Skoru Gör" — Imperativ („Sieh!"), aktiv, kurz
- ✅ `spotlightMysteryBoxCta` „Kutu Aç" — Imperativ („Öffne!"), 2 Wörter, perfekt für Button

### Längen-Audit für Mobile 393px Tab-Bar
- `marketPulseTabs.movers` „Hareket" — 7 Zeichen ✅
- `marketPulseTabs.moversShort` „Hareket" — 7 Zeichen ✅ (TR Short = Long, keine Kürze möglich, akzeptabel)
- `marketPulseTabs.trending` „Trendler" — 8 Zeichen ✅
- `marketPulseTabs.trendingShort` „Trend" — 5 Zeichen ✅
- `marketPulseTabs.watched` „İzlenen" — 7 Zeichen ✅
- `marketPulseTabs.watchedShort` „İzlenen" — 7 Zeichen ✅ (Short = Long)

**3-Tab-Bar Mobile 393px:** Längste Kombi „Hareket | Trendler | İzlenen" = 22 Zeichen, fits comfortably auf 393px-Container mit Padding.

### TR-Plural Korrektheit
- `tradeCount: "{count, plural, one {# işlem} other {# işlem}}"`
- TR-Grammatik: Substantive nach Zahlen nehmen **kein** Plural-Suffix (-lar/-ler), daher one/other = same form `# işlem` ✅
- Beispiel-Output: „1 işlem", „5 işlem", „100 işlem" — alle grammatisch korrekt
- ICU-Plural-Format: Pflichtfelder (one + other) eingehalten ✅

### Mid-Dot-Separator-Konsistenz
- `spotlightLiveScore` „Canlı · Hafta {gw} devam ediyor" — Mid-Dot wie DE „Live · Spieltag {gw} läuft" ✅
- `spotlightMysteryBox` „Günlük Mystery Box · ücretsiz" — Mid-Dot wie DE ✅
- Mid-Dot-Char `·` (U+00B7) ist global-konsistent — nicht durch en-dash oder hyphen ersetzt ✅

**Layer 3 Verdict:** ✅ **PASS** — UX-clean, Mobile-393px-tauglich, ICU-korrekt.

---

## Linguistic-Quality-Audit Layer 4: Native-TR-Sprachfluss

### Natürlichkeit der Phrasierungen
- „Canlı · Hafta {gw} devam ediyor" — neutral, modernes TR, „devam ediyor" (= „läuft / dauert an") natürlich
- „Canlı Skoru Gör" — kurzer Imperativ, Akkusativ-Markierung mit -u korrekt (Skor → Skoru)
- „Günlük Mystery Box · ücretsiz" — Anglizismus „Mystery Box" akzeptabel im TR-Gaming-Kontext, „ücretsiz" entspannt rechts
- „Kutu Aç" — minimalistisch, Imperativ, klar

### Watchlist-Konsistenz-Hinweis (Existing-Drift, KEIN Slice-269-Bug)

Existing TR-Watchlist-Terminologie ist **gemischt** zwischen 2 Begriffen:
- `watchlist` (root): „Takip Listesi" (`tr.json:1594`) — „Verfolgungsliste"
- `watchlist` (nested 2249): „İzleme Listesi" — „Beobachtungsliste"

Slice 269 nutzt **dritte Variante** für Tab-Label: „İzlenen" (Passiv-Partizip von „izlemek" = beobachten).

**Bewertung:**
- ✅ Slice-269-Wahl semantisch korrekt + UX-konform (kompakter Tab-Label)
- ✅ Same-Root-Konsistenz mit „İzleme Listesi" — kein Begriffs-Bruch
- ⚠️ Existing-Drift „Takip" vs „İzleme" wäre separater Cleanup-Slice — **NICHT** Slice-269-Verantwortung
- 🎯 Empfehlung post-Beta: Cleanup-Slice „TR-Watchlist-Terminologie unifizieren" → entweder konsistent „İzleme" oder konsistent „Takip" über alle ~10 Watchlist-Strings

**Layer 4 Verdict:** ✅ **PASS** — natives TR, Slice-269 hat eigene-Wahl-Begründung. Existing-Drift dokumentiert für post-Beta.

---

## Final-Verdict

| Layer | Check | Status |
|-------|-------|--------|
| 1 | Verbots-Register (Securities + Glücksspiel + Asset-Klasse + Meme-Coin) | ✅ PASS |
| 2 | Empfohlene-Wörter-Geist (Sammler/Casual statt Trader/Spekulant) | ✅ PASS |
| 3 | UX-Quality (Mobile-393px + Imperativ + ICU-Plural + Mid-Dot) | ✅ PASS |
| 4 | Linguistic-Quality (Native-TR + Watchlist-Konsistenz-Hinweis) | ✅ PASS |

**Compliance-Verdict:** ✅ **PASS — alle 11 Keys deploy-ready ohne Patch-Bedarf**

**Anil-Restaufgabe (5 min Best-Practice):**
1. **Skim** der TR-Phrasierungen oben (4 Spotlight + 6 Tabs + 1 Plural)
2. **Optional:** Mobile-Test der Tab-Bar via Browser-DevTools 393px (Tab-Truncation-Check)
3. **Best-Practice-Decision:** Existing-TR-Watchlist-Drift (Takip vs İzleme) — Cleanup-Slice anlegen oder als „acceptable Drift" akzeptieren?
4. **Sign-Off:** RISK-5 → CLOSED, Sign-Off-Re-Trial #2 → PASS-ENDGÜLTIG (vorausgesetzt Action-Items 1+2+4+5 ebenfalls done)

**Audit-Quellen:**
- `.claude/rules/business.md` — Verbots-Register + Asset-Klasse-Positionierung + Meme-Coin-Sprache + AR-7 IPO-Begriffsregel + AR-17 Kapitalmarkt-Glossar + Slice 224 Sentiment-Wording-Heal
- `messages/tr.json:413-433` (Slice 266) + `messages/tr.json:413-420 + 423` (Slice 269)
- `messages/de.json:413-433` (Referenz für Layer-Konsistenz)

**Pre-Verify-Methodik:** 4-Layer-Sweep (Verbote · Empfehlungen · UX · Linguistic) — same Standard wie business.md-CI-Guard-Schemata für post-Beta.

**Reference-Slice:** SO-5 (dieses Audit) als Knowledge-Promotion-Pattern „TR-Compliance-Pre-Verify-Audit-File" für zukünftige multi-key TR-Slices.
