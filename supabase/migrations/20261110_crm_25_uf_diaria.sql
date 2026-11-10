-- crm_25 · Valor diario de la UF (Banco Central vía mindicador.cl)
-- Flujo: uf_pedir() pide el año a mindicador (pg_net, asíncrono) cada día;
-- uf_procesar() lee la respuesta y guarda los valores validados en uf_diaria.
-- Las cotizaciones en UF guardan un snapshot (uf_valor + uf_fecha) que no se recalcula.

create extension if not exists pg_net with schema extensions;

create table if not exists public.uf_diaria (
  fecha date primary key,
  valor numeric(12,2) not null check (valor > 0),
  fuente text not null default 'mindicador.cl (Banco Central de Chile)',
  cargado_en timestamptz not null default now()
);

create table if not exists public.uf_solicitudes (
  request_id bigint primary key,
  pedido_en timestamptz not null default now()
);

alter table public.uf_diaria enable row level security;
alter table public.uf_solicitudes enable row level security;

create policy "miembros leen uf" on public.uf_diaria
  for select to authenticated using (es_miembro());

revoke all on public.uf_diaria, public.uf_solicitudes from anon, authenticated;
grant select on public.uf_diaria to authenticated;

create or replace function public.uf_pedir() returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  anio int := extract(year from (now() at time zone 'America/Santiago'))::int;
  rid bigint;
begin
  rid := net.http_get(
    url := 'https://mindicador.cl/api/uf/' || anio,
    timeout_milliseconds := 10000
  );
  insert into public.uf_solicitudes (request_id) values (rid);
end $$;

create or replace function public.uf_procesar() returns integer
language plpgsql security definer set search_path = public, extensions as $$
declare
  s record;
  r record;
  item record;
  f date;
  v numeric;
  previo numeric;
  guardados int := 0;
begin
  for s in select request_id from public.uf_solicitudes loop
    select status_code, content into r from net._http_response where id = s.request_id;
    if not found then
      continue; -- aún no hay respuesta; se revisa en la próxima pasada
    end if;

    if r.status_code = 200 then
      for item in
        select value from jsonb_array_elements((r.content::jsonb)->'serie') as t(value)
        order by value->>'fecha' asc
      loop
        f := substring(item.value->>'fecha' from 1 for 10)::date;
        v := (item.value->>'valor')::numeric;

        -- Validación: rango razonable y variación diaria menor a 0,5%
        if v is null or v < 1000 or v > 1000000 then
          continue;
        end if;
        select u.valor into previo from public.uf_diaria u
          where u.fecha < f order by u.fecha desc limit 1;
        if previo is not null and abs(v - previo) / previo > 0.005 then
          continue;
        end if;

        insert into public.uf_diaria (fecha, valor) values (f, v)
          on conflict (fecha) do update set valor = excluded.valor, cargado_en = now();
        guardados := guardados + 1;
      end loop;
    end if;

    delete from public.uf_solicitudes where request_id = s.request_id;
  end loop;
  return guardados;
end $$;

revoke execute on function public.uf_pedir() from public, anon, authenticated;
revoke execute on function public.uf_procesar() from public, anon, authenticated;

-- Programación (zona UTC): pedir a las 11:00 UTC (~08:00 Santiago); procesar cada 30 min
select cron.schedule('crm_uf_pedir', '0 11 * * *', $$select public.uf_pedir()$$);
select cron.schedule('crm_uf_procesar', '*/30 * * * *', $$select public.uf_procesar()$$);

-- Cotizaciones en UF: moneda 'UF' con snapshot del valor usado al emitir
alter table public.cotizaciones drop constraint if exists cotizaciones_moneda_check;
alter table public.cotizaciones add constraint cotizaciones_moneda_check
  check (moneda in ('CLP', 'USD', 'UF'));
alter table public.cotizaciones
  add column if not exists uf_valor numeric(12,2),
  add column if not exists uf_fecha date;
alter table public.cotizaciones add constraint cotizaciones_uf_snapshot_check
  check (moneda <> 'UF' or (uf_valor is not null and uf_fecha is not null));
