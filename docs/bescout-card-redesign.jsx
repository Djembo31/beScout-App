import { useState } from "react";

// ============================================================
// BESCOUT PLAYER CARD REDESIGN
// Based on analysis of 7 screenshots (6 BeScout + 1 Sorare)
// ============================================================

const COLORS = {
  bg: "#0A0A0A",
  card: "#141414",
  cardBorder: "#1E1E1E",
  surface: "#1A1A1A",
  text: "#F5F5F5",
  textSecondary: "#888888",
  textMuted: "#555555",
  accent: "#C8FF00", // BeScout lime green
  positive: "#4ADE80",
  negative: "#F87171",
  neutral: "#888888",
};

const POS = {
  GK: { color: "#FBBF24", bg: "#FBBF2422", label: "GK" },
  DEF: { color: "#60A5FA", bg: "#60A5FA22", label: "DEF" },
  MID: { color: "#4ADE80", bg: "#4ADE8022", label: "MID" },
  ATT: { color: "#FB7185", bg: "#FB718522", label: "ATT" },
};

const RARITY_BORDER = {
  Common: "#555555",
  Rare: "#60A5FA",
  Epic: "#A78BFA",
  Legendary: "#FBBF24",
  Mythic: "#FB7185",
};

// ============================================================
// PROBLEM ANALYSIS PANEL
// ============================================================

