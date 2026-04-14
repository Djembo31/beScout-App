---
name: Journey 5 — Frontend Audit (Mystery Box)
description: Frontend-Audit fuer /home → MysteryBoxModal → Open → Reward → Daily-Cap. Identifiziert UI/UX, a11y, i18n, Animation, Race-Bedingungen, Contract-Fragen, Multi-League-Relevanz.
type: project
status: ready-for-aggregate
created: 2026-04-14
---

# Journey #5 — Frontend Audit (Mystery Box)

**Scope:** `/home` Mystery Box Card (Card + Badge + Open-Trigger), `MysteryBoxModal` (idle/animation/celebration), Daily-Cap-UI, Reward-Claim-Flow, Inventory-History (`MysteryBoxHistorySection`), Types, Particle-Animation.

**Total: 12 Findings — 2 CRITICAL + 4 HIGH + 4 MEDIUM + 2 LOW**

---

## CRITICAL

### J5F-01 CRITICAL — useHomeData bypasst Realtime-Reward-Optimistic-Update mit Garbage-ID

**Datei:** `src/app/(app)/hooks/useHomeData.ts:222-243`

```ts
const effectiveCost = free ? 0 : Math.max(1, 15 - (streakBenefits.mysteryBoxTicketDiscount ?? 0));
return {
  id: crypto.randomUUID(),        // ← LOCAL UUID, nicht die DB-ID aus RPC
  rarity: result.rarity!,
  reward_type: result.rewardType!,
  ...
```

**Problem:** `openMysteryBox` Service gibt die ECHTE DB-ID (v_result_id) nicht zurueck. Der Hook generiert client-side `crypto.randomUUID()` als Fake-ID fuer das `MysteryBoxResult`. Das Modal nutzt sie als React-key — harmlos. ABER: wenn User spaeter ein optimistic update macht (z.B. "diesen Drop loeschen" — zukuenftig denkbar), referenziert es eine nicht-existente ID.

**Schwerer:** `ticket_cost: effectiveCost` wird CLIENT-SIDE neu berechnet — wenn der Server anderen Discount anwendet (Race bei Streak-Tier-Flip), laeuft UI-Display auseinander vom DB-Record. Realistisch selten, aber bei den 18 "paid_opens" in DB (Legacy aus v1) evtl relevant.

**Fix:** Service `openMysteryBox` soll `id` + `ticketCost` + `openedAt` mit-returnen (RPC tut das bereits via `v_result_id`), Hook soll DB-Felder benutzen.

### J5F-02 CRITICAL — Equipment-Drops VERSCHWINDEN (keine Insertion in user_equipment seit 2026-04-08)

**Datei:** `src/components/gamification/MysteryBoxModal.tsx:403-421` (UI), plus Backend-Contract

**Live-Beweis (2026-04-14):**
```
user_equipment source=mystery_box:
 - oldest: 2026-04-07 00:41:42
 - newest: 2026-04-08 11:02:27
 - count after 2026-04-11 (fix-migration): 0
```

**Root-Cause:** Live-RPC-Body `open_mystery_box_v2` macht `INSERT INTO user_equipment (user_id, equipment_key, equipment_rank, source)` — aber die Tabelle hat Spalte `rank`, nicht `equipment_rank`. Die Fix-Migration `20260411114600_mystery_box_equipment_branch_fix.sql` hat den Column-Namen falsch uebernommen.

**Frontend-Folge:** `MysteryBoxModal.RewardDisplay` branch `'equipment'` rendert Name + Rank aus Response — ABER die DB hat keinen Eintrag. User klickt "Im Inventar ansehen" → Inventar zeigt Equipment NICHT. Stille UX-Katastrophe.

**Fix:** Backend-RPC korrigieren (AR-43). Frontend muss nichts aendern — aber bis dahin ist die gesamte Equipment-Belohnungspfad fake.

---

## HIGH

### J5F-03 HIGH — Modal preventClose nur waehrend Animation, nicht waehrend RPC-Call

**Datei:** `src/components/gamification/MysteryBoxModal.tsx:177, 186`

```tsx
const isAnimating = boxState === 'anticipation' || boxState === 'shake' || boxState === 'burst';
...
<Modal open={open} onClose={handleClose} preventClose={isAnimating}>
```

Im Reduced-Motion-Branch (Zeile 91-109) wird die RPC direkt awaited OHNE `boxState` zu aendern — `preventClose` ist false, User kann Modal mitten im RPC-Call schliessen. RPC laeuft trotzdem durch, Daily-Cap greift, aber User sieht nie das Result.

**Fix:** Im Reduced-Motion-Branch boxState auf `'anticipation'` setzen waehrend des awaits, damit Modal-Close blockiert wird. ODER: separaten `inFlight`-State pro Call.

