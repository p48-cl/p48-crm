-- crm_26 · Cotizaciones: sin USD (facturación en CLP) y guardado transaccional.
-- Las cotizaciones son referencia editable; la factura se emite en CLP.

-- 1. Monedas permitidas: CLP (predeterminada) y UF (con snapshot). Sin USD.
--    Verificado antes de aplicar: no hay cotizaciones en USD.
alter table public.cotizaciones drop constraint if exists cotizaciones_moneda_check;
alter table public.cotizaciones add constraint cotizaciones_moneda_check
  check (moneda in ('CLP', 'UF'));
alter table public.cotizaciones alter column moneda set default 'CLP';

-- 2. Guardado atómico: cabecera + líneas en una sola transacción.
--    Si falla una línea, se revierte todo (antes quedaba la cabecera sin líneas).
--    security invoker: aplica las mismas RLS que las tablas.
create or replace function public.guardar_cotizacion(p_id uuid, p_cab jsonb, p_items jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid := p_id;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La cotización necesita al menos una línea';
  end if;

  if p_id is null then
    insert into public.cotizaciones (
      empresa_id, oportunidad_id, titulo, estado, validez_dias, moneda, uf_valor, uf_fecha,
      iva_pct, condicion_comision, condiciones_comerciales, notas_internas, creada_por
    ) values (
      (p_cab->>'empresa_id')::uuid,
      nullif(p_cab->>'oportunidad_id', '')::uuid,
      p_cab->>'titulo',
      p_cab->>'estado',
      (p_cab->>'validez_dias')::integer,
      p_cab->>'moneda',
      nullif(p_cab->>'uf_valor', '')::numeric,
      nullif(p_cab->>'uf_fecha', '')::date,
      (p_cab->>'iva_pct')::numeric,
      coalesce(p_cab->>'condicion_comision', ''),
      coalesce(p_cab->>'condiciones_comerciales', ''),
      nullif(p_cab->>'notas_internas', ''),
      nullif(p_cab->>'creada_por', '')::uuid
    )
    returning id into v_id;
  else
    update public.cotizaciones set
      oportunidad_id = nullif(p_cab->>'oportunidad_id', '')::uuid,
      titulo = p_cab->>'titulo',
      estado = p_cab->>'estado',
      validez_dias = (p_cab->>'validez_dias')::integer,
      moneda = p_cab->>'moneda',
      uf_valor = nullif(p_cab->>'uf_valor', '')::numeric,
      uf_fecha = nullif(p_cab->>'uf_fecha', '')::date,
      iva_pct = (p_cab->>'iva_pct')::numeric,
      condicion_comision = coalesce(p_cab->>'condicion_comision', ''),
      condiciones_comerciales = coalesce(p_cab->>'condiciones_comerciales', ''),
      notas_internas = nullif(p_cab->>'notas_internas', '')
    where id = p_id;
    if not found then
      raise exception 'Cotización no encontrada o sin permiso';
    end if;
    delete from public.cotizacion_items where cotizacion_id = p_id;
  end if;

  insert into public.cotizacion_items (cotizacion_id, orden, concepto, plan, cantidad, precio_neto, recurrente)
  select v_id, x.orden, x.concepto, nullif(x.plan, ''), x.cantidad, x.precio_neto, x.recurrente
  from jsonb_to_recordset(p_items) as x(
    orden integer, concepto text, plan text, cantidad numeric, precio_neto numeric, recurrente boolean
  );

  return v_id;
end $$;

revoke execute on function public.guardar_cotizacion(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.guardar_cotizacion(uuid, jsonb, jsonb) to authenticated;
