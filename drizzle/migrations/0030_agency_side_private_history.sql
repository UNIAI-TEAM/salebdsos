DO $$ DECLARE d text; BEGIN
 SELECT pg_get_functiondef('public.agency_routing_view(uuid,uuid)'::regprocedure) INTO d;
 d:=replace(d,'f.status,f.history,','f.status,CASE WHEN master THEN coalesce((SELECT jsonb_agg(item - ''team'') FROM jsonb_array_elements(f.history) item),''[]''::jsonb) ELSE f.history END AS history,');
 EXECUTE d;
END $$;