### J5F-04 HIGH — Native navigator.vibrate ohne User-Permission-Check (iOS Safari)

**Datei:** `src/components/gamification/MysteryBoxModal.tsx:81-85`

```ts
const triggerHaptic = useCallback((ms: number) => {
  if (ms > 0 && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(ms);
  }
}, []);
```

iOS Safari 13+ hat `navigator.vibrate` aber ignoriert Calls ausserhalb "user gesture". Feature-Detection greift, aber auf iOS 16+ kann das einen Console-Warn ausgeben. Kein Bug, aber J4-Pattern (avoid native APIs without explicit opt-in) nicht gefolgt.

**Fix:** Feature-Detect + respect `prefers-reduced-motion` (teil-implementiert via `reducedMotion.current` aber nicht auf `triggerHaptic` angewandt). Wenn `reducedMotion=true`, skip Haptics.

### J5F-05 HIGH — useHasFreeBoxToday "fails open" verdeckt Daily-Cap-Bug

**Datei:** `src/lib/services/mysteryBox.ts:83-96` + `src/lib/queries/mysteryBox.ts`

```ts
if (error) throw new Error(error.message);
return count ?? 0;
```

Service wirft jetzt Error (gut, nach J1-J4 Pattern). ABER: React Query caches `0` als success fuer 30s wenn User frisch eingeloggt ist und RLS noch nicht ready ist (analog J1 RLS-Race). Bei 30s staleTime kann der User noch 29s glauben "gratis Box da" obwohl er sie schon geclaimt hat — solange der erste Request 0 returned hat.

**Fix:** `staleTime: 0` fuer diese Query + `invalidateQueries` nach `openMysteryBox({free:true})`. Letzteres existiert (`useHomeData.ts:220`), aber staleTime=30s laesst Race-Window.

### J5F-06 HIGH — Cosmetic-Reward zeigt keinen Namen

**Datei:** `src/components/gamification/MysteryBoxModal.tsx:438-445`

```tsx
case 'cosmetic':
  return (
    <div className="text-center">
      <Sparkles className="size-8 mx-auto mb-2 text-purple-400" />
      <p className="text-sm font-bold text-white">{t('cosmeticUnlocked')}</p>
      <p className="text-xs text-white/40 mt-1">{t('cosmeticAddedToCollection')}</p>
    </div>
  );
```

Service gibt `cosmeticName` + `cosmeticKey` zurueck (siehe mysteryBox.ts:48-49), aber Modal ignoriert sie. User sieht "Neues Cosmetic freigeschaltet!" ohne zu wissen WAS. Parallel zu Equipment-Branch der einen Namen zeigt — Inkonsistenz.

**Fix:** `result.cosmetic_name ?? result.cosmetic_id` anzeigen. History-Section hat das gleiche Problem (`formatRewardLabel` branch `cosmetic` gibt nur generisches "Cosmetic" zurueck).

---

## MEDIUM

### J5F-07 MEDIUM — Rarity Label hardcoded DE, TR ignoriert

**Datei:** `src/components/gamification/rarityConfig.ts:33-104`, Consumer `MysteryBoxModal.tsx:315, 327`

```ts
const rarityConf = result ? RARITY_CONFIG[result.rarity] : null;
...
{rarityConf?.label_de ?? ''}
```

`RARITY_CONFIG` hat `label_de` UND `label_tr` — aber alle Consumer nutzen hardcoded `label_de`. TR-User sehen "Gewoehnlich/Selten/Episch/Legendaer/Mythisch" statt "Siradan/Nadir/Epik/Efsanevi/Mitolojik".

**Fix:** Helper `getRarityLabel(rarity, locale)` oder Consumer sollen `useLocale()` + `rarityConf.label_${locale}`. Pattern wie in `MysteryBoxHistorySection:135` `rarityCfg.label_de`.

### J5F-08 MEDIUM — Reward-Preview hardcoded auf Englisch/Tech-Vokabel

**Datei:** `src/components/gamification/MysteryBoxModal.tsx:28-35`

```ts
const REWARD_PREVIEW: { rarity: MysteryBoxRarity; rewards: string }[] = [
  { rarity: 'common', rewards: 'Tickets' },
  { rarity: 'rare', rewards: 'Tickets / Equipment R1' },
  { rarity: 'epic', rewards: 'Tickets / Equipment R1-R2' },
  ...
];
```

Hardcoded in Komponente, keine i18n. TR-User sehen englische Tech-Worte "Equipment R1-R2". Zusaetzlich: "bCredits" ist ein internes Code-Wort das User nicht kennen.

