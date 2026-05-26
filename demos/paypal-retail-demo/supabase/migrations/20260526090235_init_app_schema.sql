begin;

create extension if not exists pgcrypto;

create schema if not exists app;

comment on schema app is
  'Private application schema for the PayPal retail demo. Browser clients use Express APIs, not direct Supabase table access.';

create or replace function app.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table app.profiles (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  display_name text not null,
  brand_mode text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_slug_unique unique (slug),
  constraint profiles_slug_check check (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  constraint profiles_brand_mode_check check (brand_mode in ('popmart', 'generic'))
);

create table app.markets (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  currency_code char(3) not null,
  locale text not null,
  language_code text not null,
  buyer_country char(2) not null,
  paypal_page_type text not null default 'checkout',
  paylater_enabled boolean not null default true,
  paylater_buyer_country char(2),
  sandbox_test_buyer_country char(2),
  paypal_components_json jsonb not null default '[]'::jsonb,
  payment_method_flags_json jsonb not null default '{}'::jsonb,
  market_version integer not null default 1,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint markets_code_unique unique (code),
  constraint markets_code_check check (code ~ '^[A-Z]{2,8}$'),
  constraint markets_currency_code_check check (currency_code ~ '^[A-Z]{3}$'),
  constraint markets_buyer_country_check check (buyer_country ~ '^[A-Z]{2}$'),
  constraint markets_paylater_buyer_country_check check (paylater_buyer_country is null or paylater_buyer_country ~ '^[A-Z]{2}$'),
  constraint markets_sandbox_test_buyer_country_check check (sandbox_test_buyer_country is null or sandbox_test_buyer_country ~ '^[A-Z]{2}$'),
  constraint markets_market_version_check check (market_version > 0)
);

create table app.categories (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references app.profiles (id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  image_path text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_profile_slug_unique unique (profile_id, slug),
  constraint categories_id_profile_unique unique (id, profile_id),
  constraint categories_slug_check check (slug ~ '^[a-z0-9][a-z0-9-]*$')
);

create table app.products (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references app.profiles (id) on delete cascade,
  category_id uuid not null,
  slug text not null,
  sku text not null,
  name text not null,
  series_name text,
  description text not null default '',
  short_description text,
  release_status text not null default 'released',
  release_date date,
  is_hot_sale boolean not null default false,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  max_quantity_per_order integer not null default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_profile_sku_unique unique (profile_id, sku),
  constraint products_profile_slug_unique unique (profile_id, slug),
  constraint products_id_profile_unique unique (id, profile_id),
  constraint products_category_profile_fk foreign key (category_id, profile_id) references app.categories (id, profile_id),
  constraint products_slug_check check (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  constraint products_release_status_check check (release_status in ('released', 'coming_soon', 'unreleased')),
  constraint products_max_quantity_check check (max_quantity_per_order > 0)
);

create table app.product_prices (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references app.profiles (id) on delete cascade,
  market_id uuid not null references app.markets (id) on delete restrict,
  product_id uuid not null,
  currency_code char(3) not null,
  regular_price_minor integer not null,
  current_price_minor integer not null,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_prices_product_profile_fk foreign key (product_id, profile_id) references app.products (id, profile_id) on delete cascade,
  constraint product_prices_currency_code_check check (currency_code ~ '^[A-Z]{3}$'),
  constraint product_prices_regular_nonnegative check (regular_price_minor >= 0),
  constraint product_prices_current_nonnegative check (current_price_minor >= 0),
  constraint product_prices_time_range_check check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create unique index product_prices_one_active_per_product_market
  on app.product_prices (product_id, market_id)
  where is_active;

create table app.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references app.products (id) on delete cascade,
  image_path text not null,
  alt_text text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint product_images_product_sort_unique unique (product_id, sort_order)
);

create table app.release_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references app.profiles (id) on delete cascade,
  market_id uuid not null references app.markets (id) on delete restrict,
  product_id uuid not null,
  event_date date not null,
  event_type text not null,
  calendar_label text,
  created_at timestamptz not null default now(),
  constraint release_events_product_profile_fk foreign key (product_id, profile_id) references app.products (id, profile_id) on delete cascade,
  constraint release_events_type_check check (event_type in ('release', 'new_arrival', 'promo', 'preorder_end'))
);

create table app.homepage_sections (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references app.profiles (id) on delete cascade,
  market_id uuid not null references app.markets (id) on delete restrict,
  section_key text not null,
  title text,
  subtitle text,
  content_json jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint homepage_sections_profile_market_key_unique unique (profile_id, market_id, section_key),
  constraint homepage_sections_section_key_check check (section_key ~ '^[a-z0-9][a-z0-9_:-]*$')
);

create table app.stores (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references app.markets (id) on delete restrict,
  slug text not null,
  name text not null,
  phone text,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  state text,
  postal_code text not null,
  country_code char(2) not null,
  latitude numeric(9,6),
  longitude numeric(9,6),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stores_market_slug_unique unique (market_id, slug),
  constraint stores_id_market_unique unique (id, market_id),
  constraint stores_country_code_check check (country_code ~ '^[A-Z]{2}$'),
  constraint stores_latitude_check check (latitude is null or latitude between -90 and 90),
  constraint stores_longitude_check check (longitude is null or longitude between -180 and 180)
);

create table app.store_pickup_dates (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references app.markets (id) on delete restrict,
  store_id uuid not null,
  pickup_date date not null,
  capacity integer not null default 0,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_pickup_dates_store_market_fk foreign key (store_id, market_id) references app.stores (id, market_id) on delete cascade,
  constraint store_pickup_dates_unique unique (market_id, store_id, pickup_date),
  constraint store_pickup_dates_capacity_check check (capacity >= 0)
);

create table app.central_inventory (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references app.profiles (id) on delete cascade,
  market_id uuid not null references app.markets (id) on delete restrict,
  product_id uuid not null,
  available_quantity integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint central_inventory_product_profile_fk foreign key (product_id, profile_id) references app.products (id, profile_id) on delete cascade,
  constraint central_inventory_unique unique (profile_id, market_id, product_id),
  constraint central_inventory_quantity_check check (available_quantity >= 0)
);

create table app.store_inventory (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references app.profiles (id) on delete cascade,
  market_id uuid not null references app.markets (id) on delete restrict,
  store_id uuid not null,
  product_id uuid not null,
  available_quantity integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint store_inventory_store_market_fk foreign key (store_id, market_id) references app.stores (id, market_id) on delete cascade,
  constraint store_inventory_product_profile_fk foreign key (product_id, profile_id) references app.products (id, profile_id) on delete cascade,
  constraint store_inventory_unique unique (profile_id, market_id, store_id, product_id),
  constraint store_inventory_quantity_check check (available_quantity >= 0)
);

create table app.user_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_profiles_auth_user_unique unique (auth_user_id),
  constraint user_profiles_email_check check (position('@' in email) > 1)
);

create table app.addresses (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  label text,
  recipient_name text not null,
  phone text,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  state text,
  postal_code text not null,
  country_code char(2) not null,
  is_default_shipping boolean not null default false,
  is_default_billing boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint addresses_country_code_check check (country_code ~ '^[A-Z]{2}$')
);

create unique index addresses_one_default_shipping_per_user
  on app.addresses (auth_user_id)
  where is_default_shipping;

create unique index addresses_one_default_billing_per_user
  on app.addresses (auth_user_id)
  where is_default_billing;

create table app.saved_payment_methods (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null default 'paypal',
  method_type text not null,
  status text not null default 'active',
  vault_id text,
  paypal_customer_id text,
  brand text,
  last4 text,
  expiry_month integer,
  expiry_year integer,
  label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint saved_payment_provider_check check (provider = 'paypal'),
  constraint saved_payment_method_type_check check (method_type in ('paypal_wallet', 'card')),
  constraint saved_payment_status_check check (status in ('active', 'pending', 'disabled', 'deleted')),
  constraint saved_payment_last4_check check (last4 is null or last4 ~ '^[0-9]{4}$'),
  constraint saved_payment_expiry_month_check check (expiry_month is null or expiry_month between 1 and 12)
);

create table app.carts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references app.profiles (id) on delete cascade,
  market_id uuid not null references app.markets (id) on delete restrict,
  auth_user_id uuid references auth.users (id) on delete cascade,
  cart_public_id text not null default ('cart_' || replace(gen_random_uuid()::text, '-', '')),
  cart_secret_hash text,
  status text not null default 'active',
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint carts_cart_public_id_unique unique (cart_public_id),
  constraint carts_status_check check (status in ('active', 'merged', 'abandoned', 'converted')),
  constraint carts_guest_secret_check check (auth_user_id is not null or cart_secret_hash is not null)
);

