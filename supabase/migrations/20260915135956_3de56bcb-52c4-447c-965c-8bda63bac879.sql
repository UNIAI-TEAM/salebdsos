CREATE OR REPLACE FUNCTION public.validate_appointment_project_tenant()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.project_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = NEW.project_id
      AND p.tenant_id = NEW.tenant_id
      AND p.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Appointment project must belong to the same tenant';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_appointment_project_tenant_trigger ON public.appointments;
CREATE TRIGGER validate_appointment_project_tenant_trigger
BEFORE INSERT OR UPDATE OF project_id, tenant_id ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.validate_appointment_project_tenant();