**Fix:** `possibleRewards.common/rare/...` Keys in messages/*.json, `t()` nutzen. "bCredits" durch "Credits" oder "CR" ersetzen (CEO-Glossar-Entscheidung).

### J5F-09 MEDIUM — Mystery Box History Date-Format hardcoded DE

**Datei:** `src/components/inventory/MysteryBoxHistorySection.tsx:95-99`

```ts
const date = new Date(entry.opened_at).toLocaleDateString('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
```

Hardcoded locale 'de-DE' — TR User sieht `14.04.2026` statt `14/04/2026` (TR-Format). Parallel: gleichnamiges Problem in anderen History-Komponenten (bekannt aus J3).

**Fix:** `useLocale()` aus next-intl, `toLocaleDateString(locale)`.

### J5F-10 MEDIUM — Bcredits Amount-Formatierung locale-invariant

**Datei:** `src/components/gamification/MysteryBoxModal.tsx:430-431`

```tsx
+{displayAmount.toLocaleString('de-DE')} CR
```

Hardcoded `de-DE`. "CR"-Label nutzt bereits J4-Flagging (siehe J4 B16). Plus: `displayAmount = Math.round(amount / 100)` — cents→units, aber hart ohne Hinweis dass es `/100` ist (Komentarlos, Magic-Number).

**Fix:** useLocale + extract const `CENTS_TO_UNITS = 100`. "CR" via J4-Glossar-Pattern (AR-32).

---

## LOW

### J5F-11 LOW — Canvas-Particle ResizeObserver fehlt, erste Render ohne Canvas-Mass

**Datei:** `src/components/gamification/MysteryBoxModal.tsx:66-79`

```ts
useEffect(() => {
  if (!canvasRef.current) return;
  const canvas = canvasRef.current;
  const rect = canvas.parentElement?.getBoundingClientRect();
  if (rect) {
    canvas.width = rect.width;
    canvas.height = rect.height;
  }
  particleRef.current = new ParticleSystem(canvas);
  ...
}, [open]);
```

Canvas-Dimensionen werden EINMAL bei `open=true` gesetzt. Bei Orientation-Change (Portrait → Landscape) oder Browser-Resize bleibt Canvas bei alter Groesse → Particles driften aus dem Modal-Layout. Selten aber sichtbar auf Tablets.

**Fix:** `ResizeObserver` auf `canvas.parentElement` + re-sizen.

### J5F-12 LOW — Emoji-frei aber Gift-Icon unwrapped in Card (click area NICHT accessible)

**Datei:** `src/app/(app)/page.tsx:381-436` Mystery-Box-Card

Card ist `cursor-pointer` + `onClick`, aber KEIN `<button>` oder `role="button"` + `aria-label`. Screen-Reader-User erkennen die Card nicht als interaktiv. Zeile 390 `onClick={() => setShowMysteryBox(true)}` direkt auf `Card`.

**Fix:** `<Card as="button" onClick={} aria-label={t('mysteryBoxTitle')}>` oder wrap in `<button>`. Bestehendes `aria-hidden="true"` auf decorative `<Gift>` ist OK, aber der Klick selbst muss rolle-discoverable sein.

---

## VERIFIED OK (Live 2026-04-14)

| Check | Beweis |
|-------|--------|
| Modal `open` prop immer gesetzt | `<Modal open={open} ...>` Zeile 182 |
| preventClose on animating state | Zeile 186 (partial — siehe J5F-03) |
| Reduced-Motion-Fallback | Zeile 91-109 (skipt Animation) |
| Haptic feature-detect | Zeile 82 (`'vibrate' in navigator`) |
| SSR-safe dynamic import | `dynamic(() => import('./MysteryBoxModal'), { ssr: false })` page.tsx:34 |
| Invalidation nach Open | useHomeData.ts:207-221 alle relevanten queryKeys |
| Mission tracking fire-and-forget | mysteryBox.ts:58-60 |
| Multi-League | NICHT relevant — Box ist club/league-agnostisch |

---

## LEARNINGS (Drafts)

1. **Contract-Drift zwischen RPC-Body und Table-Schema ist stumm fatal** — J5F-02 fix-migration referenziert nicht-existente Spalte, aber PG-Error wird client-side gefangen und als "Open error" angezeigt. Daten-Asymmetrie: `mystery_box_results` Record existiert, aber `user_equipment` INSERT schlaegt fehl → UI sagt "Equipment erhalten", DB hat nichts.
2. **rarityConfig label_de hardcoded-Pattern** — Gleiche Falle in Fantasy (J4), Transactions (J3). Zentrales `getRarityLabel(rarity, locale)` Helper statt Config-Object mit label_de/label_tr.
3. **staleTime 30s auf "hat User heute geclaimt" Query** — Race-Window zwischen Open und Invalidation. Fuer Gates die Doppel-Calls ermoeglichen: staleTime=0.
4. **Client-generierte Fake-IDs fuer optimistic Updates** — `crypto.randomUUID()` als Replacement fuer DB-Id ist Anti-Pattern. Service soll DB-ID mit-returnen.
