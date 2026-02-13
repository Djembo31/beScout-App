-- ============================================
-- BeScout Pilot Schema
-- ============================================
-- Voraussetzung: profiles-Tabelle existiert bereits
-- Ausfuehren im Supabase SQL Editor (Dashboard > SQL Editor)
--
-- TIPP: Falls ein Fehler auftritt, kopiere Block fuer Block
-- (jeder Block ist durch Kommentare getrennt)
-- ============================================


-- ============================================
-- 1. PLAYERS (25 Sakaryaspor-Spieler)
-- ============================================
CREATE TABLE public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  position TEXT NOT NULL CHECK (position IN ('GK', 'DEF', 'MID', 'ATT')),
  club TEXT NOT NULL DEFAULT 'Sakaryaspor',
  age INT,
  shirt_number INT,
  nationality TEXT,
  image_url TEXT,
  matches INT NOT NULL DEFAULT 0,
  goals INT NOT NULL DEFAULT 0,
  assists INT NOT NULL DEFAULT 0,
  clean_sheets INT NOT NULL DEFAULT 0,
  perf_l5 NUMERIC(5,2) NOT NULL DEFAULT 50.00,
  perf_l15 NUMERIC(5,2) NOT NULL DEFAULT 50.00,
  perf_season NUMERIC(5,2) NOT NULL DEFAULT 50.00,
  dpc_total INT NOT NULL DEFAULT 10000,
  dpc_available INT NOT NULL DEFAULT 5000,
  floor_price BIGINT NOT NULL DEFAULT 10000,
  last_price BIGINT NOT NULL DEFAULT 10000,
  price_change_24h NUMERIC(8,4) NOT NULL DEFAULT 0,
  volume_24h BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- Jeder kann Spieler sehen
CREATE POLICY "players_select" ON public.players
  FOR SELECT USING (true);

-- Nur Service-Role kann Spieler aendern (Admin)
-- (kein INSERT/UPDATE Policy = nur service_role kommt durch)


-- ============================================
-- 2. WALLETS (BSD Guthaben, 1 pro User)
-- ============================================
CREATE TABLE public.wallets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance BIGINT NOT NULL DEFAULT 1000000,
  locked_balance BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT positive_balance CHECK (balance >= 0),
  CONSTRAINT positive_locked CHECK (locked_balance >= 0)
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- User sieht nur eigenes Wallet
CREATE POLICY "wallets_select" ON public.wallets
  FOR SELECT USING (auth.uid() = user_id);

-- User kann eigenes Wallet updaten (fuer Trades)
CREATE POLICY "wallets_update" ON public.wallets
  FOR UPDATE USING (auth.uid() = user_id);

-- Insert nur via Trigger (automatisch bei Registrierung)
CREATE POLICY "wallets_insert" ON public.wallets
  FOR INSERT WITH CHECK (auth.uid() = user_id);


-- ============================================
-- 3. HOLDINGS (wer hat welche DPCs)
-- ============================================
CREATE TABLE public.holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 0,
  avg_buy_price BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, player_id)
);

CREATE INDEX idx_holdings_user ON public.holdings(user_id) WHERE quantity > 0;
CREATE INDEX idx_holdings_player ON public.holdings(player_id);

ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;

-- User sieht nur eigene Holdings
CREATE POLICY "holdings_select" ON public.holdings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "holdings_insert" ON public.holdings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "holdings_update" ON public.holdings
  FOR UPDATE USING (auth.uid() = user_id);


-- ============================================
-- 4. ORDERS (Marktplatz Kauf-/Verkaufsorders)
-- ============================================
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  price BIGINT NOT NULL,
  quantity INT NOT NULL,
  filled_qty INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'partial', 'filled', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_orders_matching ON public.orders(player_id, side, price, created_at)
  WHERE status IN ('open', 'partial');
CREATE INDEX idx_orders_user ON public.orders(user_id, status);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- User sieht alle offenen Orders (Orderbook ist oeffentlich)
CREATE POLICY "orders_select" ON public.orders
  FOR SELECT USING (true);

-- User kann nur eigene Orders erstellen
CREATE POLICY "orders_insert" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User kann nur eigene Orders aendern (cancel)
CREATE POLICY "orders_update" ON public.orders
  FOR UPDATE USING (auth.uid() = user_id);


