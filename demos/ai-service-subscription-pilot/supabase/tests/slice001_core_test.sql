begin;

create extension if not exists pgtap with schema extensions;

select plan(37);

select has_schema('app_private', 'server-owned schema exists');

select has_table('app_private', 'accounts', 'accounts table exists');
select has_table('app_private', 'demo_sessions', 'demo sessions table exists');
select has_table('app_private', 'checkout_intents', 'checkout intents table exists');
select has_table('app_private', 'quotes', 'quotes table exists');
select has_table('app_private', 'provider_customers', 'provider customers table exists');
select has_table('app_private', 'payment_operations', 'payment operations table exists');
select has_table('app_private', 'provider_events', 'provider events table exists');
select has_table('app_private', 'payment_methods', 'payment methods table exists');
select has_table('app_private', 'billing_arrangements', 'billing arrangements table exists');
select has_table('app_private', 'allowance_windows', 'allowance windows table exists');
select has_table('app_private', 'usage_operations', 'usage operations table exists');

select is(
  (
    select count(*)::integer
    from pg_class relation_record
    join pg_namespace schema_record on schema_record.oid = relation_record.relnamespace
    where schema_record.nspname = 'app_private'
      and relation_record.relkind = 'r'
  ),
  11,
  'app_private contains exactly the eleven planned tables'
);

select is(
  (
    select count(*)::integer
    from pg_constraint constraint_record
    join pg_class relation_record on relation_record.oid = constraint_record.conrelid
    join pg_namespace schema_record on schema_record.oid = relation_record.relnamespace
    where schema_record.nspname = 'app_private'
      and constraint_record.contype = 'p'
  ),
  11,
  'every server-owned table has a primary key'
);

select is(
  (
    select count(*)::integer
    from information_schema.columns
    where table_schema = 'app_private'
      and column_name = 'id'
      and is_identity = 'YES'
      and data_type = 'bigint'
  ),
  11,
  'every primary identifier is a bigint identity'
);

select is(has_schema_privilege('anon', 'app_private', 'usage'), false, 'anon has no private schema usage');
select is(has_schema_privilege('authenticated', 'app_private', 'usage'), false, 'authenticated has no private schema usage');
select is(has_schema_privilege('public', 'app_private', 'usage'), false, 'PUBLIC has no private schema usage');
select is(has_schema_privilege('anon', 'app_private', 'create'), false, 'anon cannot create private schema objects');
select is(has_schema_privilege('authenticated', 'app_private', 'create'), false, 'authenticated cannot create private schema objects');
select is(has_schema_privilege('public', 'app_private', 'create'), false, 'PUBLIC cannot create private schema objects');

select is(
  (
    select count(*)::integer
    from pg_class relation_record
    join pg_namespace schema_record on schema_record.oid = relation_record.relnamespace
    where schema_record.nspname = 'app_private'
      and relation_record.relkind = 'r'
      and relation_record.relrowsecurity
  ),
  11,
  'RLS is enabled on every private table as defense in depth'
);

select is(
  (
    select count(*)::integer
    from pg_class relation_record
    join pg_namespace schema_record on schema_record.oid = relation_record.relnamespace
    where schema_record.nspname = 'app_private'
      and relation_record.relkind = 'r'
      and relation_record.relforcerowsecurity
  ),
  11,
  'RLS is forced on every private table'
);

select is(
  (
    select count(*)::integer
    from pg_constraint constraint_record
    join pg_class relation_record on relation_record.oid = constraint_record.conrelid
    join pg_namespace schema_record on schema_record.oid = relation_record.relnamespace
    where schema_record.nspname = 'app_private'
      and constraint_record.contype = 'f'
      and not exists (
        select 1
        from pg_index index_record
        where index_record.indrelid = constraint_record.conrelid
          and constraint_record.conkey <@ index_record.indkey::smallint[]
      )
  ),
  0,
  'every foreign key is backed by an index'
);

select ok(
  exists (select 1 from pg_constraint where conname = 'quotes_amounts_balance'),
  'quote arithmetic is protected by a database constraint'
);

insert into app_private.checkout_intents (
  public_id,
  anonymous_session_token_hash,
  tier,
  cadence,
  state
) values (
  '00000000-0000-4000-8000-000000000001',
  decode('00112233445566778899aabbccddeeff', 'hex'),
  'go',
  'monthly',
  'selected'
);

select lives_ok(
  $$
    insert into app_private.quotes (
      public_id,
      checkout_intent_id,
      currency,
      base_cents,
      promotion_cents,
      taxable_subtotal_cents,
      tax_basis_points,
      tax_cents,
      total_cents,
      pricing_version,
      tax_version,
      issued_at,
      expires_at,
      renews_at,
      allowance_resets_at,
      time_zone
    ) values (
      '00000000-0000-4000-8000-000000000002',
      (select id from app_private.checkout_intents where public_id = '00000000-0000-4000-8000-000000000001'),
      'USD',
      1000,
      -500,
      500,
      1055,
      53,
      553,
      'go-monthly-q3-2026-v1',
      'seattle-q3-2026-v1',
      '2026-08-13 00:00:00+00',
      '2026-08-13 00:15:00+00',
      '2026-09-13 00:00:00+00',
      '2026-09-13 00:00:00+00',
      'America/Los_Angeles'
    )
  $$,
  'a $5.00 taxable subtotal plus $0.53 tax persists as a $5.53 total'
);