create unique index carts_one_active_signed_in_cart_per_scope
  on app.carts (profile_id, market_id, auth_user_id)
  where auth_user_id is not null and status = 'active';

create table app.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references app.carts (id) on delete cascade,
  product_id uuid not null references app.products (id) on delete restrict,
  quantity integer not null,
  unit_price_minor_snapshot integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cart_items_cart_product_unique unique (cart_id, product_id),
  constraint cart_items_quantity_check check (quantity > 0),
  constraint cart_items_unit_price_check check (unit_price_minor_snapshot >= 0)
);

create table app.checkout_drafts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references app.profiles (id) on delete cascade,
  market_id uuid not null references app.markets (id) on delete restrict,
  cart_id uuid not null references app.carts (id) on delete cascade,
  auth_user_id uuid references auth.users (id) on delete set null,
  guest_email text,
  fulfillment_mode text not null default 'delivery',
  delivery_state_json jsonb not null default '{}'::jsonb,
  pickup_state_json jsonb not null default '{}'::jsonb,
  selected_promo_evaluation_id uuid,
  currency_code char(3) not null,
  locale text not null,
  buyer_country char(2) not null,
  sandbox_test_buyer_country char(2),
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint checkout_drafts_fulfillment_mode_check check (fulfillment_mode in ('delivery', 'pickup')),
  constraint checkout_drafts_currency_code_check check (currency_code ~ '^[A-Z]{3}$'),
  constraint checkout_drafts_buyer_country_check check (buyer_country ~ '^[A-Z]{2}$'),
  constraint checkout_drafts_sandbox_test_buyer_country_check check (sandbox_test_buyer_country is null or sandbox_test_buyer_country ~ '^[A-Z]{2}$'),
  constraint checkout_drafts_status_check check (status in ('draft', 'payment_started', 'converted', 'abandoned'))
);

