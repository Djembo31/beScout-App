-- Event Fee Configuration per Type
-- Configurable via BeScout Admin panel

CREATE TABLE IF NOT EXISTS public.event_fee_config (
  event_type TEXT PRIMARY KEY,
  platform_pct SMALLINT NOT NULL DEFAULT 500,     -- basis points (500 = 5.00%)
  beneficiary_pct SMALLINT NOT NULL DEFAULT 0,    -- club/creator cut in bps
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id),

  CONSTRAINT chk_event_type CHECK (event_type IN ('bescout', 'club', 'sponsor', 'special', 'creator')),
  CONSTRAINT chk_platform_pct CHECK (platform_pct >= 0 AND platform_pct <= 5000),
  CONSTRAINT chk_beneficiary_pct CHECK (beneficiary_pct >= 0 AND beneficiary_pct <= 5000),
  CONSTRAINT chk_total_pct CHECK (platform_pct + beneficiary_pct <= 10000)
);

-- Seed defaults (matching design doc)
INSERT INTO public.event_fee_config (event_type, platform_pct, beneficiary_pct) VALUES
  ('bescout',  500,   0),   -- 5% platform, 0% club     = 95% prize pool
  ('club',     500, 500),   -- 5% platform, 5% club     = 90% prize pool
  ('sponsor',  500, 500),   -- 5% platform, 5% club     = 90% prize pool
  ('special',  500,   0),   -- 5% platform, 0%          = 95% prize pool
  ('creator',  500, 500)    -- 5% platform, 5% creator  = 90% prize pool
ON CONFLICT (event_type) DO NOTHING;

-- RLS: Read for authenticated, write for admin only
ALTER TABLE public.event_fee_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read fee config"
  ON public.event_fee_config FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Only admins can update fee config"
  ON public.event_fee_config FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND top_role = 'Admin'));

-- Helper: tier_rank for subscription gate enforcement
CREATE OR REPLACE FUNCTION public.tier_rank(p_tier TEXT)
RETURNS INT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_tier
    WHEN 'bronze' THEN 1
    WHEN 'silber' THEN 2
    WHEN 'gold'   THEN 3
    ELSE 0
  END;
$$;