select throws_ok(
  $$
    insert into app_private.quotes (
      public_id,
      checkout_intent_id,
      currency,
      base_cents,
      promotion_cents,
      taxable_subtotal_cents,
      tax_basis_points,
      tax_cents,
      total_cents,
      pricing_version,
      tax_version,
      issued_at,
      expires_at,
      renews_at,
      allowance_resets_at,
      time_zone
    ) values (
      '00000000-0000-4000-8000-000000000003',
      (select id from app_private.checkout_intents where public_id = '00000000-0000-4000-8000-000000000001'),
      'USD',
      1000,
      -500,
      500,
      1055,
      53,
      554,
      'go-monthly-q3-2026-v1',
      'seattle-q3-2026-v1',
      '2026-08-13 00:00:00+00',
      '2026-08-13 00:15:00+00',
      '2026-09-13 00:00:00+00',
      '2026-09-13 00:00:00+00',
      'America/Los_Angeles'
    )
  $$,
  '23514',
  null,
  'quotes reject a total that is not the taxable subtotal plus tax'
);

select ok(
  exists (select 1 from pg_constraint where conname = 'provider_events_provider_event_unique'),
  'provider event delivery is idempotent per provider boundary'
);

insert into app_private.provider_events (
  public_id,
  provider,
  merchant_id,
  environment,
  provider_event_id,
  event_type,
  raw_payload,
  signature_valid,
  correlation_result,
  received_at
) values (
  '00000000-0000-4000-8000-000000000006',
  'paypal',
  'merchant-test',
  'sandbox',
  'WH-TEST-EVENT-0001',
  'VAULT.PAYMENT-TOKEN.CREATED',
  '{"resource":{}}'::jsonb,
  true,
  'pending',
  '2026-08-13 00:00:00+00'
);

select throws_ok(
  $$
    insert into app_private.provider_events (
      public_id,
      provider,
      merchant_id,
      environment,
      provider_event_id,
      event_type,
      raw_payload,
      signature_valid,
      correlation_result,
      received_at
    ) values (
      '00000000-0000-4000-8000-000000000007',
      'paypal',
      'merchant-test',
      'sandbox',
      'WH-TEST-EVENT-0001',
      'VAULT.PAYMENT-TOKEN.CREATED',
      '{"resource":{}}'::jsonb,
      true,
      'pending',
      '2026-08-13 00:00:00+00'
    )
  $$,
  '23505',
  null,
  'provider event IDs cannot be inserted twice'
);

select ok(
  to_regclass('app_private.payment_operations_pending_vault_unique') is not null,
  'only one vault operation may be pending per correlation tuple'
);

insert into app_private.payment_operations (
  public_id,
  checkout_intent_id,
  quote_id,
  merchant_id,
  environment,
  paypal_customer_id,
  create_request_id,
  capture_request_id,
  funding_status,
  vault_status
) values (
  '00000000-0000-4000-8000-000000000004',
  (select id from app_private.checkout_intents where public_id = '00000000-0000-4000-8000-000000000001'),
  (select id from app_private.quotes where public_id = '00000000-0000-4000-8000-000000000002'),
  'merchant-test',
  'sandbox',
  'paypal-customer-test',
  'create-request-test-0001',
  'capture-request-test-0001',
  'created',
  'pending'
);

select throws_ok(
  $$
    insert into app_private.payment_operations (
      public_id,
      checkout_intent_id,
      quote_id,
      merchant_id,
      environment,
      paypal_customer_id,
      create_request_id,
      capture_request_id,
      funding_status,
      vault_status
    ) values (
      '00000000-0000-4000-8000-000000000005',
      (select id from app_private.checkout_intents where public_id = '00000000-0000-4000-8000-000000000001'),
      (select id from app_private.quotes where public_id = '00000000-0000-4000-8000-000000000002'),
      'merchant-test',
      'sandbox',
      'paypal-customer-test',
      'create-request-test-0002',
      'capture-request-test-0002',
      'created',
      'pending'
    )
  $$,
  '23505',
  null,
  'a second pending vault operation for one correlation tuple is rejected'
);

select ok(
  exists (select 1 from pg_constraint where conname = 'payment_methods_vault_owner_unique'),
  'a provider vault identifier has one owner per merchant and environment'
);

select ok(
  exists (select 1 from pg_constraint where conname = 'provider_customers_provider_customer_unique'),
  'a provider customer identifier is unique per merchant and environment'
);

select ok(
  exists (select 1 from pg_constraint where conname = 'allowance_windows_boundary_unique'),
  'an arrangement has one allowance window per exact boundary'
);

select ok(
  exists (select 1 from pg_constraint where conname = 'usage_operations_client_operation_unique'),
  'a client usage operation is idempotent per account'
);

select is(
  (
    select count(*)::integer
    from information_schema.columns
    where table_schema = 'app_private'
      and column_name like '%\_cents' escape '\'
      and data_type <> 'bigint'
  ),
  0,
  'all monetary cents columns use bigint integers'
);

select is(
  (
    select count(*)::integer
    from information_schema.columns
    where table_schema = 'app_private'
      and (
        column_name like '%\_at' escape '\'
        or column_name like '%\_start' escape '\'
        or column_name like '%\_end' escape '\'
      )
      and data_type <> 'timestamp with time zone'
  ),
  0,
  'all persisted instants retain timezone information'
);

select * from finish();

rollback;
