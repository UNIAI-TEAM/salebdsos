ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS map_row integer,
  ADD COLUMN IF NOT EXISTS map_col integer;

COMMENT ON COLUMN public.products.map_row IS 'Hàng trên sơ đồ lô (trong cùng zone); NULL = chưa đặt vị trí';
COMMENT ON COLUMN public.products.map_col IS 'Cột trên sơ đồ lô (trong cùng zone); NULL = chưa đặt vị trí';

CREATE INDEX IF NOT EXISTS products_plot_map_idx
  ON public.products (project_id, zone, map_row, map_col)
  WHERE map_row IS NOT NULL AND map_col IS NOT NULL;