-- Plain PostgreSQL assertions, runnable without a pgTAP extension. All fixtures roll back.
begin;
do $$
declare
  fixture_user uuid := gen_random_uuid();
  fixture_account bigint;
  fixture_customer bigint;
  fixture_method bigint;
  state text;
begin
  insert into auth.users(id) values (fixture_user);
  insert into app_private.accounts(public_id, auth_user_id, identity_kind)
    values(gen_random_uuid(), fixture_user, 'persistent') returning id into fixture_account;
  insert into app_private.provider_customers(public_id, account_id, provider, merchant_id, environment, provider_customer_id)
    values(gen_random_uuid(), fixture_account, 'paypal', 'sql-fixture', 'sandbox', fixture_user::text) returning id into fixture_customer;
  insert into app_private.payment_methods(public_id, provider_customer_id, merchant_id, environment, provider_vault_id, readiness, is_primary)
    values(gen_random_uuid(), fixture_customer, 'sql-fixture', 'sandbox', fixture_user::text, 'ready', true) returning id into fixture_method;
  if (select removal_state from app_private.payment_methods where id=fixture_method) <> 'none' then raise exception 'incorrect_default'; end if;
  foreach state in array array['removing', 'removed', 'rejected', 'unknown'] loop
    update app_private.payment_methods
      set removal_state=state, removal_started_at=now(), removed_at=case when state='removed' then now() else null end,
          readiness='failed', is_primary=false where id=fixture_method;
    begin
      update app_private.payment_methods set readiness='ready' where id=fixture_method;
      raise exception 'blocked_method_became_ready';
    exception when check_violation then null;
    end;
    begin
      update app_private.payment_methods set is_primary=true where id=fixture_method;
      raise exception 'blocked_method_became_primary';
    exception when check_violation then null;
    end;
  end loop;
  begin
    update app_private.payment_methods set removal_state='removed', removed_at=null where id=fixture_method;
    raise exception 'removal_confirmation_missing';
  exception when check_violation then null;
  end;
  begin
    update app_private.payment_methods set removal_state='unknown', removed_at=now() where id=fixture_method;
    raise exception 'uncertainty_claimed_confirmed';
  exception when check_violation then null;
  end;
  begin
    update app_private.payment_methods set removal_started_at=null where id=fixture_method;
    raise exception 'claim_time_missing';
  exception when check_violation then null;
  end;
  if not exists(select 1 from app_private.provider_customers where id=fixture_customer) then raise exception 'customer_mapping_lost'; end if;
end $$;
select 'wallet lifecycle, eligibility and confirmation constraints passed' as result;
rollback;