create table app.promo_rules (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references app.profiles (id) on delete cascade,
  market_id uuid not null references app.markets (id) on delete restrict,
  code text not null,
  title text not null,
  description text,
  promo_type text not null,
  discount_type text not null,
  discount_value integer not null,
  min_merchandise_subtotal_minor integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_stackable boolean not null default false,
  priority integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promo_rules_profile_market_code_unique unique (profile_id, market_id, code),
  constraint promo_rules_id_profile_market_unique unique (id, profile_id, market_id),
  constraint promo_rules_code_check check (code = upper(code) and code ~ '^[A-Z0-9_-]+$'),
  constraint promo_rules_promo_type_check check (promo_type in ('auto', 'manual')),
  constraint promo_rules_discount_type_check check (discount_type in ('percent', 'fixed_amount')),
  constraint promo_rules_discount_value_check check (discount_value >= 0),
  constraint promo_rules_min_subtotal_check check (min_merchandise_subtotal_minor >= 0),
  constraint promo_rules_time_range_check check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table app.promo_rule_regions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null,
  market_id uuid not null,
  promo_rule_id uuid not null,
  country_code char(2) not null,
  state text,
  county text,
  postal_code_prefix text,
  include_exclude text not null,
  created_at timestamptz not null default now(),
  constraint promo_rule_regions_rule_scope_fk foreign key (promo_rule_id, profile_id, market_id) references app.promo_rules (id, profile_id, market_id) on delete cascade,
  constraint promo_rule_regions_country_code_check check (country_code ~ '^[A-Z]{2}$'),
  constraint promo_rule_regions_include_exclude_check check (include_exclude in ('include', 'exclude'))
);

create table app.promo_rule_products (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null,
  market_id uuid not null,
  promo_rule_id uuid not null,
  product_id uuid,
  category_id uuid,
  include_exclude text not null,
  created_at timestamptz not null default now(),
  constraint promo_rule_products_rule_scope_fk foreign key (promo_rule_id, profile_id, market_id) references app.promo_rules (id, profile_id, market_id) on delete cascade,
  constraint promo_rule_products_product_profile_fk foreign key (product_id, profile_id) references app.products (id, profile_id) on delete cascade,
  constraint promo_rule_products_category_profile_fk foreign key (category_id, profile_id) references app.categories (id, profile_id) on delete cascade,
  constraint promo_rule_products_target_check check (product_id is not null or category_id is not null),
  constraint promo_rule_products_include_exclude_check check (include_exclude in ('include', 'exclude'))
);

create table app.promo_compatibility (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null,
  market_id uuid not null,
  promo_rule_id uuid not null,
  compatible_promo_rule_id uuid not null,
  compatibility text not null,
  created_at timestamptz not null default now(),
  constraint promo_compatibility_rule_scope_fk foreign key (promo_rule_id, profile_id, market_id) references app.promo_rules (id, profile_id, market_id) on delete cascade,
  constraint promo_compatibility_compatible_rule_scope_fk foreign key (compatible_promo_rule_id, profile_id, market_id) references app.promo_rules (id, profile_id, market_id) on delete cascade,
  constraint promo_compatibility_unique unique (profile_id, market_id, promo_rule_id, compatible_promo_rule_id),
  constraint promo_compatibility_no_self_check check (promo_rule_id <> compatible_promo_rule_id),
  constraint promo_compatibility_value_check check (compatibility in ('compatible', 'exclusive'))
);

