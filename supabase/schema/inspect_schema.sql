-- Read-only inventory; contains metadata, never application rows or Auth accounts.
SELECT jsonb_build_object(
  'database_version', current_setting('server_version'),
  'tables', (SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.schema_name, t.table_name), '[]'::jsonb)
    FROM (SELECT n.nspname AS schema_name, c.relname AS table_name,
      c.relkind, c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced,
      c.reloptions
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname IN ('public', 'auth', 'storage') AND c.relkind IN ('r', 'p', 'v', 'm')) t),
  'columns', (SELECT COALESCE(jsonb_agg(to_jsonb(c) ORDER BY c.table_schema, c.table_name, c.ordinal_position), '[]'::jsonb)
    FROM information_schema.columns c WHERE c.table_schema IN ('public', 'auth', 'storage')),
  'constraints', (SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.table_name, t.name), '[]'::jsonb)
    FROM (SELECT c.conrelid::regclass::text AS table_name, c.conname AS name,
      c.contype AS type, pg_get_constraintdef(c.oid) AS definition
      FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname IN ('public', 'auth', 'storage')) t),
  'policies', (SELECT COALESCE(jsonb_agg(to_jsonb(p) ORDER BY p.schemaname, p.tablename, p.policyname), '[]'::jsonb)
    FROM pg_policies p WHERE p.schemaname IN ('public', 'storage')),
  'functions', (SELECT COALESCE(jsonb_agg(to_jsonb(f) ORDER BY f.name, f.arguments), '[]'::jsonb)
    FROM (SELECT p.proname AS name, pg_get_function_identity_arguments(p.oid) AS arguments,
      pg_get_function_result(p.oid) AS result_type, p.prosecdef AS security_definer,
      p.proconfig AS settings, pg_get_functiondef(p.oid) AS definition,
      has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
      has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.prokind = 'f') f),
  'triggers', (SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.table_name, t.name), '[]'::jsonb)
    FROM (SELECT c.oid::regclass::text AS table_name, t.tgname AS name,
      pg_get_triggerdef(t.oid) AS definition, t.tgenabled AS enabled
      FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE NOT t.tgisinternal AND n.nspname IN ('public', 'auth', 'storage')) t),
  'grants', (SELECT COALESCE(jsonb_agg(to_jsonb(g) ORDER BY g.table_schema, g.table_name, g.grantee, g.privilege_type), '[]'::jsonb)
    FROM information_schema.table_privileges g
    WHERE g.table_schema IN ('public', 'auth', 'storage') AND g.grantee IN ('anon', 'authenticated', 'PUBLIC')),
  'indexes', (SELECT COALESCE(jsonb_agg(to_jsonb(i) ORDER BY i.schemaname, i.tablename, i.indexname), '[]'::jsonb)
    FROM pg_indexes i WHERE i.schemaname IN ('public', 'auth', 'storage')),
  'realtime_tables', (SELECT COALESCE(jsonb_agg(to_jsonb(p) ORDER BY p.pubname, p.schemaname, p.tablename), '[]'::jsonb)
    FROM pg_publication_tables p WHERE p.pubname = 'supabase_realtime'),
  'buckets', (SELECT COALESCE(jsonb_agg(to_jsonb(b) ORDER BY b.id), '[]'::jsonb)
    FROM (SELECT id, name, public, file_size_limit, allowed_mime_types FROM storage.buckets) b)
) AS audit;
