begin;

alter function app.set_updated_at()
  set search_path = app, pg_catalog;

revoke all on function app.set_updated_at() from public, anon, authenticated;
grant execute on function app.set_updated_at() to service_role;

alter default privileges in schema app revoke all on functions from public;
alter default privileges in schema app revoke all on functions from anon, authenticated;
alter default privileges in schema app grant all privileges on functions to service_role;

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'rls_auto_enable'
      and pg_get_function_identity_arguments(p.oid) = ''
  ) then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;

commit;
