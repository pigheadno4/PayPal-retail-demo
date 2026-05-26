# PayPal Retail Demo Data Model

## Purpose
This document defines the draft Supabase data model for the PayPal retail demo before implementation. It is a planning artifact, not a migration file.

## Design Rules
- Use one shared schema for `popmart` and `generic`; profile-specific business data is filtered by `profile_id`.
- Store money as integer minor units plus `currency_code`.
- Never calculate promo, tax, or payment totals from browser-submitted amounts.
- Store order/payment snapshots because pending resume and payment capture must not depend only on live cart data.
- Shipping fee is excluded from promo and tax calculations.
- Guest checkout is allowed, but guest vaulting is not allowed.
- Addresses and saved payment methods are user-level and shared across profiles.
- Products and reviews are profile-scoped.
- Markets, stores, pickup dates, tax rates, and shipping options are shared reference data by market.
- Prices, carts, checkout drafts, orders, inventory, promos, release events, and homepage content are profile-and-market scoped where profile or market behavior can differ.
- Market switch is an Admin Portal demo control. It changes active profile/market context and active cart binding, but it never converts existing cart prices or pending order currency.

## Schema Strategy
Use a private schema named `app` for demo application tables.

The frontend talks to Express APIs. Express owns database access and enforces:
- active profile and market scope
- buyer ownership
- guest cart secret checks
- guest order lookup checks
- admin passcode session checks
- payment-session amount consistency

If any `app` table is later exposed to Supabase Data API, add explicit grants and RLS policies before exposure.

## Shared Reference Tables

### `app.profiles`
Stores demo profiles.

Key fields:
- `id`
- `slug`: `popmart` or `generic`
- `display_name`
- `brand_mode`
- `is_default`
- `created_at`
- `updated_at`

### `app.markets`
Stores market/currency configuration.

Key fields:
- `id`
- `code`: example `US`
- `currency_code`: example `USD`
- `locale`: example `en-US`
- `language_code`: example `en`
- `buyer_country`: example `US`
- `paypal_page_type`: default PayPal page type hint for eligibility/message context
- `paylater_enabled`
- `paylater_buyer_country`: explicit buyer country for Pay Later messages when required
- `sandbox_test_buyer_country`: sandbox-only buyer-country simulation value for PayPal JS SDK v6
- `paypal_components_json`: enabled SDK v6 components for this market
- `payment_method_flags_json`: configured method hints before runtime eligibility
- `market_version`: increment when market payment config changes so frontend PayPal provider can remount
- `is_default`
- `created_at`
- `updated_at`

Notes:
- Market rows are shared across profiles. Profile-specific tables reference the same market rows when they need product, promo, cart, or order behavior per profile.
- `buyer_country` drives buyer-market behavior and funding eligibility context.
- `sandbox_test_buyer_country` exists to simulate the buyer environment in PayPal sandbox for JS SDK v6. The frontend maps it to SDK v6 `createInstance({ testBuyerCountry })`. It must be null or ignored in production.
- Runtime eligibility remains the final source for rendering PayPal payment methods.

## Catalog Tables

### `app.categories`
Key fields:
- `id`
- `profile_id`
- `slug`
- `name`
- `description`
- `image_path`
- `sort_order`
- `is_active`

Seed target: 5 categories per profile.

### `app.products`
Key fields:
- `id`
- `profile_id`
- `category_id`
- `slug`
- `sku`
- `name`
- `series_name`
- `description`
- `short_description`
- `release_status`: `released`, `coming_soon`, `unreleased`
- `release_date`
- `is_hot_sale`
- `is_featured`
- `is_active`
- `max_quantity_per_order`

Seed target: 25 products per profile.

### `app.product_prices`
Stores market-specific product prices.

Key fields:
- `id`
- `profile_id`
- `market_id`
- `product_id`
- `currency_code`
- `regular_price_minor`
- `current_price_minor`
- `starts_at`
- `ends_at`
- `is_active`
- `created_at`
- `updated_at`

Rules:
- Every active product must have one active price row per seeded market.
- `current_price_minor` is the active merchandise price before promo discounts.
- If a product is not on sale, `current_price_minor` equals `regular_price_minor`.
- Promo and tax calculations use `current_price_minor`; promo applies before tax, and shipping fee is excluded from both promo and tax.

### `app.product_images`
Key fields:
- `id`
- `product_id`
- `image_path`
- `alt_text`
- `sort_order`

Seed target: 3-4 images per product.

