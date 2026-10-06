alter table app_private.checkout_intents
  add column purpose text not null default 'initial',
  add column reactivation_arrangement_id bigint references app_private.billing_arrangements(id),
  add constraint checkout_intents_reactivation_purpose check (
    (purpose='initial' and reactivation_arrangement_id is null)
    or (purpose='reactivation' and reactivation_arrangement_id is not null and account_id is not null)
  );
create index checkout_intents_reactivation_arrangement_idx on app_private.checkout_intents(reactivation_arrangement_id);

alter table app_private.quotes alter column renews_at drop not null,
  alter column allowance_resets_at drop not null,
  drop constraint quotes_lifecycle_order,
  add constraint quotes_lifecycle_order check (
    issued_at < expires_at and (
      (pricing_version='go-monthly-reactivation-v1' and renews_at is null and allowance_resets_at is null)
      or (pricing_version<>'go-monthly-reactivation-v1' and renews_at is not null and allowance_resets_at is not null
        and expires_at <= renews_at and renews_at <= allowance_resets_at)
    )
  );
alter table app_private.payment_operations
  add column reactivation_arrangement_id bigint references app_private.billing_arrangements(id),
  add column reactivation_previous_window_id bigint references app_private.allowance_windows(id),
  add column reactivation_state text,
  add column request_body_hash text,
  add column reactivation_capture_id text,
  add column reactivation_reconciled_at timestamptz,
  add constraint payment_operations_reactivation_shape check (
    (reactivation_arrangement_id is null and reactivation_previous_window_id is null and reactivation_state is null
      and request_body_hash is null and reactivation_capture_id is null and reactivation_reconciled_at is null)
    or (reactivation_arrangement_id is not null and reactivation_previous_window_id is not null
      and reactivation_state is not null and reactivation_state in ('claimed','pending','action_required','failed','confirmed')
      and request_body_hash is not null and request_body_hash ~ '^[a-f0-9]{64}$'
      and ((reactivation_state='confirmed' and reactivation_capture_id is not null)
        or (reactivation_state<>'confirmed' and reactivation_capture_id is null)))
  );
create unique index reactivation_one_obligation on app_private.payment_operations(reactivation_arrangement_id,reactivation_previous_window_id)
  where reactivation_state in ('claimed','pending','action_required','confirmed');
create unique index reactivation_capture_unique on app_private.payment_operations(merchant_id,environment,reactivation_capture_id)
  where reactivation_capture_id is not null;
create index reactivation_arrangement_idx on app_private.payment_operations(reactivation_arrangement_id);
create index reactivation_previous_window_idx on app_private.payment_operations(reactivation_previous_window_id);
alter table app_private.allowance_windows
  add column funding_payment_operation_id bigint references app_private.payment_operations(id),
  add column funding_quote_id bigint references app_private.quotes(id),
  add constraint allowance_windows_funding_pair check ((funding_payment_operation_id is null and funding_quote_id is null)
    or (funding_payment_operation_id is not null and funding_quote_id is not null));
create unique index allowance_windows_funding_operation_unique on app_private.allowance_windows(funding_payment_operation_id)
  where funding_payment_operation_id is not null;
create index allowance_windows_funding_quote_idx on app_private.allowance_windows(funding_quote_id);
