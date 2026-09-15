ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_appointments_project_starts
  ON public.appointments(project_id, starts_at ASC)
  WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_public_project_starts
  ON public.appointments(project_id, starts_at ASC)
  WHERE is_published = true AND status = 'scheduled';