CREATE TABLE public.tenant_credentials (
  tenant_id uuid NOT NULL,
  key text NOT NULL,
  ciphertext text NOT NULL,
  iv text NOT NULL,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, key)
);
GRANT ALL ON public.tenant_credentials TO service_role;
ALTER TABLE public.tenant_credentials ENABLE ROW LEVEL SECURITY;
-- Không có policy: chỉ máy chủ (service role) đọc/ghi được.