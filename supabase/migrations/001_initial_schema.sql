-- FreshLogic Phase 1 — Initial Schema
-- Run this in your Supabase dashboard: SQL Editor → New query → paste → Run

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- 1. Users (extends auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. User Preferences
CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  dietary_preferences TEXT[],
  weight_goal TEXT,
  alert_time TIME DEFAULT '08:00:00',
  baseline_waste_percent INT DEFAULT 30,
  baseline_budget DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Devices (Raspberry Pi pairing)
CREATE TABLE public.devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  serial_number TEXT,
  status TEXT DEFAULT 'unpaired',
  pairing_secret_hash TEXT,
  pairing_expires_at TIMESTAMPTZ,
  paired_at TIMESTAMPTZ,
  last_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Inventory
CREATE TABLE public.inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  barcode TEXT,
  category TEXT NOT NULL,
  quantity DECIMAL(8,2) NOT NULL,
  unit TEXT NOT NULL,
  expiration_date DATE,
  status TEXT GENERATED ALWAYS AS (
    CASE
      WHEN expiration_date IS NULL THEN 'fresh'
      WHEN expiration_date < CURRENT_DATE THEN 'expired'
      WHEN expiration_date <= CURRENT_DATE + INTERVAL '3 days' THEN 'expiring_soon'
      ELSE 'fresh'
    END
  ) STORED,
  added_date TIMESTAMPTZ DEFAULT NOW(),
  last_modified TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inventory_user_expiry ON public.inventory(user_id, expiration_date);
CREATE INDEX idx_inventory_status ON public.inventory(user_id, status);

-- 5. Recipes
CREATE TABLE public.recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  meal_type TEXT,
  cook_time INT,
  servings INT,
  ingredients JSONB,
  instructions TEXT[],
  nutrition JSONB,
  favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Shopping List
CREATE TABLE public.shopping_list (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  quantity DECIMAL(8,2),
  unit TEXT,
  checked BOOLEAN DEFAULT FALSE,
  added_from TEXT,
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shopping_list_user_checked ON public.shopping_list(user_id, checked);

-- 7. Detections (camera captures from Raspberry Pi)
CREATE TABLE public.detections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID REFERENCES public.devices(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  detected_items JSONB,
  confirmed BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Stats (weekly aggregates)
CREATE TABLE public.stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  items_added INT DEFAULT 0,
  items_used INT DEFAULT 0,
  items_wasted INT DEFAULT 0,
  waste_percent INT GENERATED ALWAYS AS (
    CASE
      WHEN items_added > 0 THEN (items_wasted * 100 / items_added)
      ELSE 0
    END
  ) STORED,
  money_saved DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

-- ============================================================
-- ROW-LEVEL SECURITY
-- ============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stats ENABLE ROW LEVEL SECURITY;

-- Users
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- User Preferences
CREATE POLICY "Users can manage own preferences"
  ON public.user_preferences FOR ALL USING (auth.uid() = user_id);

-- Devices
CREATE POLICY "Users can view own devices"
  ON public.devices FOR SELECT USING (auth.uid() = user_id);

-- Inventory
CREATE POLICY "Users can view own inventory"
  ON public.inventory FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own inventory"
  ON public.inventory FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own inventory"
  ON public.inventory FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own inventory"
  ON public.inventory FOR DELETE USING (auth.uid() = user_id);

-- Recipes
CREATE POLICY "Users can manage own recipes"
  ON public.recipes FOR ALL USING (auth.uid() = user_id);

-- Shopping List
CREATE POLICY "Users can manage own shopping list"
  ON public.shopping_list FOR ALL USING (auth.uid() = user_id);

-- Detections
CREATE POLICY "Devices can insert detections"
  ON public.detections FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.devices
      WHERE devices.id = detections.device_id
        AND devices.user_id = detections.user_id
        AND devices.status = 'paired'
    )
  );
CREATE POLICY "Users can view own detections"
  ON public.detections FOR SELECT USING (auth.uid() = user_id);

-- Stats
CREATE POLICY "Users can view own stats"
  ON public.stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own stats"
  ON public.stats FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- DATABASE FUNCTIONS
-- ============================================================

-- Get items expiring within N days
CREATE OR REPLACE FUNCTION get_expiring_items(p_user_id UUID, p_days INT DEFAULT 3)
RETURNS TABLE(
  id UUID,
  name TEXT,
  quantity DECIMAL,
  unit TEXT,
  expiration_date DATE,
  days_until_expiry INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.name,
    i.quantity,
    i.unit,
    i.expiration_date,
    (i.expiration_date - CURRENT_DATE)::INT AS days_until_expiry
  FROM inventory i
  WHERE i.user_id = p_user_id
    AND i.expiration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + p_days
    AND i.quantity > 0
  ORDER BY i.expiration_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate weekly stats for a user
CREATE OR REPLACE FUNCTION calculate_weekly_stats(p_user_id UUID)
RETURNS TABLE(
  items_added INT,
  items_used INT,
  items_wasted INT,
  waste_percent INT,
  money_saved DECIMAL
) AS $$
DECLARE
  v_week_start DATE := DATE_TRUNC('week', CURRENT_DATE)::DATE;
  v_baseline_waste INT;
BEGIN
  SELECT COALESCE(baseline_waste_percent, 30) INTO v_baseline_waste
  FROM user_preferences
  WHERE user_id = p_user_id;

  RETURN QUERY
  SELECT
    COUNT(*)::INT AS items_added,
    COUNT(*) FILTER (WHERE quantity = 0 AND (expiration_date IS NULL OR expiration_date >= CURRENT_DATE))::INT AS items_used,
    COUNT(*) FILTER (WHERE quantity > 0 AND expiration_date < CURRENT_DATE)::INT AS items_wasted,
    CASE
      WHEN COUNT(*) > 0 THEN
        (COUNT(*) FILTER (WHERE quantity > 0 AND expiration_date < CURRENT_DATE) * 100 / COUNT(*))::INT
      ELSE 0
    END AS waste_percent,
    CASE
      WHEN COUNT(*) > 0 THEN
        ((v_baseline_waste - (COUNT(*) FILTER (WHERE quantity > 0 AND expiration_date < CURRENT_DATE) * 100 / COUNT(*))) *
         COUNT(*) * 5.00 / 100)::DECIMAL(10,2)
      ELSE 0.00
    END AS money_saved
  FROM inventory
  WHERE user_id = p_user_id
    AND added_date >= v_week_start;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup old data (run daily via pg_cron or Supabase scheduled functions)
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
  DELETE FROM inventory
  WHERE quantity = 0 AND last_modified < NOW() - INTERVAL '6 months';

  DELETE FROM detections
  WHERE timestamp < NOW() - INTERVAL '30 days';

  DELETE FROM shopping_list
  WHERE checked = TRUE AND created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
