-- Add optional serving_size column to inventory.
-- serving_size is stored in the item's own unit (e.g. 0.0625 for 1 cup of a gallon jug).
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS serving_size DECIMAL(10,3);
