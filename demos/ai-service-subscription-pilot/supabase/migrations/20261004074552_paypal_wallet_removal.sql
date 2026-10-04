alter table app_private.payment_methods
  add column removal_state text not null default 'none'
    check (removal_state in ('none', 'removing', 'removed', 'rejected', 'unknown')),
  add column removal_started_at timestamptz,
  add column removed_at timestamptz,
  add constraint payment_methods_removal_block check (
    removal_state = 'none' or (readiness = 'failed' and not is_primary)
  ),
  add constraint payment_methods_removal_confirmation check (
    (removal_state = 'removed') = (removed_at is not null)
  ),
  add constraint payment_methods_removal_started check (
    (removal_state = 'none') = (removal_started_at is null)
  );