### `app.release_events`
Key fields:
- `id`
- `profile_id`
- `market_id`
- `product_id`
- `event_date`
- `event_type`: `release`, `new_arrival`, `promo`, `preorder_end`
- `calendar_label`

Calendar dates with release activity render as outlined/unfilled circles.

### `app.homepage_sections`
Key fields:
- `id`
- `profile_id`
- `market_id`
- `section_key`
- `title`
- `subtitle`
- `content_json`
- `sort_order`
- `is_active`

Used for hero, hot sales, category rail, calendar, promo cards, popular series, and footer content.

## Store And Inventory Tables

### `app.stores`
Key fields:
- `id`
- `market_id`
- `slug`
- `name`
- `phone`
- `address_line1`
- `address_line2`
- `city`
- `state`
- `postal_code`
- `country_code`
- `latitude`
- `longitude`
- `is_active`

Seed target: 9 stores per seeded market, shared across profiles.

Distance calculation:
- Use seeded latitude/longitude and a deterministic Haversine helper.
- If a guest only enters ZIP/postcode, use a seeded postal centroid table or a simple seeded mapping to approximate location.
- If no location is available, preselect a seeded fallback store with full inventory.

### `app.store_pickup_dates`
Key fields:
- `id`
- `market_id`
- `store_id`
- `pickup_date`
- `capacity`
- `is_available`

Pickup calendar is date-only in v1. `market_id` must match the selected store's market and is kept for simple filtering/indexing.

### `app.central_inventory`
Key fields:
- `id`
- `profile_id`
- `market_id`
- `product_id`
- `available_quantity`
- `updated_at`

Delivery orders decrement central inventory after payment completes.

### `app.store_inventory`
Key fields:
- `id`
- `profile_id`
- `market_id`
- `store_id`
- `product_id`
- `available_quantity`
- `updated_at`

BOPIS orders decrement selected store inventory only for paid pickup items. Store rows are shared by market, but inventory stays profile-scoped because products are profile-scoped.

## Buyer Tables

### `app.user_profiles`
Key fields:
- `id`
- `auth_user_id`
- `email`
- `display_name`
- `created_at`
- `updated_at`

Supabase Auth remains source of truth for login identity.

### `app.addresses`
Key fields:
- `id`
- `auth_user_id`
- `label`
- `recipient_name`
- `phone`
- `address_line1`
- `address_line2`
- `city`
- `state`
- `postal_code`
- `country_code`
- `is_default_shipping`
- `is_default_billing`
- `created_at`
- `updated_at`

One address can be both default shipping and default billing. Default address cannot be deleted until another default is selected.

### `app.saved_payment_methods`
Key fields:
- `id`
- `auth_user_id`
- `provider`: `paypal`
- `method_type`: `paypal_wallet`, `card`
- `status`: `active`, `pending`, `disabled`, `deleted`
- `vault_id`
- `paypal_customer_id`
- `brand`
- `last4`
- `expiry_month`
- `expiry_year`
- `label`
- `created_at`
- `updated_at`

Saved payment methods are shared across profiles and can be deleted from account settings.

### `app.guest_order_access`
Stores guest lookup metadata without requiring a buyer account.

Key fields:
- `id`
- `order_id`
- `guest_email_hash`
- `lookup_token_hash`
- `lookup_attempt_count`
- `last_lookup_at`
- `created_at`
- `updated_at`

Rules:
- Guest order lookup requires order number plus email.
- Store normalized email hashes for matching; do not expose internal order IDs in guest URLs.
- Lookup tokens are optional for emailed links and must be hashed if used.

## Cart And Checkout Tables

### `app.carts`
Key fields:
- `id`
- `profile_id`
- `market_id`
- `auth_user_id`
- `cart_public_id`
- `cart_secret_hash`
- `status`: `active`, `merged`, `abandoned`, `converted`
- `last_seen_at`
- `created_at`
- `updated_at`

Anonymous browser stores only `cart_public_id` and a client secret locally.

Market switch rules:
- Browser localStorage stores the active server cart ID/secret for the current `profile_id + market_id`.
- When Admin switches profile or market, the browser clears the active cart binding and fetches or creates a cart for the new context.
- Existing carts remain in the database under their original market and can be revisited only by restoring that market context.
- Cart prices are never converted across currencies.

### `app.cart_items`
Key fields:
- `id`
- `cart_id`
- `product_id`
- `quantity`
- `unit_price_minor_snapshot`
- `created_at`
- `updated_at`

