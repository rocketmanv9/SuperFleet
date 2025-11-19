create or replace function public.get_user_vehicles()
returns jsonb
language plpgsql
security definer
as $$
declare
  uid uuid := auth.uid();
  result jsonb;
begin
  -- Return all vehicles where the user is a member of the vehicle’s organization
  select jsonb_agg(
    jsonb_build_object(
      'id', v.id,
      'organization_id', v.organization_id,
      'make', v.make,
      'model', v.model,
      'year', v.year,
      'engine', v.engine,
      'nickname', v.nickname,
      'vin', v.vin,
      'odometer', v.odometer,
      'template_id', v.template_id,
      'image_url', v.image_url,
      'metadata', v.metadata,
      'created_at', v.created_at,

      -- Include summary counts
      'maintenance_summary', jsonb_build_object(
        'total_items', (
          select count(*)
          from maintenance_items mi
          where mi.vehicle_id = v.id
            and mi.deleted_at is null
        ),
        'completed_logs', (
          select count(*)
          from maintenance_logs ml
          join maintenance_items mi2
            on ml.maintenance_item_id = mi2.id
          where mi2.vehicle_id = v.id
        ),
        'overdue_items', (
          select count(*)
          from maintenance_items mi3
          where mi3.vehicle_id = v.id
            and mi3.deleted_at is null
            and (
              (mi3.next_due_mileage is not null and v.odometer >= mi3.next_due_mileage)
              or
              (mi3.next_due_date is not null and now()::date >= mi3.next_due_date)
            )
        )
      )
    )
    order by v.created_at desc
  )
  into result
  from vehicles v
  join organization_members om
    on om.organization_id = v.organization_id
  where om.user_id = uid;

  return coalesce(result, '[]'::jsonb);
end;
$$;