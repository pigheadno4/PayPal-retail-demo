begin;

create or replace function app.transition_admin_order_lifecycle(
  p_order_id uuid,
  p_expected_status text,
  p_next_status text,
  p_note text,
  p_occurred_at timestamptz
)
returns table (
  transition_status text,
  current_status text,
  order_data jsonb
)
language plpgsql
security invoker
set search_path = app, pg_catalog
as $$
declare
  v_order app.orders%rowtype;
begin
  update app.orders
  set
    status = p_next_status,
    updated_at = p_occurred_at
  where id = p_order_id
    and status = p_expected_status
  returning * into v_order;

  if found then
    insert into app.order_lifecycle_events (
      order_id,
      from_status,
      to_status,
      actor_type,
      note,
      created_at
    ) values (
      p_order_id,
      p_expected_status,
      p_next_status,
      'admin',
      p_note,
      p_occurred_at
    );

    return query
      select
        'updated'::text,
        v_order.status,
        jsonb_build_object(
          'id', v_order.id,
          'profile_id', v_order.profile_id,
          'market_id', v_order.market_id,
          'order_number', v_order.order_number,
          'fulfillment_mode', v_order.fulfillment_mode,
          'status', v_order.status,
          'payment_status', v_order.payment_status,
          'currency_code', v_order.currency_code,
          'subtotal_minor', v_order.subtotal_minor,
          'discount_minor', v_order.discount_minor,
          'tax_minor', v_order.tax_minor,
          'shipping_minor', v_order.shipping_minor,
          'total_minor', v_order.total_minor,
          'created_at', v_order.created_at,
          'updated_at', v_order.updated_at
        );
    return;
  end if;

  select *
  into v_order
  from app.orders
  where id = p_order_id;

  if not found then
    return query
      select 'not_found'::text, null::text, null::jsonb;
    return;
  end if;

  return query
    select 'stale'::text, v_order.status, null::jsonb;
end;
$$;

revoke all on function app.transition_admin_order_lifecycle(
  uuid,
  text,
  text,
  text,
  timestamptz
) from public, anon, authenticated;

grant execute on function app.transition_admin_order_lifecycle(
  uuid,
  text,
  text,
  text,
  timestamptz
) to service_role;

commit;
