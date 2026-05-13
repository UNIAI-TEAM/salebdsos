ALTER TABLE public.pipeline_deals
  ADD COLUMN IF NOT EXISTS next_action text,
  ADD COLUMN IF NOT EXISTS next_action_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_pipeline_deals_tenant_stage
  ON public.pipeline_deals (tenant_id, stage_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_tenant_pos
  ON public.pipeline_stages (tenant_id, position) WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.ensure_default_pipeline_stages(_tenant uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _exists int;
BEGIN
  IF NOT public.is_tenant_member(_tenant) AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  SELECT COUNT(*) INTO _exists FROM public.pipeline_stages
    WHERE tenant_id = _tenant AND deleted_at IS NULL;
  IF _exists > 0 THEN RETURN; END IF;
  INSERT INTO public.pipeline_stages (tenant_id, name, position, win_probability) VALUES
    (_tenant, 'Mới', 0, 5),
    (_tenant, 'Đã liên hệ', 1, 15),
    (_tenant, 'Đang tư vấn', 2, 35),
    (_tenant, 'Đã báo giá', 3, 55),
    (_tenant, 'Đặt cọc', 4, 80),
    (_tenant, 'Thành công', 5, 100),
    (_tenant, 'Thất bại', 6, 0);
END $$;