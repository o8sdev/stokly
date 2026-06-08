-- ════════════════════════════════════════════════════════════════════════
-- 018 — Lock new SECURITY DEFINER helpers to authenticated only
--
-- By default Postgres grants EXECUTE to PUBLIC (incl. the anon REST role). The
-- new admin/business helpers should never be callable anonymously. We revoke
-- PUBLIC/anon and (re)grant authenticated. (submit_demo_request stays anon —
-- the public demo form needs it — so it is intentionally left untouched.)
-- ════════════════════════════════════════════════════════════════════════

revoke execute on function public.log_activity(uuid, uuid, text, jsonb) from public, anon;
revoke execute on function public.admin_tenant_metrics(uuid[])           from public, anon;
revoke execute on function public.admin_onboarding_progress(uuid[])      from public, anon;
revoke execute on function public.tenant_has_feature(uuid, text)         from public, anon;
revoke execute on function public.tenant_entitlements(uuid)              from public, anon;
revoke execute on function public.plan_rank(text)                        from public, anon;
revoke execute on function public.is_super_admin()                       from public, anon;

grant execute on function public.log_activity(uuid, uuid, text, jsonb) to authenticated;
grant execute on function public.admin_tenant_metrics(uuid[])           to authenticated;
grant execute on function public.admin_onboarding_progress(uuid[])      to authenticated;
grant execute on function public.tenant_has_feature(uuid, text)         to authenticated;
grant execute on function public.tenant_entitlements(uuid)              to authenticated;
grant execute on function public.plan_rank(text)                        to authenticated;
grant execute on function public.is_super_admin()                       to authenticated;