create table app.promo_evaluations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references app.profiles (id) on delete cascade,
  market_id uuid not null references app.markets (id) on delete restrict,
  checkout_draft_id uuid references app.checkout_drafts (id) on delete cascade,
  order_id uuid,
  evaluation_context_json jsonb not null default '{}'::jsonb,
  matched_promos_json jsonb not null default '[]'::jsonb,
  rejected_promos_json jsonb not null default '[]'::jsonb,
  candidate_sets_json jsonb not null default '[]'::jsonb,
  recommended_set_json jsonb not null default '[]'::jsonb,
  selected_set_json jsonb not null default '[]'::jsonb,
  merchandise_discount_minor integer not null default 0,
  taxable_subtotal_minor integer not null default 0,
  final_total_minor integer not null default 0,
  created_at timestamptz not null default now(),
  constraint promo_evaluations_owner_check check (checkout_draft_id is not null or order_id is not null),
  constraint promo_evaluations_merchandise_discount_check check (merchandise_discount_minor >= 0),
  constraint promo_evaluations_taxable_subtotal_check check (taxable_subtotal_minor >= 0),
  constraint promo_evaluations_final_total_check check (final_total_minor >= 0)
);

alter table app.checkout_drafts
  add constraint checkout_drafts_selected_promo_evaluation_fk
  foreign key (selected_promo_evaluation_id) references app.promo_evaluations (id) on delete set null;

create table app.promo_evaluation_lines (
  id uuid primary key default gen_random_uuid(),
  promo_evaluation_id uuid not null references app.promo_evaluations (id) on delete cascade,
  promo_rule_id uuid references app.promo_rules (id) on delete set null,
  code_snapshot text not null,
  evaluation_status text not null,
  rejection_reason text,
  stack_group text,
  discount_minor integer not null default 0,
  taxable_subtotal_effect_minor integer not null default 0,
  final_total_effect_minor integer not null default 0,
  explanation text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint promo_evaluation_lines_status_check check (evaluation_status in ('candidate', 'recommended', 'selected', 'applied', 'rejected')),
  constraint promo_evaluation_lines_discount_check check (discount_minor >= 0)
);

create table app.tax_rates (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references app.markets (id) on delete restrict,
  country_code char(2) not null,
  state text,
  county text,
  postal_code_prefix text,
  rate_bps integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tax_rates_country_code_check check (country_code ~ '^[A-Z]{2}$'),
  constraint tax_rates_rate_check check (rate_bps >= 0 and rate_bps <= 10000)
);

comment on table app.tax_rates is
  'Demo-only estimated tax rates. Tax applies after merchandise promos and excludes shipping fees.';

create table app.shipping_options (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references app.markets (id) on delete restrict,
  country_code char(2) not null,
  state text,
  county text,
  service_code text not null,
  display_name text not null,
  amount_minor integer not null,
  estimated_days_min integer not null,
  estimated_days_max integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shipping_options_country_code_check check (country_code ~ '^[A-Z]{2}$'),
  constraint shipping_options_amount_check check (amount_minor >= 0),
  constraint shipping_options_days_check check (estimated_days_min >= 0 and estimated_days_max >= estimated_days_min)
);

comment on table app.shipping_options is
  'Shipping options are selected by destination and kept outside promo/tax calculation bases.';

