create schema if not exists app_private;

revoke all on schema app_private from public, anon, authenticated;

create table app_private.accounts (
  id bigint generated always as identity primary key,
  public_id uuid not null unique,
  auth_user_id uuid not null unique references auth.users(id),
  identity_kind text not null check (identity_kind in ('persistent', 'temporary')),
  temporary_demo_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accounts_temporary_expiry check (
    (identity_kind = 'temporary' and temporary_demo_expires_at is not null)
    or (identity_kind = 'persistent' and temporary_demo_expires_at is null)
  )
);

create table app_private.demo_sessions (
  id bigint generated always as identity primary key,
  public_id uuid not null unique,
  token_hash bytea not null unique check (octet_length(token_hash) >= 32),
  test_alias text unique,
  otp_ciphertext text,
  otp_expires_at timestamptz,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint demo_sessions_test_alias_shape check (
    test_alias is null or test_alias ~ '^[a-z0-9][a-z0-9._+-]*@test$'
  ),
  constraint demo_sessions_otp_lifetime check (
    (otp_ciphertext is null and otp_expires_at is null)
    or (otp_ciphertext is not null and otp_expires_at is not null and otp_expires_at <= created_at + interval '5 minutes')
  ),
  constraint demo_sessions_lifetime check (expires_at <= created_at + interval '24 hours')
);