-- ============================================
-- 5. TRADES (Append-only Log)
-- ============================================
CREATE TABLE public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.players(id),
  buyer_id UUID NOT NULL REFERENCES auth.users(id),
  seller_id UUID NOT NULL REFERENCES auth.users(id),
  buy_order_id UUID REFERENCES public.orders(id),
  sell_order_id UUID REFERENCES public.orders(id),
  price BIGINT NOT NULL,
  quantity INT NOT NULL,
  platform_fee BIGINT NOT NULL DEFAULT 0,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_trades_player ON public.trades(player_id, executed_at DESC);
CREATE INDEX idx_trades_buyer ON public.trades(buyer_id, executed_at DESC);
CREATE INDEX idx_trades_seller ON public.trades(seller_id, executed_at DESC);

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- User sieht eigene Trades + oeffentliche Preis-History
CREATE POLICY "trades_select" ON public.trades
  FOR SELECT USING (true);

-- Insert nur via Service (kein direkter User-Insert)
-- Trades werden durch die Trading-Funktion erstellt


-- ============================================
-- 6. EVENTS (Fantasy Turniere)
-- ============================================
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'bescout' CHECK (type IN ('bescout', 'club', 'sponsor', 'special')),
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'registering', 'late-reg', 'running', 'scoring', 'ended')),
  format TEXT NOT NULL DEFAULT '6er',
  gameweek INT,
  entry_fee BIGINT NOT NULL DEFAULT 0,
  prize_pool BIGINT NOT NULL DEFAULT 0,
  max_entries INT,
  current_entries INT NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ NOT NULL,
  locks_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  scored_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_status ON public.events(status, starts_at);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Jeder kann Events sehen
CREATE POLICY "events_select" ON public.events
  FOR SELECT USING (true);


-- ============================================
-- 7. LINEUPS (User-Aufstellungen pro Event)
-- ============================================
CREATE TABLE public.lineups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot_gk UUID REFERENCES public.players(id),
  slot_def1 UUID REFERENCES public.players(id),
  slot_def2 UUID REFERENCES public.players(id),
  slot_mid1 UUID REFERENCES public.players(id),
  slot_mid2 UUID REFERENCES public.players(id),
  slot_att UUID REFERENCES public.players(id),
  total_score NUMERIC(8,2),
  rank INT,
  reward_amount BIGINT NOT NULL DEFAULT 0,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(event_id, user_id)
);

CREATE INDEX idx_lineups_event_rank ON public.lineups(event_id, rank)
  WHERE rank IS NOT NULL;

ALTER TABLE public.lineups ENABLE ROW LEVEL SECURITY;

-- User sieht alle Lineups (Leaderboard ist oeffentlich)
CREATE POLICY "lineups_select" ON public.lineups
  FOR SELECT USING (true);

-- User kann nur eigene Lineups erstellen/aendern
CREATE POLICY "lineups_insert" ON public.lineups
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "lineups_update" ON public.lineups
  FOR UPDATE USING (auth.uid() = user_id);

-- User kann nur eigene Lineups loeschen (Abmelden vom Event)
CREATE POLICY "lineups_delete" ON public.lineups
  FOR DELETE USING (auth.uid() = user_id);


-- ============================================
-- 8. TRANSACTIONS (BSD Audit-Log, Append-only)
-- ============================================
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  type TEXT NOT NULL,
  amount BIGINT NOT NULL,
  balance_after BIGINT NOT NULL,
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_user ON public.transactions(user_id, created_at DESC);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- User sieht nur eigene Transaktionen
CREATE POLICY "transactions_select" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);


-- ============================================
-- 9. TRIGGERS
-- ============================================

-- Auto-Update updated_at (wiederverwendbar)
-- Falls die Funktion schon von profiles existiert, kein Fehler
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER players_updated_at
  BEFORE UPDATE ON public.players
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER holdings_updated_at
  BEFORE UPDATE ON public.holdings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- Auto-Wallet bei neuer User-Registrierung
CREATE OR REPLACE FUNCTION public.handle_new_user_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.wallets (user_id, balance)
  VALUES (NEW.id, 1000000)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created_wallet
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_wallet();


-- ============================================
-- 10. WALLET FUER BESTEHENDE USER NACHFUELLEN
-- ============================================
-- Falls schon User existieren die noch kein Wallet haben:
INSERT INTO public.wallets (user_id, balance)
SELECT id, 1000000
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.wallets)
ON CONFLICT (user_id) DO NOTHING;


-- ============================================
-- FERTIG! Schema bereit fuer Pilot.
-- ============================================