create table app.orders (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references app.profiles (id) on delete restrict,
  market_id uuid not null references app.markets (id) on delete restrict,
  order_number text not null,
  order_number_prefix text not null,
  order_number_sequence integer not null,
  auth_user_id uuid references auth.users (id) on delete set null,
  guest_email text,
  cart_id uuid references app.carts (id) on delete set null,
  checkout_draft_id uuid references app.checkout_drafts (id) on delete set null,
  fulfillment_mode text not null,
  status text not null default 'pending',
  payment_status text not null default 'not_started',
  currency_code char(3) not null,
  locale text not null,
  buyer_country char(2) not null,
  sandbox_test_buyer_country char(2),
  subtotal_minor integer not null default 0,
  discount_minor integer not null default 0,
  tax_minor integer not null default 0,
  shipping_minor integer not null default 0,
  total_minor integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_order_number_unique unique (order_number),
  constraint orders_order_number_prefix_check check (order_number_prefix in ('DO', 'PO')),
  constraint orders_order_number_check check (order_number ~ '^(DO|PO)-[0-9]{8}-[0-9]{6}$'),
  constraint orders_fulfillment_mode_check check (fulfillment_mode in ('delivery', 'pickup')),
  constraint orders_status_check check (status in ('pending', 'paid', 'processing', 'shipped', 'delivered', 'preparing_pickup', 'ready_for_pickup', 'picked_up', 'cancelled')),
  constraint orders_payment_status_check check (payment_status in ('not_started', 'started', 'approved', 'captured', 'failed', 'cancelled')),
  constraint orders_currency_code_check check (currency_code ~ '^[A-Z]{3}$'),
  constraint orders_buyer_country_check check (buyer_country ~ '^[A-Z]{2}$'),
  constraint orders_sandbox_test_buyer_country_check check (sandbox_test_buyer_country is null or sandbox_test_buyer_country ~ '^[A-Z]{2}$'),
  constraint orders_amounts_nonnegative check (subtotal_minor >= 0 and discount_minor >= 0 and tax_minor >= 0 and shipping_minor >= 0 and total_minor >= 0)
);

alter table app.promo_evaluations
  add constraint promo_evaluations_order_fk
  foreign key (order_id) references app.orders (id) on delete cascade;

create table app.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references app.orders (id) on delete cascade,
  product_id uuid not null references app.products (id) on delete restrict,
  product_sku_snapshot text not null,
  product_name_snapshot text not null,
  product_description_snapshot text,
  product_url_snapshot text,
  product_image_url_snapshot text,
  unit_price_minor integer not null,
  quantity integer not null,
  fulfillable_quantity integer not null,
  unavailable_quantity integer not null default 0,
  line_subtotal_minor integer not null,
  line_discount_minor integer not null default 0,
  line_tax_minor integer not null default 0,
  line_total_minor integer not null,
  created_at timestamptz not null default now(),
  constraint order_items_quantity_check check (quantity > 0),
  constraint order_items_fulfillment_quantity_check check (fulfillable_quantity >= 0 and unavailable_quantity >= 0 and fulfillable_quantity + unavailable_quantity = quantity),
  constraint order_items_amounts_nonnegative check (unit_price_minor >= 0 and line_subtotal_minor >= 0 and line_discount_minor >= 0 and line_tax_minor >= 0 and line_total_minor >= 0)
);

create table app.order_addresses (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references app.orders (id) on delete cascade,
  address_type text not null,
  recipient_name text not null,
  phone text,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  state text,
  postal_code text not null,
  country_code char(2) not null,
  created_at timestamptz not null default now(),
  constraint order_addresses_order_type_unique unique (order_id, address_type),
  constraint order_addresses_address_type_check check (address_type in ('shipping', 'billing', 'pickup_store')),
  constraint order_addresses_country_code_check check (country_code ~ '^[A-Z]{2}$')
);

create table app.guest_order_access (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references app.orders (id) on delete cascade,
  guest_email_hash text not null,
  lookup_token_hash text,
  lookup_attempt_count integer not null default 0,
  last_lookup_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guest_order_access_order_unique unique (order_id),
  constraint guest_order_access_attempt_count_check check (lookup_attempt_count >= 0)
);

create table app.payment_sessions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references app.orders (id) on delete cascade,
  provider text not null default 'paypal',
  method text not null,
  status text not null default 'created',
  attempt_number integer not null default 1,
  paypal_order_id text,
  paypal_capture_id text,
  paypal_invoice_id text,
  paypal_request_id text,
  vault_requested boolean not null default false,
  merchant_total_minor integer not null,
  provider_total_minor integer,
  amount_consistency_status text not null default 'not_checked',
  currency_code char(3) not null,
  locale text not null,
  buyer_country char(2) not null,
  sandbox_test_buyer_country char(2),
  paypal_config_snapshot_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_sessions_provider_check check (provider = 'paypal'),
  constraint payment_sessions_method_check check (method in ('paypal', 'paylater', 'card', 'apple_pay', 'google_pay', 'venmo')),
  constraint payment_sessions_status_check check (status in ('created', 'approved', 'captured', 'failed', 'cancelled', 'expired')),
  constraint payment_sessions_attempt_number_check check (attempt_number > 0),
  constraint payment_sessions_totals_check check (merchant_total_minor >= 0 and (provider_total_minor is null or provider_total_minor >= 0)),
  constraint payment_sessions_amount_consistency_status_check check (amount_consistency_status in ('not_checked', 'matched', 'mismatch', 'tolerance')),
  constraint payment_sessions_currency_code_check check (currency_code ~ '^[A-Z]{3}$'),
  constraint payment_sessions_buyer_country_check check (buyer_country ~ '^[A-Z]{2}$'),
  constraint payment_sessions_sandbox_test_buyer_country_check check (sandbox_test_buyer_country is null or sandbox_test_buyer_country ~ '^[A-Z]{2}$')
);

