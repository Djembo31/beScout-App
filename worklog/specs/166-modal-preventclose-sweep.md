# Slice 166 — Modal preventClose Sweep

**Size:** M · **Stage:** SPEC · **Started:** 2026-04-23
**Type:** Hardening (UX-Safety — schützt Modal-State während RPC-Mutation)
**Reference:** `.claude/rules/common-errors.md` §5 J2+J3 "Modal preventClose Pattern" · Slice 161 NIT #2 + Slice 163 Finding #1

## Ziel

Modals mit in-flight Mutationen können via ESC-Taste oder Backdrop-Click geschlossen werden — das verliert den Mutation-Fortschritt-State und kann zu UI-Desync führen (Mutation läuft weiter im Background, onSuccess setzt State auf weg-gecleartes Modal). `preventClose={<isPending>}` blockt beides während der Mutation läuft.

## Scope-Audit (grep-verified)

Modal-API unterstützt `preventClose: boolean` (src/components/ui/index.tsx:137). Viele Modals haben es bereits korrekt (BuyModal, EquipmentPicker, MysteryBoxModal, EventDetailModal, ConfirmDialog, SellModalCore).

**7 Ziele mit Mutation aber ohne preventClose:**

| # | File | Mutation-State | Fix |
|---|------|----------------|-----|
| 1 | `components/fantasy/LeaguesSection.tsx:55` (CreateLeagueModal) | `createMut.isPending` | `preventClose={createMut.isPending}` |
| 2 | `components/fantasy/LeaguesSection.tsx:126` (JoinLeagueModal) | `joinMut.isPending` | `preventClose={joinMut.isPending}` |
| 3 | `components/fantasy/CreatePredictionModal.tsx:170` | `createPredictionMut.isPending` | `preventClose={createPredictionMut.isPending}` |
| 4 | `components/community/CreatePostModal.tsx:122` | `loading` Prop (parent-controlled) | `preventClose={loading}` |
| 5 | `components/community/CreateBountyModal.tsx:62` | `loading` Prop | `preventClose={loading}` |
| 6 | `components/community/CreateResearchModal.tsx:156` | `loading` Prop | `preventClose={loading}` |
| 7 | `components/admin/AddAdminModal.tsx:85` | `saving` state (D17-Pattern intern) | `preventClose={saving}` |

## Out-of-Scope

**Admin-Tier-2 Space** (10 Files separate):
- AdminBountiesTab 3× Modals, AdminOverviewTab, AdminPlayersTab 4× Modals, AdminVotesTab, CreateClubModal, EventFormModal, FanChallengesTab, InviteClubAdminModal, SpieltagTab 2× Modals
- Separater Sweep-Slice wenn Admin-Flows demnächst getestet werden.

**Non-Mutation-Modals** (kein Fix nötig):
- AchievementUnlockModal, EquipmentDetailModal, Glossary, ShortcutsModal, ErgebnisseTab showLeagues/showSeason, FeedbackModal (lass ggf. checken), WelcomeBonusModal — nur Display oder minimale State-Transitions ohne RPC.

**Deferred-Scope-Note-Modals** (haben bereits Kommentar mit TODO):
- `CreateEventModal.tsx:74` (preventClose={false} mit Begründung + TODO)
- `EventSummaryModal.tsx:50` (preventClose={false} mit Begründung + TODO)
- `LimitOrderModal.tsx:41` (preventClose={false} mit Begründung + TODO)
Diese Modals haben bewusst `preventClose={false}` mit dokumentiertem Plan — out-of-scope.

## Acceptance Criteria

1. Alle 7 Ziel-Modals haben `preventClose` korrekt gesetzt.
2. Der Value ist der richtige Mutation-Pending-State (nicht `false` oder `true`-hart-kodiert).
3. Bestehende Tests grün: Community + Fantasy + Admin Testsuiten.
4. `tsc --noEmit` clean.
5. Audit-Grep nach Slice: `grep "<Modal" src/components/fantasy/LeaguesSection.tsx src/components/fantasy/CreatePredictionModal.tsx src/components/community/CreatePostModal.tsx src/components/community/CreateBountyModal.tsx src/components/community/CreateResearchModal.tsx src/components/admin/AddAdminModal.tsx` → alle haben `preventClose=`.

## Edge Cases

1. **AddAdminModal hat 2 pending-States:** `saving` (handleAdd) + `searching` (handleSearch). Search blockt lokale UI-State-Änderungen, aber kein ESC-Risiko (Search ist schnell). `preventClose={saving}` reicht — Fokus auf Mutation, nicht Search.
2. **LeaguesSection 2 separate Modals:** Jedes hat eigene Mut-Instanz — separate preventClose-Props.
3. **Parent-controlled `loading` Prop:** Bei CreatePostModal/CreateBountyModal/CreateResearchModal ist `loading` von außen (Parent passt State). `preventClose={loading}` synct korrekt.

## Proof-Plan

- `npx tsc --noEmit` clean
- `npx vitest run src/components/community src/components/fantasy src/components/admin` grün
- Grep-Audit: 7 Ziel-Modals haben `preventClose=` gesetzt

## Learnings vorab

common-errors.md §5 "Modal preventClose Pattern" ist bereits dokumentiert. Slice 166 ist Anwendung dieser Regel, kein neues Pattern.

Heuristik aus Pattern: "Jeder Modal mit `useMutation.isPending` → `preventClose={isPending}` pflicht". Slice 166 appliziert systematisch nach Grep-Audit.
