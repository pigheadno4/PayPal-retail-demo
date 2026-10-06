-- Baseline acquisition fixture: executed before the task migration on a fresh owned cluster.
do $$
declare a bigint; i bigint; q bigint; p bigint; b bigint;
begin
 insert into auth.users(id)values('c1000011-0000-4000-8000-000000000011');
 insert into app_private.accounts(public_id,auth_user_id,identity_kind)values(gen_random_uuid(),'c1000011-0000-4000-8000-000000000011','persistent')returning id into a;
 insert into app_private.checkout_intents(public_id,account_id,anonymous_session_token_hash,tier,cadence,state)values(gen_random_uuid(),a,decode(repeat('11',32),'hex'),'go','monthly','funded')returning id into i;
 insert into app_private.quotes(public_id,checkout_intent_id,currency,base_cents,promotion_cents,taxable_subtotal_cents,tax_basis_points,tax_cents,total_cents,pricing_version,tax_version,issued_at,expires_at,renews_at,allowance_resets_at,time_zone)values(gen_random_uuid(),i,'USD',1000,-500,500,1055,53,553,'go-monthly-intro-v1','us-wa-seattle-digital-ai-q3-2026-v1','2026-08-01','2026-08-01 00:15Z','2026-09-01','2026-09-01','America/Los_Angeles')returning id into q;
 insert into app_private.payment_operations(public_id,checkout_intent_id,quote_id,account_id,merchant_id,environment,create_request_id,capture_request_id,funding_status,vault_status,funding_verified_at)values(gen_random_uuid(),i,q,a,'TASK0011','sandbox',gen_random_uuid(),gen_random_uuid(),'completed','vaulted','2026-08-01')returning id into p;
 insert into app_private.billing_arrangements(public_id,account_id,checkout_intent_id,quote_id,payment_operation_id,tier,cadence,funding_status,reusable_readiness,entitlement_status,renewal_at,allowance_resets_at)values(gen_random_uuid(),a,i,q,p,'go','monthly','verified','pending','active','2026-09-01','2026-09-01')returning id into b;
 insert into app_private.allowance_windows(public_id,billing_arrangement_id,window_starts_at,window_ends_at,granted_units,reserved_units,committed_units)values(gen_random_uuid(),b,'2026-08-01','2026-09-01',100,0,20);