create unique index payment_sessions_paypal_invoice_unique
  on app.payment_sessions (paypal_invoice_id)
  where paypal_invoice_id is not null;

create table app.total_snapshots (
  id uuid primary key default gen_random_uuid(),
  checkout_draft_id uuid references app.checkout_drafts (id) on delete cascade,
  order_id uuid references app.orders (id) on delete cascade,
  payment_session_id uuid references app.payment_sessions (id) on delete cascade,
  fulfillment_mode text not null,
  calculation_stage text not null,
  currency_code char(3) not null,
  merchandise_subtotal_minor integer not null,
  product_discount_minor integer not null default 0,
  promo_discount_minor integer not null default 0,
  taxable_subtotal_minor integer not null,
  tax_minor integer not null default 0,
  shipping_minor integer not null default 0,
  total_minor integer not null,
  promo_evaluation_id uuid references app.promo_evaluations (id) on delete set null,
  calculation_context_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint total_snapshots_owner_check check (checkout_draft_id is not null or order_id is not null),
  constraint total_snapshots_fulfillment_mode_check check (fulfillment_mode in ('delivery', 'pickup')),
  constraint total_snapshots_stage_check check (calculation_stage in ('checkout_draft', 'paypal_shipping_update', 'review_confirm', 'capture', 'pending_resume')),
  constraint total_snapshots_currency_code_check check (currency_code ~ '^[A-Z]{3}$'),
  constraint total_snapshots_amounts_nonnegative check (
    merchandise_subtotal_minor >= 0
    and product_discount_minor >= 0
    and promo_discount_minor >= 0
    and taxable_subtotal_minor >= 0
    and tax_minor >= 0
    and shipping_minor >= 0
    and total_minor >= 0
  )
);

comment on table app.total_snapshots is
  'Calculation history for checkout drafts, PayPal shipping updates, review/confirm, capture, and pending resume. Shipping is stored separately and excluded from promo/tax bases.';

create table app.paypal_order_snapshots (
  id uuid primary key default gen_random_uuid(),
  payment_session_id uuid not null references app.payment_sessions (id) on delete cascade,
  paypal_invoice_id text,
  paypal_request_id text,
  request_json jsonb not null,
  response_json jsonb,
  merchant_snapshot_json jsonb not null,
  created_at timestamptz not null default now()
);

comment on table app.paypal_order_snapshots is
  'Sanitized PayPal request/response snapshots for Admin debug. Never store access tokens or credentials here.';

create table app.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'paypal',
  event_id text not null,
  event_type text not null,
  verification_status text not null,
  headers_json jsonb not null default '{}'::jsonb,
  payload_json jsonb not null default '{}'::jsonb,
  linked_order_id uuid references app.orders (id) on delete set null,
  linked_payment_session_id uuid references app.payment_sessions (id) on delete set null,
  processing_status text not null default 'received',
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint webhook_events_provider_event_unique unique (provider, event_id),
  constraint webhook_events_provider_check check (provider = 'paypal'),
  constraint webhook_events_verification_status_check check (verification_status in ('valid', 'invalid', 'error')),
  constraint webhook_events_processing_status_check check (processing_status in ('received', 'processed', 'ignored', 'failed'))
);

create table app.order_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references app.orders (id) on delete cascade,
  from_status text,
  to_status text not null,
  actor_type text not null,
  note text,
  created_at timestamptz not null default now(),
  constraint order_lifecycle_events_actor_type_check check (actor_type in ('system', 'admin', 'webhook'))
);

create table app.reviews (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references app.profiles (id) on delete cascade,
  product_id uuid not null,
  order_id uuid not null references app.orders (id) on delete cascade,
  order_item_id uuid not null references app.order_items (id) on delete cascade,
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  rating integer not null,
  title text,
  body text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reviews_product_profile_fk foreign key (product_id, profile_id) references app.products (id, profile_id) on delete cascade,
  constraint reviews_rating_check check (rating between 1 and 5),
  constraint reviews_status_check check (status in ('active', 'deleted'))
);

create unique index reviews_one_active_per_order_item
  on app.reviews (order_item_id)
  where status = 'active';

create table app.admin_sessions (
  id uuid primary key default gen_random_uuid(),
  session_token_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint admin_sessions_token_unique unique (session_token_hash),
  constraint admin_sessions_expires_check check (expires_at > created_at)
);