create table app_private.checkout_intents (
  id bigint generated always as identity primary key,
  public_id uuid not null unique,
  anonymous_session_token_hash bytea not null check (octet_length(anonymous_session_token_hash) >= 16),
  account_id bigint references app_private.accounts(id),
  tier text not null check (tier = 'go'),
  cadence text not null check (cadence = 'monthly'),
  state text not null check (state in ('selected', 'identity_verified', 'payment_pending', 'funded', 'expired', 'canceled')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index checkout_intents_account_id_idx on app_private.checkout_intents (account_id);

create table app_private.quotes (
  id bigint generated always as identity primary key,
  public_id uuid not null unique,
  checkout_intent_id bigint not null references app_private.checkout_intents(id),
  currency text not null check (currency = 'USD'),
  base_cents bigint not null,
  promotion_cents bigint not null,
  taxable_subtotal_cents bigint not null,
  tax_basis_points integer not null,
  tax_cents bigint not null,
  total_cents bigint not null,
  pricing_version text not null,
  tax_version text not null,
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  renews_at timestamptz not null,
  allowance_resets_at timestamptz not null,
  time_zone text not null check (time_zone = 'America/Los_Angeles'),
  supersedes_quote_id bigint references app_private.quotes(id),
  created_at timestamptz not null default now(),
  constraint quotes_amounts_balance check (
    base_cents >= 0
    and promotion_cents <= 0
    and taxable_subtotal_cents = base_cents + promotion_cents
    and taxable_subtotal_cents >= 0
    and tax_basis_points between 0 and 10000
    and tax_cents = round((taxable_subtotal_cents * tax_basis_points)::numeric / 10000)::bigint
    and total_cents = taxable_subtotal_cents + tax_cents
  ),
  constraint quotes_lifecycle_order check (
    issued_at < expires_at and expires_at <= renews_at and renews_at <= allowance_resets_at
  )
);

create index quotes_checkout_intent_id_idx on app_private.quotes (checkout_intent_id);
create index quotes_supersedes_quote_id_idx on app_private.quotes (supersedes_quote_id);

create table app_private.provider_customers (
  id bigint generated always as identity primary key,
  public_id uuid not null unique,
  account_id bigint not null references app_private.accounts(id),
  provider text not null check (provider = 'paypal'),
  merchant_id text not null,
  environment text not null check (environment in ('sandbox', 'live')),
  provider_customer_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint provider_customers_provider_customer_unique unique (provider, merchant_id, environment, provider_customer_id),
  constraint provider_customers_account_unique unique (account_id, provider, merchant_id, environment)
);

create index provider_customers_account_id_idx on app_private.provider_customers (account_id);

create table app_private.payment_operations (
  id bigint generated always as identity primary key,
  public_id uuid not null unique,
  checkout_intent_id bigint not null references app_private.checkout_intents(id),
  quote_id bigint not null references app_private.quotes(id),
  account_id bigint references app_private.accounts(id),
  merchant_id text not null,
  environment text not null check (environment in ('sandbox', 'live')),
  paypal_customer_id text,
  paypal_order_id text unique,
  create_request_id text not null unique,
  capture_request_id text not null unique,
  funding_status text not null check (funding_status in ('created', 'approved', 'completed', 'failed', 'canceled')),
  vault_status text not null check (vault_status in ('not_requested', 'pending', 'approved', 'vaulted', 'failed')),
  provider_effective_at timestamptz,
  funding_verified_at timestamptz,
  vault_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_operations_vault_customer check (
    vault_status <> 'pending' or paypal_customer_id is not null
  )
);

create index payment_operations_checkout_intent_id_idx on app_private.payment_operations (checkout_intent_id);
create index payment_operations_quote_id_idx on app_private.payment_operations (quote_id);
create index payment_operations_account_id_idx on app_private.payment_operations (account_id);
create unique index payment_operations_pending_vault_unique
  on app_private.payment_operations (merchant_id, environment, paypal_customer_id)
  where vault_status = 'pending' and paypal_customer_id is not null;

create table app_private.provider_events (
  id bigint generated always as identity primary key,
  public_id uuid not null unique,
  provider text not null check (provider = 'paypal'),
  merchant_id text not null,
  environment text not null check (environment in ('sandbox', 'live')),
  provider_event_id text not null,
  event_type text not null,
  raw_payload jsonb not null,
  signature_valid boolean not null,
  correlation_result text not null check (correlation_result in ('pending', 'matched', 'unmatched', 'ambiguous', 'rejected')),
  payment_operation_id bigint references app_private.payment_operations(id),
  received_at timestamptz not null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint provider_events_provider_event_unique unique (provider_event_id)
);

create index provider_events_payment_operation_id_idx on app_private.provider_events (payment_operation_id);

create table app_private.payment_methods (
  id bigint generated always as identity primary key,
  public_id uuid not null unique,
  provider_customer_id bigint not null references app_private.provider_customers(id),
  merchant_id text not null,
  environment text not null check (environment in ('sandbox', 'live')),
  provider_vault_id text not null,
  display_brand text,
  display_last_four text check (display_last_four is null or display_last_four ~ '^[0-9]{4}$'),
  readiness text not null check (readiness in ('pending', 'ready', 'failed')),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_methods_vault_owner_unique unique (merchant_id, environment, provider_vault_id)
);

create index payment_methods_provider_customer_id_idx on app_private.payment_methods (provider_customer_id);
create unique index payment_methods_one_primary_per_customer_unique
  on app_private.payment_methods (provider_customer_id)
  where is_primary;

create table app_private.billing_arrangements (
  id bigint generated always as identity primary key,
  public_id uuid not null unique,
  account_id bigint not null references app_private.accounts(id),
  checkout_intent_id bigint not null references app_private.checkout_intents(id),
  quote_id bigint not null references app_private.quotes(id),
  payment_operation_id bigint not null references app_private.payment_operations(id),
  payment_method_id bigint references app_private.payment_methods(id),
  tier text not null check (tier = 'go'),
  cadence text not null check (cadence = 'monthly'),
  funding_status text not null check (funding_status in ('pending', 'verified', 'failed')),
  reusable_readiness text not null check (reusable_readiness in ('not_requested', 'pending', 'ready', 'failed')),
  entitlement_status text not null check (entitlement_status in ('pending', 'active', 'suspended', 'canceled')),
  renewal_at timestamptz not null,
  allowance_resets_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_arrangements_payment_operation_unique unique (payment_operation_id),
  constraint billing_arrangements_schedule_order check (renewal_at <= allowance_resets_at)
);

create index billing_arrangements_account_id_idx on app_private.billing_arrangements (account_id);
create index billing_arrangements_checkout_intent_id_idx on app_private.billing_arrangements (checkout_intent_id);
create index billing_arrangements_quote_id_idx on app_private.billing_arrangements (quote_id);
create index billing_arrangements_payment_method_id_idx on app_private.billing_arrangements (payment_method_id);

create table app_private.allowance_windows (
  id bigint generated always as identity primary key,
  public_id uuid not null unique,
  billing_arrangement_id bigint not null references app_private.billing_arrangements(id),
  window_starts_at timestamptz not null,
  window_ends_at timestamptz not null,
  granted_units bigint not null default 100,
  reserved_units bigint not null default 0,
  committed_units bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint allowance_windows_boundary_unique unique (billing_arrangement_id, window_starts_at, window_ends_at),
  constraint allowance_windows_unit_balance check (
    granted_units = 100
    and reserved_units >= 0
    and committed_units >= 0
    and reserved_units + committed_units <= granted_units
  ),
  constraint allowance_windows_time_order check (window_starts_at < window_ends_at)
);

create index allowance_windows_billing_arrangement_id_idx on app_private.allowance_windows (billing_arrangement_id);

create table app_private.usage_operations (
  id bigint generated always as identity primary key,
  public_id uuid not null unique,
  account_id bigint not null references app_private.accounts(id),
  allowance_window_id bigint not null references app_private.allowance_windows(id),
  client_operation_id uuid not null,
  units bigint not null check (units = 10),
  state text not null check (state in ('reserved', 'committed', 'released')),
  fixture_key text not null,
  reserved_at timestamptz not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint usage_operations_client_operation_unique unique (account_id, client_operation_id),
  constraint usage_operations_terminal_time check (
    (state = 'reserved' and completed_at is null)
    or (state in ('committed', 'released') and completed_at is not null)
  )
);

create index usage_operations_account_id_idx on app_private.usage_operations (account_id);
create index usage_operations_allowance_window_id_idx on app_private.usage_operations (allowance_window_id);

alter table app_private.accounts enable row level security;
alter table app_private.accounts force row level security;
alter table app_private.demo_sessions enable row level security;
alter table app_private.demo_sessions force row level security;
alter table app_private.checkout_intents enable row level security;
alter table app_private.checkout_intents force row level security;
alter table app_private.quotes enable row level security;
alter table app_private.quotes force row level security;
alter table app_private.provider_customers enable row level security;
alter table app_private.provider_customers force row level security;
alter table app_private.payment_operations enable row level security;
alter table app_private.payment_operations force row level security;
alter table app_private.provider_events enable row level security;
alter table app_private.provider_events force row level security;
alter table app_private.payment_methods enable row level security;
alter table app_private.payment_methods force row level security;
alter table app_private.billing_arrangements enable row level security;
alter table app_private.billing_arrangements force row level security;
alter table app_private.allowance_windows enable row level security;
alter table app_private.allowance_windows force row level security;
alter table app_private.usage_operations enable row level security;
alter table app_private.usage_operations force row level security;

revoke all on all tables in schema app_private from public, anon, authenticated;
revoke all on all sequences in schema app_private from public, anon, authenticated;
