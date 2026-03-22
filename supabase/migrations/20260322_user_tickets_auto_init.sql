-- Auto-create user_tickets row when a new profile is created
-- Prevents "NOT FOUND" errors in ticket RPCs for new users

CREATE OR REPLACE FUNCTION public.init_user_tickets()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_tickets (user_id, balance, earned_total, spent_total)
    VALUES (NEW.id, 0, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Fire after profile insert (new user registration)
DROP TRIGGER IF EXISTS trg_init_user_tickets ON public.profiles;
CREATE TRIGGER trg_init_user_tickets
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.init_user_tickets();

-- Backfill: create user_tickets for existing users who don't have one
INSERT INTO public.user_tickets (user_id, balance, earned_total, spent_total)
  SELECT id, 0, 0, 0 FROM public.profiles
  WHERE id NOT IN (SELECT user_id FROM public.user_tickets)
  ON CONFLICT (user_id) DO NOTHING;
