alter table app.orders
  add column operation_lock_kind text,
  add column operation_lock_token text,
  add column operation_lock_expires_at timestamptz,
  add constraint orders_operation_lock_shape_check check (
    (
      operation_lock_kind is null
      and operation_lock_token is null
      and operation_lock_expires_at is null
    )
    or (
      operation_lock_kind in ('resume', 'capture')
      and operation_lock_token is not null
      and operation_lock_expires_at is not null
    )
  );

create index orders_operation_lock_expiry_idx
  on app.orders (operation_lock_expires_at)
  where operation_lock_token is not null;

comment on column app.orders.operation_lock_kind is
  'Short-lived server-only lease that serializes pending-order resume and capture.';

comment on column app.orders.operation_lock_token is
  'Opaque owner token for the active pending-order operation lease.';

comment on column app.orders.operation_lock_expires_at is
  'Lease expiry used to recover safely after a server interruption.';