### `app.checkout_drafts`
Key fields:
- `id`
- `profile_id`
- `market_id`
- `cart_id`
- `auth_user_id`
- `guest_email`
- `fulfillment_mode`: `delivery`, `pickup`
- `delivery_state_json`
- `pickup_state_json`
- `selected_promo_evaluation_id`
- `currency_code`
- `locale`
- `buyer_country`
- `sandbox_test_buyer_country`
- `status`: `draft`, `payment_started`, `converted`, `abandoned`
- `created_at`
- `updated_at`

Delivery and Pickup tab state is preserved separately before payment starts.

## Promo, Tax, Shipping Tables

### `app.promo_rules`
Key fields:
- `id`
- `profile_id`
- `market_id`
- `code`
- `title`
- `description`
- `promo_type`: `auto`, `manual`
- `discount_type`: `percent`, `fixed_amount`
- `discount_value`
- `min_merchandise_subtotal_minor`
- `starts_at`
- `ends_at`
- `is_stackable`
- `priority`
- `is_active`

Promo discounts apply to merchandise only. Shipping fee is not part of promo eligibility or discount base.

### `app.promo_rule_regions`
Scopes promos by country/state/county/postal prefix.

Key fields:
- `id`
- `profile_id`
- `market_id`
- `promo_rule_id`
- `country_code`
- `state`
- `county`
- `postal_code_prefix`
- `include_exclude`: `include`, `exclude`
- `created_at`

Used for promos that vary by state, county, or country. Region matching uses shipping address for delivery and the configured pickup tax/promo context for BOPIS.

### `app.promo_rule_products`
Scopes promos by product or category.

Key fields:
- `id`
- `profile_id`
- `market_id`
- `promo_rule_id`
- `product_id`
- `category_id`
- `include_exclude`: `include`, `exclude`
- `created_at`

Used for category-specific, product-specific, and exclusion promos.

### `app.promo_compatibility`
Key fields:
- `id`
- `profile_id`
- `market_id`
- `promo_rule_id`
- `compatible_promo_rule_id`
- `compatibility`: `compatible`, `exclusive`

Used to compare sets like `A` alone versus `B + C`.

### `app.promo_evaluations`
Key fields:
- `id`
- `profile_id`
- `market_id`
- `checkout_draft_id`
- `order_id`
- `evaluation_context_json`
- `matched_promos_json`
- `rejected_promos_json`
- `candidate_sets_json`
- `recommended_set_json`
- `selected_set_json`
- `merchandise_discount_minor`
- `taxable_subtotal_minor`
- `final_total_minor`
- `created_at`

Resume order creates a fresh evaluation if promos expired or context changed.

### `app.promo_evaluation_lines`
Queryable explanation rows for Admin Portal and debug views.

Key fields:
- `id`
- `promo_evaluation_id`
- `promo_rule_id`
- `code_snapshot`
- `evaluation_status`: `candidate`, `recommended`, `selected`, `applied`, `rejected`
- `rejection_reason`: example `expired`, `below_minimum`, `region_not_match`, `product_excluded`, `exclusive_conflict`
- `stack_group`
- `discount_minor`
- `taxable_subtotal_effect_minor`
- `final_total_effect_minor`
- `explanation`
- `sort_order`
- `created_at`

Rules:
- `candidate_sets_json` remains the immutable raw snapshot used for replay/debug.
- `promo_evaluation_lines` makes the same evaluation easy to query and display in Admin, including why each promo code was applied or rejected.
- Buyer UI should show only buyer-safe promo results, not internal debug reasons unless intentionally exposed.

### `app.tax_rates`
Key fields:
- `id`
- `market_id`
- `country_code`
- `state`
- `county`
- `postal_code_prefix`
- `rate_bps`
- `is_active`

Simple estimated tax only. Tax applies after promo discounts and excludes shipping. Tax rows are shared across profiles within the same market.

### `app.shipping_options`
Key fields:
- `id`
- `market_id`
- `country_code`
- `state`
- `county`
- `service_code`
- `display_name`
- `amount_minor`
- `estimated_days_min`
- `estimated_days_max`
- `is_active`

Cheapest eligible option is selected by default. Shipping option rows are shared across profiles within the same market.

## Order And Payment Tables