create table app.runtime_debug_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references app.profiles (id) on delete set null,
  order_id uuid references app.orders (id) on delete cascade,
  payment_session_id uuid references app.payment_sessions (id) on delete cascade,
  level text not null,
  category text not null,
  message text not null,
  context_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint runtime_debug_logs_level_check check (level in ('debug', 'info', 'warn', 'error'))
);

comment on table app.runtime_debug_logs is
  'Sanitized runtime debug logs only. Do not store secrets, access tokens, full card data, or private credentials.';

create index categories_profile_active_sort_idx on app.categories (profile_id, is_active, sort_order);
create index products_catalog_lookup_idx on app.products (profile_id, category_id, release_status, is_active);
create index products_hot_sale_idx on app.products (profile_id, is_hot_sale) where is_hot_sale and is_active;
create index product_prices_lookup_idx on app.product_prices (product_id, market_id, is_active);
create index product_images_product_sort_idx on app.product_images (product_id, sort_order);
create index release_events_calendar_idx on app.release_events (profile_id, market_id, event_date, event_type);
create index homepage_sections_lookup_idx on app.homepage_sections (profile_id, market_id, is_active, sort_order);

create index stores_market_active_idx on app.stores (market_id, is_active);
create index store_pickup_dates_lookup_idx on app.store_pickup_dates (market_id, store_id, pickup_date);
create index central_inventory_lookup_idx on app.central_inventory (profile_id, market_id, product_id);
create index store_inventory_lookup_idx on app.store_inventory (profile_id, market_id, store_id, product_id);

create index addresses_user_idx on app.addresses (auth_user_id);
create index saved_payment_methods_user_status_idx on app.saved_payment_methods (auth_user_id, status);
create index guest_order_access_lookup_idx on app.guest_order_access (guest_email_hash, lookup_token_hash);

create index carts_scope_status_idx on app.carts (profile_id, market_id, auth_user_id, status);
create index cart_items_cart_idx on app.cart_items (cart_id);
create index checkout_drafts_scope_status_idx on app.checkout_drafts (profile_id, market_id, status, updated_at);

create index promo_rules_lookup_idx on app.promo_rules (profile_id, market_id, promo_type, is_active, priority);
create index promo_rule_regions_lookup_idx on app.promo_rule_regions (profile_id, market_id, country_code, state, county, postal_code_prefix);
create index promo_rule_products_lookup_idx on app.promo_rule_products (profile_id, market_id, product_id, category_id);
create index promo_evaluations_checkout_order_idx on app.promo_evaluations (checkout_draft_id, order_id, created_at);
create index promo_evaluation_lines_lookup_idx on app.promo_evaluation_lines (promo_evaluation_id, evaluation_status);
create index tax_rates_lookup_idx on app.tax_rates (market_id, country_code, state, county, postal_code_prefix) where is_active;
create unique index shipping_options_market_service_region_unique
  on app.shipping_options (market_id, country_code, coalesce(state, ''), coalesce(county, ''), service_code);
create index shipping_options_lookup_idx on app.shipping_options (market_id, country_code, state, county) where is_active;

create index orders_user_status_created_idx on app.orders (auth_user_id, status, created_at);
create index orders_guest_email_idx on app.orders (guest_email, created_at) where guest_email is not null;
create index orders_scope_status_idx on app.orders (profile_id, market_id, status, created_at);
create index order_items_order_idx on app.order_items (order_id);
create index payment_sessions_order_status_created_idx on app.payment_sessions (order_id, status, created_at);
create index total_snapshots_checkout_order_idx on app.total_snapshots (checkout_draft_id, order_id, created_at);
create index paypal_order_snapshots_payment_session_idx on app.paypal_order_snapshots (payment_session_id, created_at);
create index webhook_events_admin_idx on app.webhook_events (provider, event_type, received_at);
create index order_lifecycle_events_order_created_idx on app.order_lifecycle_events (order_id, created_at);
create index reviews_product_status_created_idx on app.reviews (profile_id, product_id, status, created_at);
create index admin_sessions_token_idx on app.admin_sessions (session_token_hash, expires_at);
create index runtime_debug_logs_lookup_idx on app.runtime_debug_logs (profile_id, order_id, payment_session_id, created_at);

