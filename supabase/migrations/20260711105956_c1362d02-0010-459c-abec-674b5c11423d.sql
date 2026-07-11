
CREATE TABLE public.files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  bucket text NOT NULL DEFAULT 'project-assets',
  path text NOT NULL,
  name text NOT NULL,
  size bigint NOT NULL DEFAULT 0,
  mime text,
  folder text,
  tag text,
  related_type text,
  related_id uuid,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, bucket, path)
);

CREATE INDEX idx_files_tenant_created ON public.files (tenant_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_files_tenant_folder ON public.files (tenant_id, folder) WHERE deleted_at IS NULL;
CREATE INDEX idx_files_related ON public.files (tenant_id, related_type, related_id) WHERE deleted_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.files TO authenticated;
GRANT ALL ON public.files TO service_role;

ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "files select tenant members" ON public.files
  FOR SELECT TO authenticated
  USING (private.is_tenant_member(tenant_id));

CREATE POLICY "files insert tenant staff" ON public.files
  FOR INSERT TO authenticated
  WITH CHECK (private.has_tenant_role_in(tenant_id, ARRAY['owner','admin','manager','agent']::public.app_role[]));

CREATE POLICY "files update tenant staff" ON public.files
  FOR UPDATE TO authenticated
  USING (private.has_tenant_role_in(tenant_id, ARRAY['owner','admin','manager','agent']::public.app_role[]))
  WITH CHECK (private.has_tenant_role_in(tenant_id, ARRAY['owner','admin','manager','agent']::public.app_role[]));

CREATE POLICY "files delete tenant admins" ON public.files
  FOR DELETE TO authenticated
  USING (private.has_tenant_role_in(tenant_id, ARRAY['owner','admin','manager']::public.app_role[]));

CREATE TRIGGER set_files_updated_at
  BEFORE UPDATE ON public.files
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