end $$;
-- TASK-0011 AFTER MIGRATION
begin;
do $$
declare a bigint; i bigint; q bigint; p bigint; b bigint; w bigint; next_w bigint; assignment text; failures int=0;
begin
 select x.id into a from app_private.accounts x where auth_user_id='c1000011-0000-4000-8000-000000000011';
 select x.id,x.checkout_intent_id,x.quote_id,x.payment_operation_id into b,i,q,p from app_private.billing_arrangements x where account_id=a;
 select id into w from app_private.allowance_windows where billing_arrangement_id=b;
 if (select purpose from app_private.checkout_intents where id=i)<>'initial' then raise exception 'baseline purpose changed';end if;
 foreach assignment in array array['reactivation_arrangement_id='||b,'purpose=''reactivation''','purpose=''reactivation'',reactivation_arrangement_id='||b||',account_id=null','purpose=''invalid''']loop
  begin execute 'update app_private.checkout_intents set '||assignment||' where id='||i;raise exception 'intent shape accepted';exception when check_violation then failures=failures+1;end;
 end loop;
 foreach assignment in array array['renews_at=null','allowance_resets_at=null','pricing_version=''go-monthly-reactivation-v1''','total_cents=1','promotion_cents=-1001']loop
  begin execute 'update app_private.quotes set '||assignment||' where id='||q;raise exception 'quote shape accepted';exception when check_violation then failures=failures+1;end;
 end loop;
 foreach assignment in array array['reactivation_arrangement_id='||b,'reactivation_previous_window_id='||w,'reactivation_state=''claimed''','request_body_hash='''||repeat('a',64)||'''','reactivation_capture_id=''synthetic''','reactivation_reconciled_at=now()','reactivation_arrangement_id='||b||',reactivation_previous_window_id='||w||',reactivation_state=null,request_body_hash='''||repeat('a',64)||'''','reactivation_arrangement_id='||b||',reactivation_previous_window_id='||w||',reactivation_state=''claimed'',request_body_hash=null','reactivation_arrangement_id='||b||',reactivation_previous_window_id='||w||',reactivation_state=''claimed'',request_body_hash=''bad''','reactivation_arrangement_id='||b||',reactivation_previous_window_id='||w||',reactivation_state=''confirmed'',request_body_hash='''||repeat('a',64)||'''']loop
  begin execute 'update app_private.payment_operations set '||assignment||' where id='||p;raise exception 'operation shape accepted';exception when check_violation then failures=failures+1;end;
 end loop;
 foreach assignment in array array['funding_payment_operation_id='||p,'funding_quote_id='||q]loop
  begin execute 'update app_private.allowance_windows set '||assignment||' where id='||w;raise exception 'funding pair accepted';exception when check_violation then failures=failures+1;end;
 end loop;
 begin update app_private.checkout_intents set purpose='reactivation',reactivation_arrangement_id=9223372036854775806 where id=i;raise exception 'missing arrangement accepted';exception when foreign_key_violation then failures=failures+1;end;
 foreach assignment in array array[
  'reactivation_arrangement_id=9223372036854775806,reactivation_previous_window_id='||w||',reactivation_state=''claimed'',request_body_hash='''||repeat('a',64)||'''',
  'reactivation_arrangement_id='||b||',reactivation_previous_window_id=9223372036854775806,reactivation_state=''claimed'',request_body_hash='''||repeat('a',64)||''''
 ]loop
  begin execute 'update app_private.payment_operations set '||assignment||' where id='||p;raise exception 'missing operation binding accepted';exception when foreign_key_violation then failures=failures+1;end;
 end loop;
 foreach assignment in array array['funding_payment_operation_id=9223372036854775806,funding_quote_id='||q,'funding_payment_operation_id='||p||',funding_quote_id=9223372036854775806']loop
  begin execute 'update app_private.allowance_windows set '||assignment||' where id='||w;raise exception 'missing funding reference accepted';exception when foreign_key_violation then failures=failures+1;end;
 end loop;
 -- Valid recovery shape, then all four non-failed states enforce one expired-window obligation.
 update app_private.payment_operations set reactivation_arrangement_id=b,reactivation_previous_window_id=w,reactivation_state='claimed',request_body_hash=repeat('a',64) where id=p;
 foreach assignment in array array['claimed','pending','action_required','confirmed']loop
  update app_private.payment_operations set reactivation_state=assignment,reactivation_capture_id=case when assignment='confirmed' then 'synthetic-capture-sql' else null end where id=p;
  begin
   insert into app_private.payment_operations(public_id,checkout_intent_id,quote_id,account_id,merchant_id,environment,create_request_id,capture_request_id,funding_status,vault_status,reactivation_arrangement_id,reactivation_previous_window_id,reactivation_state,request_body_hash)values(gen_random_uuid(),i,q,a,'TASK0011','sandbox',gen_random_uuid(),gen_random_uuid(),'created','not_requested',b,w,'claimed',repeat('b',64));raise exception 'duplicate obligation accepted';
  exception when unique_violation then failures=failures+1;end;
 end loop;
 insert into app_private.allowance_windows(public_id,billing_arrangement_id,window_starts_at,window_ends_at,granted_units,reserved_units,committed_units)values(gen_random_uuid(),b,'2026-09-01','2026-10-01',100,0,0)returning id into next_w;
 begin
  insert into app_private.payment_operations(public_id,checkout_intent_id,quote_id,account_id,merchant_id,environment,create_request_id,capture_request_id,funding_status,vault_status,reactivation_arrangement_id,reactivation_previous_window_id,reactivation_state,request_body_hash,reactivation_capture_id)values(gen_random_uuid(),i,q,a,'TASK0011','sandbox',gen_random_uuid(),gen_random_uuid(),'completed','not_requested',b,next_w,'confirmed',repeat('c',64),'synthetic-capture-sql');raise exception 'duplicate capture accepted';
 exception when unique_violation then failures=failures+1;end;
 update app_private.payment_operations set reactivation_state='failed',reactivation_capture_id=null where id=p;
 insert into app_private.payment_operations(public_id,checkout_intent_id,quote_id,account_id,merchant_id,environment,create_request_id,capture_request_id,funding_status,vault_status,reactivation_arrangement_id,reactivation_previous_window_id,reactivation_state,request_body_hash)values(gen_random_uuid(),i,q,a,'TASK0011','sandbox',gen_random_uuid(),gen_random_uuid(),'created','not_requested',b,w,'claimed',repeat('b',64));
 update app_private.allowance_windows set funding_payment_operation_id=p,funding_quote_id=q where id=w;
 begin insert into app_private.allowance_windows(public_id,billing_arrangement_id,window_starts_at,window_ends_at,granted_units,reserved_units,committed_units,funding_payment_operation_id,funding_quote_id)values(gen_random_uuid(),b,'2026-10-01','2026-11-01',100,0,0,p,q);raise exception 'duplicate funding operation accepted';exception when unique_violation then failures=failures+1;end;
 if failures<>32 then raise exception 'constraint matrix incomplete: %',failures;end if;
end $$;
rollback;