create trigger profiles_set_updated_at before update on app.profiles for each row execute function app.set_updated_at();
create trigger markets_set_updated_at before update on app.markets for each row execute function app.set_updated_at();
create trigger categories_set_updated_at before update on app.categories for each row execute function app.set_updated_at();
create trigger products_set_updated_at before update on app.products for each row execute function app.set_updated_at();
create trigger product_prices_set_updated_at before update on app.product_prices for each row execute function app.set_updated_at();
create trigger homepage_sections_set_updated_at before update on app.homepage_sections for each row execute function app.set_updated_at();
create trigger stores_set_updated_at before update on app.stores for each row execute function app.set_updated_at();
create trigger store_pickup_dates_set_updated_at before update on app.store_pickup_dates for each row execute function app.set_updated_at();
create trigger central_inventory_set_updated_at before update on app.central_inventory for each row execute function app.set_updated_at();
create trigger store_inventory_set_updated_at before update on app.store_inventory for each row execute function app.set_updated_at();
create trigger user_profiles_set_updated_at before update on app.user_profiles for each row execute function app.set_updated_at();
create trigger addresses_set_updated_at before update on app.addresses for each row execute function app.set_updated_at();
create trigger saved_payment_methods_set_updated_at before update on app.saved_payment_methods for each row execute function app.set_updated_at();
create trigger guest_order_access_set_updated_at before update on app.guest_order_access for each row execute function app.set_updated_at();
create trigger carts_set_updated_at before update on app.carts for each row execute function app.set_updated_at();
create trigger cart_items_set_updated_at before update on app.cart_items for each row execute function app.set_updated_at();
create trigger checkout_drafts_set_updated_at before update on app.checkout_drafts for each row execute function app.set_updated_at();
create trigger promo_rules_set_updated_at before update on app.promo_rules for each row execute function app.set_updated_at();
create trigger tax_rates_set_updated_at before update on app.tax_rates for each row execute function app.set_updated_at();
create trigger shipping_options_set_updated_at before update on app.shipping_options for each row execute function app.set_updated_at();
create trigger orders_set_updated_at before update on app.orders for each row execute function app.set_updated_at();
create trigger payment_sessions_set_updated_at before update on app.payment_sessions for each row execute function app.set_updated_at();
create trigger reviews_set_updated_at before update on app.reviews for each row execute function app.set_updated_at();

alter table app.profiles enable row level security;
alter table app.markets enable row level security;
alter table app.categories enable row level security;
alter table app.products enable row level security;
alter table app.product_prices enable row level security;
alter table app.product_images enable row level security;
alter table app.release_events enable row level security;
alter table app.homepage_sections enable row level security;
alter table app.stores enable row level security;
alter table app.store_pickup_dates enable row level security;
alter table app.central_inventory enable row level security;
alter table app.store_inventory enable row level security;
alter table app.user_profiles enable row level security;
alter table app.addresses enable row level security;
alter table app.saved_payment_methods enable row level security;
alter table app.guest_order_access enable row level security;
alter table app.carts enable row level security;
alter table app.cart_items enable row level security;
alter table app.checkout_drafts enable row level security;
alter table app.promo_rules enable row level security;
alter table app.promo_rule_regions enable row level security;
alter table app.promo_rule_products enable row level security;
alter table app.promo_compatibility enable row level security;
alter table app.promo_evaluations enable row level security;
alter table app.promo_evaluation_lines enable row level security;
alter table app.tax_rates enable row level security;
alter table app.shipping_options enable row level security;
alter table app.orders enable row level security;
alter table app.order_items enable row level security;
alter table app.order_addresses enable row level security;
alter table app.total_snapshots enable row level security;
alter table app.payment_sessions enable row level security;
alter table app.paypal_order_snapshots enable row level security;
alter table app.webhook_events enable row level security;
alter table app.order_lifecycle_events enable row level security;
alter table app.reviews enable row level security;
alter table app.admin_sessions enable row level security;
alter table app.runtime_debug_logs enable row level security;

revoke all on schema app from anon, authenticated;
revoke all on all tables in schema app from anon, authenticated;
revoke all on all functions in schema app from anon, authenticated;
grant usage on schema app to service_role;
grant all privileges on all tables in schema app to service_role;
grant all privileges on all functions in schema app to service_role;

alter default privileges in schema app revoke all on tables from anon, authenticated;
alter default privileges in schema app revoke all on functions from anon, authenticated;
alter default privileges in schema app grant all privileges on tables to service_role;
alter default privileges in schema app grant all privileges on functions to service_role;

comment on table app.central_inventory is
  'Delivery inventory decrements after payment capture. V1 does not reserve inventory before payment completes.';
comment on table app.store_inventory is
  'Pickup inventory decrements after BOPIS payment capture for paid pickup items only. V1 does not reserve inventory before payment completes.';

commit;
