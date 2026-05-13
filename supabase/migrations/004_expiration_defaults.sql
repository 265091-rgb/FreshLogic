-- FreshLogic — Expiration Defaults + Recipe Ingredients
-- Run in Supabase SQL Editor after 003_serving_size.sql

-- ============================================================
-- TABLES
-- ============================================================

-- Shared lookup table: default shelf-life by category
CREATE TABLE IF NOT EXISTS public.expiration_defaults (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category    TEXT NOT NULL UNIQUE,
  days_fresh  INT  NOT NULL CHECK (days_fresh > 0),
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Normalised recipe ingredients (complements recipes.ingredients JSONB)
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id    UUID REFERENCES public.recipes(id) ON DELETE CASCADE NOT NULL,
  name         TEXT NOT NULL,
  quantity     DECIMAL(8,2),
  unit         TEXT,
  in_inventory BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe
  ON public.recipe_ingredients(recipe_id);

-- ============================================================
-- ROW-LEVEL SECURITY
-- ============================================================

ALTER TABLE public.expiration_defaults  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients   ENABLE ROW LEVEL SECURITY;

-- expiration_defaults: shared read-only data — any authenticated user can read
CREATE POLICY "Authenticated users can read expiration defaults"
  ON public.expiration_defaults
  FOR SELECT
  TO authenticated
  USING (true);

-- recipe_ingredients: scoped to the recipe owner
CREATE POLICY "Users can read own recipe ingredients"
  ON public.recipe_ingredients
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.recipes
      WHERE recipes.id  = recipe_ingredients.recipe_id
        AND recipes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own recipe ingredients"
  ON public.recipe_ingredients
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.recipes
      WHERE recipes.id  = recipe_ingredients.recipe_id
        AND recipes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own recipe ingredients"
  ON public.recipe_ingredients
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.recipes
      WHERE recipes.id  = recipe_ingredients.recipe_id
        AND recipes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own recipe ingredients"
  ON public.recipe_ingredients
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.recipes
      WHERE recipes.id  = recipe_ingredients.recipe_id
        AND recipes.user_id = auth.uid()
    )
  );