### `app.orders`
Key fields:
- `id`
- `profile_id`
- `market_id`
- `order_number`
- `order_number_prefix`: `DO` for delivery, `PO` for pickup/BOPIS
- `order_number_sequence`
- `auth_user_id`
- `guest_email`
- `cart_id`
- `checkout_draft_id`
- `fulfillment_mode`: `delivery`, `pickup`
- `status`: `pending`, `paid`, `processing`, `shipped`, `delivered`, `preparing_pickup`, `ready_for_pickup`, `picked_up`, `cancelled`
- `payment_status`: `not_started`, `started`, `approved`, `captured`, `failed`, `cancelled`
- `currency_code`
- `locale`
- `buyer_country`
- `sandbox_test_buyer_country`
- `subtotal_minor`
- `discount_minor`
- `tax_minor`
- `shipping_minor`
- `total_minor`
- `created_at`
- `updated_at`

Pending means payment session started but payment did not complete.

Order number rules:
- Delivery orders use `DO-YYYYMMDD-000001`.
- Pickup/BOPIS orders use `PO-YYYYMMDD-000001`.
- The buyer-facing `order_number` stays stable when a pending order is resumed.
- PayPal `invoice_id` uses the stable order number for the first attempt and adds an attempt suffix when a fresh PayPal order is needed for the same pending order.

### `app.order_items`
Key fields:
- `id`
- `order_id`
- `product_id`
- `product_sku_snapshot`
- `product_name_snapshot`
- `product_description_snapshot`
- `product_url_snapshot`
- `product_image_url_snapshot`
- `unit_price_minor`
- `quantity`
- `fulfillable_quantity`
- `unavailable_quantity`
- `line_subtotal_minor`
- `line_discount_minor`
- `line_tax_minor`
- `line_total_minor`

BOPIS partial inventory uses `fulfillable_quantity` and `unavailable_quantity`.

### `app.order_addresses`
Key fields:
- `id`
- `order_id`
- `address_type`: `shipping`, `billing`, `pickup_store`
- `recipient_name`
- `phone`
- `address_line1`
- `address_line2`
- `city`
- `state`
- `postal_code`
- `country_code`

### `app.total_snapshots`
Stores calculated total snapshots for checkout drafts, PayPal shipping updates, final review, capture, and pending resume comparison.

Key fields:
- `id`
- `checkout_draft_id`
- `order_id`
- `payment_session_id`
- `fulfillment_mode`: `delivery`, `pickup`
- `calculation_stage`: `checkout_draft`, `paypal_shipping_update`, `review_confirm`, `capture`
- `currency_code`
- `merchandise_subtotal_minor`
- `product_discount_minor`
- `promo_discount_minor`
- `taxable_subtotal_minor`
- `tax_minor`
- `shipping_minor`
- `total_minor`
- `promo_evaluation_id`
- `calculation_context_json`
- `created_at`

Rules:
- At least one of `checkout_draft_id` or `order_id` is required.
- Before an order exists, checkout writes snapshots linked to `checkout_draft_id`.
- After payment starts, snapshots also link to `order_id`; payment-specific snapshots can link to `payment_session_id`.
- Shipping is stored as a separate line and is excluded from promo and tax calculations.
- Pending order resume creates a fresh total snapshot after revalidation.
- `orders` keeps the current buyer-facing totals; `total_snapshots` keeps calculation history for Admin debug.

### `app.payment_sessions`
Key fields:
- `id`
- `order_id`
- `provider`: `paypal`
- `method`: `paypal`, `paylater`, `card`, `apple_pay`, `google_pay`, `venmo`
- `status`: `created`, `approved`, `captured`, `failed`, `cancelled`, `expired`
- `attempt_number`
- `paypal_order_id`
- `paypal_capture_id`
- `paypal_invoice_id`
- `paypal_request_id`
- `vault_requested`
- `merchant_total_minor`
- `provider_total_minor`
- `amount_consistency_status`
- `currency_code`
- `locale`
- `buyer_country`
- `sandbox_test_buyer_country`
- `paypal_config_snapshot_json`
- `created_at`
- `updated_at`

### `app.paypal_order_snapshots`
Key fields:
- `id`
- `payment_session_id`
- `paypal_invoice_id`
- `paypal_request_id`
- `request_json`
- `response_json`
- `merchant_snapshot_json`
- `created_at`

Keep request/response snapshots for Admin debug. Do not store access tokens. Snapshots should include item-level fields passed to PayPal so Admin can explain what buyers see in PayPal.

### `app.webhook_events`
Key fields:
- `id`
- `provider`: `paypal`
- `event_id`
- `event_type`
- `verification_status`: `valid`, `invalid`, `error`
- `headers_json`
- `payload_json`
- `linked_order_id`
- `linked_payment_session_id`
- `processing_status`: `received`, `processed`, `ignored`, `failed`
- `received_at`
- `processed_at`

Invalid or unverifiable webhooks must not mutate state.

