-- FreshLogic — Seed Data
-- Run in Supabase SQL Editor after 004_expiration_defaults.sql

-- ============================================================
-- expiration_defaults
-- Values match defaultExpiryDate() in src/services/barcode.service.ts
-- ============================================================

INSERT INTO public.expiration_defaults (category, days_fresh, description) VALUES
  ('produce',   4,   'Fresh fruits and vegetables'),
  ('dairy',     7,   'Milk, cheese, yogurt, butter, cream'),
  ('protein',   5,   'Raw meat, poultry, fish, and seafood'),
  ('grains',    180, 'Bread, rice, pasta, flour, and cereal'),
  ('beverages', 365, 'Juices, sodas, water, tea, and coffee'),
  ('other',     30,  'Pantry staples, canned goods, condiments')
ON CONFLICT (category) DO UPDATE
  SET days_fresh  = EXCLUDED.days_fresh,
      description = EXCLUDED.description;

-- ============================================================
-- recipes
-- NOTE: The recipes table requires a non-null user_id (it is
-- user-scoped data, not global shared data). Because of this,
-- pre-seeding recipe rows here is not possible without a real
-- authenticated user UUID.
--
-- To add starter/template recipes for a specific user, run:
--
--   INSERT INTO public.recipes
--     (user_id, name, meal_type, cook_time, servings,
--      ingredients, instructions, nutrition, favorite)
--   VALUES
--     ('<your-user-uuid>', 'Recipe Name', 'dinner', 30, 4,
--      '[{"name":"chicken","quantity":2,"unit":"lbs","in_inventory":false}]'::jsonb,
--      ARRAY['Step 1', 'Step 2'],
--      '{"calories":450,"protein":35,"carbs":20,"fat":15}'::jsonb,
--      false);
--
-- Alternatively, place JSON files under src/data/ and extend
-- this migration to read from them via a server-side seed script.
-- ============================================================
