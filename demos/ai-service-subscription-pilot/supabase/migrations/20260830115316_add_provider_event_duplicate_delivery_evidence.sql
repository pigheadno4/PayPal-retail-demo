alter table app_private.provider_events
  add column duplicate_delivery_count integer not null default 0,
  add column last_duplicate_received_at timestamptz,
  add constraint provider_events_duplicate_delivery_count_nonnegative
    check (duplicate_delivery_count >= 0);