const ProblemAnalysis = () => {
  const problems = [
    {
      id: "identity",
      title: "Identität springt",
      severity: "critical",
      desc: "Name ist mal links oben, mal nach dem Badge, mal abgeschnitten. Position-Badge wandert. Foto mal rund, mal Initialen, mal ganz anders. Der User muss bei JEDEM Screen neu suchen.",
      screens: ["Portfolio", "Manager", "Markt", "IPO", "Alle Spieler"],
      fix: "Identität FIXIERT: Foto links, Name rechts daneben (Zeile 1), Position + Club (Zeile 2). Immer. Überall.",
    },
    {
      id: "truncation",
      title: "Namen abgeschnitten",
      severity: "critical",
      desc: "\"Vinko Sol...\", \"Deniz Dil...\" — im Portfolio sieht man nicht mal welcher Spieler das ist. Name ist das wichtigste Element.",
      screens: ["Portfolio"],
      fix: "Name hat Priorität. Eher Position/Club kürzen als den Namen. Mindestens Vorname + erster Buchstabe Nachname.",
    },
    {
      id: "kpis",
      title: "Falsche KPIs im falschen Kontext",
      severity: "high",
      desc: "Portfolio zeigt 'Floor' (Markt-Info) statt P&L + Mastery. Manager zeigt LS-Scores aber keine Fantasy-relevanten Daten. Markt zeigt Alter statt Trend.",
      screens: ["Alle"],
      fix: "Jeder Kontext hat EIGENE 2-3 KPIs. Portfolio: P&L + Mastery. Manager: Form + Rating. Markt: Preis + Trend.",
    },
    {
      id: "dots",
      title: "Farbige Punkte unklar",
      severity: "medium",
      desc: "Im Portfolio: rote/gelbe/grüne Punkte neben L5-Score. Was bedeuten die? Kein Label, keine Legende. User rät.",
      screens: ["Portfolio"],
      fix: "Entweder mit Label (\"Form: ●●●○○\") oder durch klare Zahlen ersetzen.",
    },
    {
      id: "cardvslist",
      title: "Card vs. Liste vs. Hybrid",
      severity: "high",
      desc: "IPO-Sektion: horizontale Cards. Darunter: vertikale Cards. Manager: kompakte Liste. Portfolio: breite Cards. Markt: Listen-Rows. 5 verschiedene Layouts.",
      screens: ["IPO Home", "Manager", "Portfolio", "Markt"],
      fix: "2 Formate: Compact Row (für Listen/Browse) und Standard Card (für Entscheidungen). Nicht 5.",
    },
    {
      id: "density",
      title: "Informationsdichte inkonsistent",
      severity: "medium",
      desc: "Manager-Liste: ultra-kompakt (LS, L15, Zahlen, alles gequetscht). Portfolio: viel Whitespace. Kein Rhythmus.",
      screens: ["Manager", "Portfolio"],
      fix: "Compact = 52px Höhe, 1 Info-Zeile. Standard = 72px, 2 Info-Zeilen. Expanded = 96px+, 3 Zeilen + Action.",
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.text, marginBottom: 4 }}>
        Analyse: 6 Probleme gefunden
      </div>
      <div style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 16 }}>
        Basierend auf deinen 6 BeScout Screenshots + Sorare-Referenz
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {problems.map((p) => (
          <div
            key={p.id}
            style={{
              background: COLORS.card,
              borderRadius: 10,
              border: `1px solid ${COLORS.cardBorder}`,
              padding: 14,
              borderLeft: `3px solid ${p.severity === "critical" ? "#F87171" : p.severity === "high" ? "#FBBF24" : "#60A5FA"}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  color: p.severity === "critical" ? "#F87171" : p.severity === "high" ? "#FBBF24" : "#60A5FA",
                  background: p.severity === "critical" ? "#F8717115" : p.severity === "high" ? "#FBBF2415" : "#60A5FA15",
                  padding: "2px 6px",
                  borderRadius: 4,
                }}
              >
                {p.severity}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{p.title}</span>
            </div>
            <div style={{ fontSize: 11, color: COLORS.textSecondary, lineHeight: 1.5, marginBottom: 8 }}>
              {p.desc}
            </div>
            <div style={{ fontSize: 11, color: COLORS.accent, lineHeight: 1.5 }}>
              → Fix: {p.fix}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================
// THE FIX: UNIFIED PLAYER COMPONENT SYSTEM
// ============================================================

// --- LAYER 1: IDENTITY (NEVER CHANGES) ---
const PlayerIdentity = ({ player, size = "standard" }) => {
  const pos = POS[player.position];
  const photoSize = size === "compact" ? 36 : size === "standard" ? 42 : 50;
  const nameSize = size === "compact" ? 13 : 14;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
      {/* Photo — ALWAYS round, ALWAYS left, ALWAYS same size per tier */}
      <div
        style={{
          width: photoSize,
          height: photoSize,
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${pos.color}33, ${pos.color}11)`,
          border: player.owned
            ? `2px solid ${RARITY_BORDER[player.rarity] || COLORS.cardBorder}`
            : `1.5px solid ${COLORS.cardBorder}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: photoSize * 0.32,
          fontWeight: 700,
          color: pos.color,
          flexShrink: 0,
          boxShadow: player.owned ? `0 0 12px ${RARITY_BORDER[player.rarity]}22` : "none",
        }}
      >
        {player.initials}
      </div>

      {/* Text block — Name ALWAYS line 1, Position+Club ALWAYS line 2 */}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              fontSize: nameSize,
              fontWeight: 600,
              color: COLORS.text,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {player.name}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: pos.color,
              background: pos.bg,
              padding: "1px 5px",
              borderRadius: 3,
              letterSpacing: 0.3,
              flexShrink: 0,
            }}
          >
            {pos.label}
          </span>
          <span style={{ fontSize: 11, color: COLORS.textMuted }}>·</span>
          <span
            style={{
              fontSize: 11,
              color: COLORS.textSecondary,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {size === "compact" ? player.clubShort : player.club}
          </span>
          {size !== "compact" && (
            <>
              <span style={{ fontSize: 11, color: COLORS.textMuted }}>·</span>
              <span style={{ fontSize: 11, color: COLORS.textSecondary }}>{player.age}J</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// --- KPI Value ---
const Val = ({ label, value, color, sub, align = "left" }) => (
  <div style={{ textAlign: align, minWidth: 0 }}>
    {label && <div style={{ fontSize: 9, color: COLORS.textMuted, fontWeight: 500, marginBottom: 1, textTransform: "uppercase", letterSpacing: 0.3 }}>{label}</div>}
    <div style={{ display: "flex", alignItems: "baseline", gap: 3, justifyContent: align === "right" ? "flex-end" : "flex-start" }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: color || COLORS.text, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </span>
      {sub && <span style={{ fontSize: 10, color: COLORS.textMuted }}>{sub}</span>}
    </div>
  </div>
);

// --- Mastery Indicator ---
const Mastery = ({ level, compact }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
    {!compact && <span style={{ fontSize: 9, color: COLORS.textMuted, fontWeight: 500 }}>M</span>}
    {[1, 2, 3, 4, 5].map((i) => (
      <div
        key={i}
        style={{
          width: compact ? 8 : 12,
          height: 3,
          borderRadius: 1.5,
          background: i <= level ? COLORS.accent : COLORS.cardBorder,
        }}
      />
    ))}
  </div>
);

// --- Score Badge (Sorare-style) ---
const ScoreBadge = ({ value, label, size = "normal" }) => {
  const color = value >= 70 ? "#4ADE80" : value >= 50 ? "#FBBF24" : value >= 30 ? "#FB923C" : "#F87171";
  const bg = value >= 70 ? "#4ADE8022" : value >= 50 ? "#FBBF2422" : value >= 30 ? "#FB923C22" : "#F8717122";
  const w = size === "small" ? 28 : 34;
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          width: w,
          height: w,
          borderRadius: 6,
          background: bg,
          border: `1.5px solid ${color}44`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size === "small" ? 11 : 13,
          fontWeight: 700,
          color,
        }}
      >
        {value}
      </div>
      {label && <div style={{ fontSize: 8, color: COLORS.textMuted, marginTop: 2, fontWeight: 500 }}>{label}</div>}
    </div>
  );
};

// --- Trend Arrow ---
const Trend = ({ value, suffix = "%" }) => (
  <span style={{ fontSize: 12, fontWeight: 600, color: value > 0 ? COLORS.positive : value < 0 ? COLORS.negative : COLORS.neutral }}>
    {value > 0 ? "+" : ""}{value}{suffix}
  </span>
);

// --- Action Button ---
const Btn = ({ label, primary, small }) => (
  <button
    style={{
      padding: small ? "5px 12px" : "7px 16px",
      borderRadius: 8,
      border: primary ? "none" : `1px solid ${COLORS.cardBorder}`,
      background: primary ? COLORS.accent : "transparent",
      color: primary ? "#0A0A0A" : COLORS.textSecondary,
      fontSize: small ? 11 : 12,
      fontWeight: 700,
      cursor: "pointer",
    }}
  >
    {label}
  </button>
);

// --- Card Wrapper ---
const PlayerCard = ({ children, rarity, owned, noPad }) => (
  <div
    style={{
      background: COLORS.card,
      borderRadius: 12,
      border: `1px solid ${owned ? (RARITY_BORDER[rarity] || COLORS.cardBorder) + "33" : COLORS.cardBorder}`,
      padding: noPad ? 0 : "12px 14px",
      position: "relative",
    }}
  >
    {owned && (
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          borderRadius: "12px 12px 0 0",
          background: `linear-gradient(90deg, ${RARITY_BORDER[rarity]}66, transparent)`,
        }}
      />
    )}
    {children}
  </div>
);

// ============================================================
// CONTEXT: MARKT KAUFEN (Alle Spieler / IPO)
// ============================================================
const MarketBuyRow = ({ p }) => (
  <PlayerCard rarity={p.rarity} owned={false}>
    <div style={{ display: "flex", alignItems: "center" }}>
      <PlayerIdentity player={p} size="standard" />
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0, marginLeft: 8 }}>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.accent }}>{p.price} <span style={{ fontSize: 10, fontWeight: 500, color: COLORS.textMuted }}>BSD</span></div>
          <Trend value={p.trend7d} />
        </div>
      </div>
    </div>
  </PlayerCard>
);

// ============================================================
// CONTEXT: PORTFOLIO (Meine DPCs)
// ============================================================
const PortfolioRow = ({ p }) => (
  <PlayerCard rarity={p.rarity} owned>
    <div style={{ display: "flex", alignItems: "center" }}>
      <PlayerIdentity player={p} size="standard" />
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0, marginLeft: 8 }}>
        <Mastery level={p.mastery} />
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: p.pnl >= 0 ? COLORS.positive : COLORS.negative }}>
            {p.pnl >= 0 ? "+" : ""}{p.pnl} BSD
          </div>
          <div style={{ fontSize: 10, color: COLORS.textMuted }}>{p.price} BSD</div>
        </div>
      </div>
    </div>
  </PlayerCard>
);

// ============================================================
// CONTEXT: MANAGER (Fantasy Lineup Aufstellen)
// ============================================================
const ManagerRow = ({ p }) => (
  <PlayerCard rarity={p.rarity} owned={p.owned}>
    <div style={{ display: "flex", alignItems: "center" }}>
      <PlayerIdentity player={p} size="standard" />
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginLeft: 8 }}>
        <div style={{ display: "flex", gap: 4 }}>
          <ScoreBadge value={p.l5} label="L5" size="small" />
          <ScoreBadge value={p.l10} label="L10" size="small" />
        </div>
        {p.owned && (
          <div style={{ fontSize: 9, color: COLORS.accent, fontWeight: 600, textAlign: "center" }}>
            ×{p.boost}
          </div>
        )}
      </div>
    </div>
  </PlayerCard>
);

// ============================================================
// CONTEXT: IPO Card
// ============================================================
const IpoCard = ({ p }) => (
  <PlayerCard rarity={p.rarity} owned={false}>
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
      <PlayerIdentity player={p} size="standard" />
      <span style={{ fontSize: 9, fontWeight: 700, color: "#FBBF24", background: "#FBBF2422", padding: "2px 6px", borderRadius: 4, flexShrink: 0 }}>
        IPO
      </span>
    </div>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, paddingTop: 8, borderTop: `1px solid ${COLORS.cardBorder}` }}>
      <div style={{ display: "flex", gap: 16 }}>
        <Val label="Preis" value={`${p.price}`} sub="BSD" color={COLORS.accent} />
        <Val label="Supply" value={`${p.supply}`} sub={`/${p.totalSupply}`} />
      </div>
      <Btn label="Kaufen" primary small />
    </div>
  </PlayerCard>
);

// ============================================================
// CONTEXT: Ergebnis (Nach dem Spiel)
// ============================================================
const ResultRow = ({ p }) => (
  <PlayerCard rarity={p.rarity} owned={p.owned}>
    <div style={{ display: "flex", alignItems: "center" }}>
      <PlayerIdentity player={p} size="standard" />
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, marginLeft: 8 }}>
        <div style={{ display: "flex", gap: 3 }}>
          {p.goals > 0 && <span style={{ fontSize: 11 }}>⚽{p.goals > 1 ? `×${p.goals}` : ""}</span>}
          {p.assists > 0 && <span style={{ fontSize: 11 }}>🅰️{p.assists > 1 ? `×${p.assists}` : ""}</span>}
        </div>
        <ScoreBadge value={p.rating} size="small" />
        <Val value={`${p.fantasyPts}`} sub="Pkt" align="right" />
      </div>
    </div>
  </PlayerCard>
);

// ============================================================
// SAMPLE DATA
// ============================================================

const PLAYERS = {
  vinko: { name: "Vinko Soldo", initials: "VS", position: "DEF", club: "Pendikspor", clubShort: "PEN", age: 23, rarity: "Rare", owned: true, mastery: 3, price: 525, trend7d: 5.8, pnl: 50, l5: 20, l10: 15, boost: 1.5, supply: 23, totalSupply: 80, goals: 0, assists: 1, rating: 72, fantasyPts: 8 },
  deniz: { name: "Deniz Dilmen", initials: "DD", position: "GK", club: "Pendikspor", clubShort: "PEN", age: 21, rarity: "Rare", owned: true, mastery: 2, price: 700, trend7d: 0, pnl: 0, l5: 13, l10: 15, boost: 1.3, supply: 45, totalSupply: 80, goals: 0, assists: 0, rating: 68, fantasyPts: 5 },
  yigit: { name: "Yiğit Fidan", initials: "YF", position: "DEF", club: "Pendikspor", clubShort: "PEN", age: 19, rarity: "Legendary", owned: true, mastery: 1, price: 700, trend7d: 0, pnl: 0, l5: 3, l10: 6, boost: 1.3, supply: 12, totalSupply: 30, goals: 0, assists: 0, rating: 58, fantasyPts: 3 },
  isa: { name: "İsa Doğan", initials: "ID", position: "GK", club: "İstanbulspor", clubShort: "IST", age: 20, rarity: "Common", owned: true, mastery: 1, price: 500, trend7d: 0, pnl: 0, l5: 20, l10: 15, boost: 1.3, supply: 60, totalSupply: 100, goals: 0, assists: 0, rating: 65, fantasyPts: 4 },
  murat: { name: "Murat Eser", initials: "ME", position: "GK", club: "Adana Demirspor", clubShort: "ADM", age: 20, rarity: "Common", owned: false, mastery: 0, price: 100, trend7d: 0, pnl: 0, l5: 0, l10: 0, boost: 0, supply: 90, totalSupply: 100, goals: 0, assists: 0, rating: 0, fantasyPts: 0 },
  eren: { name: "Eren Fidan", initials: "EF", position: "GK", club: "Adana Demirspor", clubShort: "ADM", age: 16, rarity: "Epic", owned: false, mastery: 0, price: 100, trend7d: 0, pnl: 0, l5: 0, l10: 0, boost: 0, supply: 40, totalSupply: 50, goals: 0, assists: 0, rating: 0, fantasyPts: 0 },
  ivan: { name: "Ivan Cedric", initials: "IC", position: "ATT", club: "Van Spor FK", clubShort: "VAN", age: 23, rarity: "Common", owned: false, mastery: 0, price: 455, trend7d: 0.8, pnl: 0, l5: 87, l10: 73, boost: 0, supply: 70, totalSupply: 100, goals: 2, assists: 1, rating: 81, fantasyPts: 16 },
  ahmet: { name: "Ahmet Arda Birinci", initials: "AB", position: "ATT", club: "Adana Demirspor", clubShort: "ADM", age: 20, rarity: "Rare", owned: false, mastery: 0, price: 100, trend7d: 0, pnl: 0, l5: 73, l10: 65, boost: 0, supply: 55, totalSupply: 80, goals: 1, assists: 0, rating: 73, fantasyPts: 10 },
};

const P = Object.values(PLAYERS);

// ============================================================
// MAIN APP
// ============================================================

export default function App() {
  const [tab, setTab] = useState("problems");

  const tabs = [
    { id: "problems", label: "Probleme" },
    { id: "market", label: "Markt: Kaufen" },
    { id: "portfolio", label: "Portfolio" },
    { id: "manager", label: "Manager" },
    { id: "ipo", label: "IPO" },
    { id: "results", label: "Ergebnis" },
    { id: "rules", label: "Regeln" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', maxWidth: 420, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ background: COLORS.card, borderBottom: `1px solid ${COLORS.cardBorder}`, padding: "14px 16px 0" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, marginBottom: 2 }}>
          Player Card Redesign
        </div>
        <div style={{ fontSize: 11, color: COLORS.textSecondary, marginBottom: 12 }}>
          Einheitliches System für alle Spieler-Darstellungen
        </div>
        <div style={{ display: "flex", gap: 0, overflowX: "auto", paddingBottom: 0, marginLeft: -4, marginRight: -4 }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "8px 12px",
                fontSize: 11,
                fontWeight: 600,
                color: tab === t.id ? COLORS.accent : COLORS.textMuted,
                background: "none",
                border: "none",
                borderBottom: tab === t.id ? `2px solid ${COLORS.accent}` : "2px solid transparent",
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {tab === "problems" && <ProblemAnalysis />}

      {tab === "market" && (
        <div style={{ padding: 16 }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>Markt: Alle Spieler</div>
            <div style={{ fontSize: 11, color: COLORS.textSecondary, marginTop: 2 }}>
              User-Frage: "Was kostet der Spieler, lohnt sich der Kauf?"
            </div>
            <div style={{ fontSize: 10, color: COLORS.accent, marginTop: 4 }}>
              KPIs: Preis + 7-Tage-Trend · Action: Kaufen (bei Tap)
            </div>
          </div>

          <div style={{ fontSize: 10, color: COLORS.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
            Adana Demirspor — 24 Spieler
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[PLAYERS.murat, PLAYERS.eren, PLAYERS.ahmet].map((p, i) => (
              <MarketBuyRow key={i} p={p} />
            ))}
          </div>

          <div style={{ fontSize: 10, color: COLORS.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 16, marginBottom: 8 }}>
            Van Spor FK — 22 Spieler
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <MarketBuyRow p={PLAYERS.ivan} />
          </div>

          {/* What changed */}
          <div style={{ marginTop: 20, background: COLORS.surface, borderRadius: 10, padding: 12, borderLeft: `3px solid ${COLORS.accent}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.accent, marginBottom: 6 }}>Was ist anders vs. dein aktueller Screen?</div>
            <div style={{ fontSize: 11, color: COLORS.textSecondary, lineHeight: 1.6 }}>
              ✅ Name IMMER voll sichtbar (nie abgeschnitten)<br/>
              ✅ Position-Badge immer an gleicher Stelle (Zeile 2, links)<br/>
              ✅ NUR 2 KPIs: Preis + Trend (mehr braucht man zum Kaufen nicht)<br/>
              ✅ Club + Alter in Zeile 2 integriert (spart Platz)<br/>
              ✅ Kein "Floor" (irrelevant beim Kauf), kein LS-Score (gehört in Fantasy)
            </div>
          </div>
        </div>
      )}

      {tab === "portfolio" && (
        <div style={{ padding: 16 }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>Portfolio: Meine DPCs</div>
            <div style={{ fontSize: 11, color: COLORS.textSecondary, marginTop: 2 }}>
              User-Frage: "Wie steht mein Investment? Halten oder verkaufen?"
            </div>
            <div style={{ fontSize: 10, color: COLORS.accent, marginTop: 4 }}>
              KPIs: P&L (Gewinn/Verlust) + Mastery-Fortschritt + aktueller Preis
            </div>
          </div>

          {/* Summary */}
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <div style={{ flex: 1, background: COLORS.card, borderRadius: 10, padding: "10px 12px", border: `1px solid ${COLORS.cardBorder}` }}>
              <div style={{ fontSize: 9, color: COLORS.textMuted, fontWeight: 500, textTransform: "uppercase" }}>Portfolio-Wert</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.text, marginTop: 2 }}>2.950 <span style={{ fontSize: 11, color: COLORS.textMuted }}>BSD</span></div>
            </div>
            <div style={{ flex: 1, background: COLORS.card, borderRadius: 10, padding: "10px 12px", border: `1px solid ${COLORS.cardBorder}` }}>
              <div style={{ fontSize: 9, color: COLORS.textMuted, fontWeight: 500, textTransform: "uppercase" }}>Gesamt P&L</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.positive, marginTop: 2 }}>+50 <span style={{ fontSize: 11, color: COLORS.textMuted }}>BSD</span></div>
            </div>
          </div>

          <div style={{ fontSize: 10, color: COLORS.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
            Pendikspor (3)
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[PLAYERS.vinko, PLAYERS.deniz, PLAYERS.yigit].map((p, i) => (
              <PortfolioRow key={i} p={p} />
            ))}
          </div>

          <div style={{ fontSize: 10, color: COLORS.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 16, marginBottom: 8 }}>
            İstanbulspor (1)
          </div>
          <PortfolioRow p={PLAYERS.isa} />

          <div style={{ marginTop: 20, background: COLORS.surface, borderRadius: 10, padding: 12, borderLeft: `3px solid ${COLORS.accent}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.accent, marginBottom: 6 }}>Was ist anders vs. dein aktueller Portfolio-Screen?</div>
            <div style={{ fontSize: 11, color: COLORS.textSecondary, lineHeight: 1.6 }}>
              ✅ Name VOLL sichtbar ("Vinko Soldo" statt "Vinko Sol...")<br/>
              ✅ Mastery als klare Bar (statt unklare farbige Punkte)<br/>
              ✅ P&L prominent in Grün/Rot (DAS will der User hier sehen)<br/>
              ✅ "Floor" entfernt (ist Markt-Info, gehört nicht ins Portfolio)<br/>
              ✅ Position-Badge identisch mit Markt-Screen (Konsistenz!)
            </div>
          </div>
        </div>
      )}

      {tab === "manager" && (
        <div style={{ padding: 16 }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>Manager: Fantasy Aufstellung</div>
            <div style={{ fontSize: 11, color: COLORS.textSecondary, marginTop: 2 }}>
              User-Frage: "Wer performt gut? Wen stelle ich auf?"
            </div>
            <div style={{ fontSize: 10, color: COLORS.accent, marginTop: 4 }}>
              KPIs: L5/L10 Score-Badges + DPC-Boost
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[PLAYERS.ivan, PLAYERS.ahmet, PLAYERS.vinko, PLAYERS.deniz].map((p, i) => (
              <ManagerRow key={i} p={p} />
            ))}
          </div>

          <div style={{ marginTop: 20, background: COLORS.surface, borderRadius: 10, padding: 12, borderLeft: `3px solid ${COLORS.accent}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.accent, marginBottom: 6 }}>Was ist anders vs. dein aktueller Manager-Screen?</div>
            <div style={{ fontSize: 11, color: COLORS.textSecondary, lineHeight: 1.6 }}>
              ✅ Identität-Block IDENTISCH mit Markt und Portfolio<br/>
              ✅ L5/L10 als farbige Badges (Sorare-Style, den du magst!)<br/>
              ✅ DPC-Boost klar angezeigt (×1.3 / ×1.5)<br/>
              ✅ Kein Preis hier (irrelevant für Fantasy-Aufstellung)<br/>
              ✅ Keine komprimierten Zahlenreihen mehr
            </div>
          </div>
        </div>
      )}

      {tab === "ipo" && (
        <div style={{ padding: 16 }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>Live IPOs</div>
            <div style={{ fontSize: 11, color: COLORS.textSecondary, marginTop: 2 }}>
              User-Frage: "Ist dieser neue Spieler den Kauf wert?"
            </div>
            <div style={{ fontSize: 10, color: COLORS.accent, marginTop: 4 }}>
              KPIs: IPO-Preis + Supply · Action: Kaufen
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[PLAYERS.ivan, PLAYERS.ahmet, PLAYERS.murat].map((p, i) => (
              <IpoCard key={i} p={{ ...p, supply: p.supply, totalSupply: p.totalSupply }} />
            ))}
          </div>

          <div style={{ marginTop: 20, background: COLORS.surface, borderRadius: 10, padding: 12, borderLeft: `3px solid ${COLORS.accent}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.accent, marginBottom: 6 }}>Was ist anders vs. dein aktueller IPO-Screen?</div>
            <div style={{ fontSize: 11, color: COLORS.textSecondary, lineHeight: 1.6 }}>
              ✅ Gleiche Identität wie überall (User erkennt Layout sofort)<br/>
              ✅ IPO-Badge oben rechts (nicht als Teil des Namens)<br/>
              ✅ Preis + Supply als klare KPIs mit Labels<br/>
              ✅ Kaufen-Button direkt auf der Karte<br/>
              ✅ Kein horizontal-scroll nötig (Cards untereinander)
            </div>
          </div>
        </div>
      )}

      {tab === "results" && (
        <div style={{ padding: 16 }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>Spieltag Ergebnis</div>
            <div style={{ fontSize: 11, color: COLORS.textSecondary, marginTop: 2 }}>
              User-Frage: "Wie haben meine Spieler performt?"
            </div>
            <div style={{ fontSize: 10, color: COLORS.accent, marginTop: 4 }}>
              KPIs: Events (⚽🅰️) + Rating-Badge + Fantasy-Punkte
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[PLAYERS.ivan, PLAYERS.ahmet, PLAYERS.vinko, PLAYERS.deniz].map((p, i) => (
              <ResultRow key={i} p={p} />
            ))}
          </div>

          <div style={{ marginTop: 20, background: COLORS.surface, borderRadius: 10, padding: 12, borderLeft: `3px solid ${COLORS.accent}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.accent, marginBottom: 6 }}>Kontext-gerechte KPIs</div>
            <div style={{ fontSize: 11, color: COLORS.textSecondary, lineHeight: 1.6 }}>
              ✅ Rating als farbcodiertes Badge (Sorare-Style)<br/>
              ✅ Tor/Assist Icons sofort scannbar<br/>
              ✅ Fantasy-Punkte rechts (was zählt am Ende)<br/>
              ✅ KEIN Preis (hier irrelevant, gehört in den Markt)
            </div>
          </div>
        </div>
      )}

      {tab === "rules" && (
        <div style={{ padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 12 }}>
            Die 8 Regeln des Player Card Systems
          </div>
          {[
            { n: "1", title: "Identität ist heilig", desc: "Foto · Name · Position · Club sind IMMER da, IMMER an gleicher Stelle, IMMER in gleicher Reihenfolge. Das ist der Anker." },
            { n: "2", title: "Name wird nie abgeschnitten", desc: "Eher Club kürzen (\"PEN\") oder Alter weglassen als den Namen. \"Vinko Sol...\" darf nie passieren." },
            { n: "3", title: "Max 2-3 KPIs pro Kontext", desc: "Markt: Preis + Trend. Portfolio: P&L + Mastery. Manager: L5/L10. Ergebnis: Events + Rating + Punkte. Nie mehr." },
            { n: "4", title: "Richtige Daten zum richtigen Zweck", desc: "Kein Preis im Manager. Kein LS-Score im Markt. Keine Mastery in der Suche. Jeder Kontext zeigt NUR was der User JETZT braucht." },
            { n: "5", title: "Farbe = Information", desc: "Position immer farbcodiert (GK gelb, DEF blau, MID grün, ATT rot). Trend immer grün/rot. Rating immer farbiges Badge. Nie Farbe ohne Bedeutung." },
            { n: "6", title: "DPC-Besitz sichtbar", desc: "Besitzt der User die DPC? → Rarity-Border (blau/lila/gold) + Top-Gradient. Der User sieht sofort: das ist MEIN Spieler." },
            { n: "7", title: "2 Formate, nicht 5", desc: "Row (für Listen, Browse, Auswahl) und Card (für IPO, Entscheidungen mit Action-Button). Keine weiteren Varianten." },
            { n: "8", title: "1 Action max pro Darstellung", desc: "Kaufen ODER Aufstellen ODER Predicten. Nie 3 Buttons auf einer Karte. Bei Tap → Detail-Seite für alles andere." },
          ].map((r) => (
            <div
              key={r.n}
              style={{
                display: "flex",
                gap: 12,
                marginBottom: 14,
                padding: "10px 12px",
                background: COLORS.card,
                borderRadius: 10,
                border: `1px solid ${COLORS.cardBorder}`,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: `${COLORS.accent}15`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 700,
                  color: COLORS.accent,
                  flexShrink: 0,
                }}
              >
                {r.n}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.text, marginBottom: 3 }}>{r.title}</div>
                <div style={{ fontSize: 11, color: COLORS.textSecondary, lineHeight: 1.5 }}>{r.desc}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