### `app.order_lifecycle_events`
Key fields:
- `id`
- `order_id`
- `from_status`
- `to_status`
- `actor_type`: `system`, `admin`, `webhook`
- `note`
- `created_at`

## Reviews And Admin Tables

### `app.reviews`
Key fields:
- `id`
- `profile_id`
- `product_id`
- `order_id`
- `order_item_id`
- `auth_user_id`
- `rating`
- `title`
- `body`
- `status`: `active`, `deleted`
- `created_at`
- `updated_at`

One active review per user/order item.

### `app.admin_sessions`
Key fields:
- `id`
- `session_token_hash`
- `expires_at`
- `created_at`
- `last_seen_at`

Admin auth is separate from buyer auth.

### `app.runtime_debug_logs`
Key fields:
- `id`
- `profile_id`
- `order_id`
- `payment_session_id`
- `level`
- `category`
- `message`
- `context_json`
- `created_at`

Debug logs may include IDs and calculated amounts, but never secrets, access tokens, full card data, or private credentials.

## Constraints And Indexes

Implementation should add explicit database constraints even though this document is not a migration file.

Foreign keys:
- Every `*_id` points to its parent table.
- Child rows such as cart items, order items, promo evaluation lines, total snapshots, payment sessions, webhook events, and debug logs should not survive without their parent business record.
- Orders, payment sessions, webhook events, reviews, and saved payment tokens should use soft lifecycle/status changes instead of hard deletes in normal demo flows.

Required uniqueness:
- `profiles.slug`
- `markets.code`
- `categories(profile_id, slug)`
- `products(profile_id, sku)` and `products(profile_id, slug)`
- One active `product_prices(product_id, market_id)` row at a time.
- `stores(market_id, slug)`
- `central_inventory(profile_id, market_id, product_id)`
- `store_inventory(profile_id, market_id, store_id, product_id)`
- `cart_public_id`, plus one active signed-in cart per `profile_id + market_id + auth_user_id`.
- `orders.order_number`
- `payment_sessions.paypal_invoice_id` when present, because PayPal checks duplicate invoice IDs during order creation.
- `webhook_events(provider, event_id)`
- One active review per `order_item_id`.

Validation checks:
- Money, quantity, inventory, tax, and shipping amount columns must be non-negative.
- `current_price_minor` is the active merchandise price; promo and tax logic starts from current merchandise price, applies promo discounts, then calculates tax on the discounted merchandise subtotal.
- Shipping amount is always stored separately and excluded from promo and tax calculation bases.
- `total_snapshots` must have at least one owner: `checkout_draft_id` or `order_id`.
- Store-linked rows must use a `market_id` that matches the referenced store's market.

Indexes for demo performance:
- Catalog lookup: `products(profile_id, category_id, release_status, is_active)`, `product_prices(product_id, market_id, is_active)`.
- Store pickup lookup: `stores(market_id, is_active)`, `store_inventory(profile_id, market_id, store_id, product_id)`, `store_pickup_dates(market_id, store_id, pickup_date)`.
- Cart and checkout: `carts(profile_id, market_id, auth_user_id, status)`, `cart_items(cart_id)`, `checkout_drafts(profile_id, market_id, status, updated_at)`.
- Orders and resume: `orders(auth_user_id, status, created_at)`, `orders(guest_email, guest_lookup_token_hash)`, `payment_sessions(order_id, status, created_at)`.
- Promo debug: `promo_evaluations(checkout_draft_id, order_id, created_at)`, `promo_evaluation_lines(promo_evaluation_id, evaluation_status)`.
- Admin/debug: `webhook_events(provider, event_type, received_at)`, `runtime_debug_logs(profile_id, order_id, payment_session_id, created_at)`.

## Seed Plan
Seed both profiles:
- shared active market rows with currency, locale, buyer country, Pay Later buyer country, sandbox test buyer country, and SDK component settings
- 5 categories per profile
- 25 products per profile
- one active price row per product per seeded market
- 3-4 images per product
- 9 stores per seeded market, shared across profiles
- central inventory for every product
- store inventory with full and partial pickup scenarios
- store-specific pickup dates
- 5 shared Supabase Auth users
- default shipping/billing addresses for seeded users
- shared tax rates by country/state/county
- shared shipping options by destination
- auto and manual promo rules, including compatible/exclusive sets, region scopes, and product/category scopes
- reviews for released products
- sample pending and completed orders if useful for Admin Portal demos
- guest order access rows for seeded guest orders if guest lookup examples are seeded

Initial seed uses service role credentials from local environment only. Do not commit service credentials.
