-- ============================================================
--  ADOLPHUS · PORTAL DE VÁLVULAS
--  Instalación completa de la base de datos en Supabase.
--
--  Cómo usarlo:
--    1. Entra a tu proyecto en supabase.com
--    2. Barra izquierda → SQL Editor → New query
--    3. Pega TODO este archivo y pulsa RUN
--
--  Se puede correr las veces que haga falta: no borra nada y no
--  duplica nada. Si algo ya existe, lo deja como está.
-- ============================================================

-- ── 1. Tipos ────────────────────────────────────────────────
do $$ begin
  create type public.rol_usuario as enum ('admin','tec','com','cliente');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.estado_usuario as enum ('pendiente','activo','suspendido');
exception when duplicate_object then null; end $$;


-- ── 2. Empresas ─────────────────────────────────────────────
--  Adolphus y cada cliente. 'clave' es el identificador corto que el
--  portal ya usa por dentro ('refi', 'minera'…) y es lo que permite
--  casar lo que manda el navegador con la fila de la base.
create table if not exists public.empresas (
  id                 uuid primary key default gen_random_uuid(),
  nombre             text not null,
  ruc                text,
  sector             text,
  planta             text,
  codigo_invitacion  text unique,
  es_proveedor       boolean not null default false,
  clave              text,
  creada             timestamptz not null default now()
);
alter table public.empresas add column if not exists clave text;
create unique index if not exists empresas_clave_uk on public.empresas(clave) where clave is not null;


-- ── 3. Perfiles ─────────────────────────────────────────────
--  Una fila por persona que entra. Cuelga de auth.users, que es donde
--  Supabase guarda el correo y la contraseña.
create table if not exists public.perfiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  correo         text,
  nombre         text,
  cargo          text,
  telefono       text,
  empresa_id     uuid references public.empresas(id) on delete set null,
  rol            public.rol_usuario    not null default 'cliente',
  estado         public.estado_usuario not null default 'pendiente',
  alta           timestamptz not null default now(),
  ultimo_acceso  timestamptz
);


-- ── 4. Funciones de apoyo ───────────────────────────────────
--  Las políticas de seguridad preguntan por aquí. Van como SECURITY
--  DEFINER para poder mirar 'perfiles' sin caer en una recursión
--  infinita (la política de perfiles preguntaría por la política de
--  perfiles, y así hasta el infinito).
create or replace function public.mi_empresa()
returns uuid language sql stable security definer set search_path = public as $$
  select empresa_id from public.perfiles where id = auth.uid()
$$;

create or replace function public.mi_rol()
returns public.rol_usuario language sql stable security definer set search_path = public as $$
  select rol from public.perfiles where id = auth.uid()
$$;

create or replace function public.esta_activo()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select estado = 'activo' from public.perfiles where id = auth.uid()), false)
$$;

create or replace function public.es_adolphus()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select rol in ('admin','tec','com') and estado = 'activo'
                     from public.perfiles where id = auth.uid()), false)
$$;

create or replace function public.es_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select rol = 'admin' and estado = 'activo'
                     from public.perfiles where id = auth.uid()), false)
$$;

--  IMPORTANTE: sin este permiso, las políticas mueren con
--  "permission denied for function mi_empresa" y la base queda
--  cerrada para TODOS, no sólo para los intrusos.
grant execute on function public.mi_empresa()  to authenticated;
grant execute on function public.mi_rol()      to authenticated;
grant execute on function public.esta_activo() to authenticated;
grant execute on function public.es_adolphus() to authenticated;
grant execute on function public.es_admin()    to authenticated;


-- ── 5. Códigos de invitación y alta de usuarios ─────────────
--  Un código POR ÁREA, no uno para toda la empresa. El código dice de
--  qué empresa es la persona y con qué perfil entra, así que nadie
--  tiene que ascender a mano al primero que llega —cosa que además era
--  imposible: sólo un admin puede nombrar a otro, y no había ninguno.
create table if not exists public.invitaciones (
  codigo      text primary key,
  empresa_id  uuid not null references public.empresas(id) on delete cascade,
  rol         public.rol_usuario not null,
  activa      boolean not null default true,
  nota        text,
  creada      timestamptz not null default now()
);

create or replace function public.manejar_nuevo_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  inv       public.invitaciones%rowtype;
  e         public.empresas%rowtype;
  cod       text := nullif(trim(new.raw_user_meta_data->>'codigo'), '');
  ruc_in    text := nullif(regexp_replace(coalesce(new.raw_user_meta_data->>'ruc',''), '\D', '', 'g'), '');
  rol_nuevo public.rol_usuario;
  est_nuevo public.estado_usuario;
begin
  -- 1) por código de invitación: entra activo y con el perfil de su área
  if cod is not null then
    select * into inv from public.invitaciones
     where upper(codigo) = upper(cod) and activa;
  end if;

  if inv.codigo is not null then
    select * into e from public.empresas where id = inv.empresa_id;
    rol_nuevo := inv.rol;
    est_nuevo := 'activo';
  else
    -- 2) sin código válido, sólo por RUC: queda PENDIENTE, porque el RUC
    --    es público y no prueba que la persona trabaje ahí
    if ruc_in is not null then
      select * into e from public.empresas
       where regexp_replace(coalesce(ruc,''), '\D', '', 'g') = ruc_in;
    end if;
    rol_nuevo := (case when e.id is not null and e.es_proveedor then 'tec'
                       else 'cliente' end)::public.rol_usuario;
    est_nuevo := 'pendiente';
  end if;

  -- red de seguridad: si no queda NINGÚN administrador en toda la casa,
  -- el primero de Adolphus lo es. Sin esto, un borrado accidental de
  -- perfiles dejaría el portal sin nadie que pueda repartir accesos.
  if rol_nuevo <> 'cliente'
     and not exists(select 1 from public.perfiles where rol = 'admin') then
    rol_nuevo := 'admin';
    est_nuevo := 'activo';
  end if;

  insert into public.perfiles (id, correo, nombre, cargo, telefono, empresa_id, rol, estado)
  values (
    new.id,
    new.email,
    coalesce(nullif(trim(new.raw_user_meta_data->>'nombre'), ''), split_part(new.email, '@', 1)),
    nullif(trim(new.raw_user_meta_data->>'cargo'), ''),
    nullif(trim(new.raw_user_meta_data->>'telefono'), ''),
    e.id,
    rol_nuevo,
    est_nuevo
  );
  return new;
end $$;

drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario
after insert on auth.users
for each row execute function public.manejar_nuevo_usuario();


-- ── 6. El almacén del portal ────────────────────────────────
--  Una fila por registro: una válvula, una orden, un reclamo, una
--  cotización. El contenido va en jsonb porque el portal todavía
--  crece y no tiene sentido congelar treinta columnas por tabla.
--  Lo que sí está congelado —y es lo que importa— es DE QUIÉN es
--  cada fila, porque de ahí cuelga el aislamiento entre clientes.
create table if not exists public.registros (
  coleccion   text        not null,   -- 'ACTIVOS', 'ORDENES', 'RECLAMOS'…
  clave       text        not null,   -- el id que ya usa el portal
  empresa_id  uuid        references public.empresas(id) on delete cascade,
  datos       jsonb       not null,
  borrado     boolean     not null default false,
  actualizado timestamptz not null default now(),
  por         uuid        references auth.users(id) on delete set null,
  primary key (coleccion, clave)
);
create index if not exists registros_empresa_ix     on public.registros(empresa_id);
create index if not exists registros_actualizado_ix on public.registros(actualizado);
create index if not exists registros_por_ix         on public.registros(por);

--  Sella quién y cuándo, sin confiar en lo que mande el navegador.
create or replace function public.sellar_registro()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  new.actualizado := now();
  new.por := auth.uid();
  return new;
end $$;

drop trigger if exists registros_sellar on public.registros;
create trigger registros_sellar before insert or update on public.registros
for each row execute function public.sellar_registro();


-- ── 7. Seguridad por fila ───────────────────────────────────
alter table public.empresas  enable row level security;
alter table public.perfiles  enable row level security;
alter table public.registros enable row level security;

-- Empresas: Adolphus las ve todas; un cliente sólo la suya.
drop policy if exists empresas_lectura on public.empresas;
create policy empresas_lectura on public.empresas for select to authenticated
using ((select public.es_adolphus()) or id = (select public.mi_empresa()));

drop policy if exists empresas_cambio on public.empresas;
create policy empresas_cambio on public.empresas for update to authenticated
using ((select public.es_admin())) with check ((select public.es_admin()));

drop policy if exists empresas_alta on public.empresas;
create policy empresas_alta on public.empresas for insert to authenticated
with check ((select public.es_admin()));

-- Perfiles: el propio, los de Adolphus, y los compañeros de empresa.
drop policy if exists perfiles_lectura on public.perfiles;
create policy perfiles_lectura on public.perfiles for select to authenticated
using (id = (select auth.uid()) or (select public.es_adolphus())
       or (empresa_id is not null and empresa_id = (select public.mi_empresa())));

drop policy if exists perfiles_propio on public.perfiles;
create policy perfiles_propio on public.perfiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists perfiles_admin on public.perfiles;
create policy perfiles_admin on public.perfiles for update to authenticated
using ((select public.es_admin())) with check ((select public.es_admin()));

-- Registros: AQUÍ está el aislamiento entre clientes.
-- Adolphus ve todo. Un cliente ve lo suyo y los maestros compartidos
-- (catálogo, despieces, precios de lista), que van sin dueño.
drop policy if exists registros_ver on public.registros;
create policy registros_ver on public.registros for select to authenticated
using (
  (select public.esta_activo()) and (
    (select public.es_adolphus())
    or empresa_id = (select public.mi_empresa())
    or empresa_id is null
  )
);

-- Escribir: Adolphus, todo. El cliente sólo sobre lo suyo y sólo
-- donde el portal le deja poner la mano.
drop policy if exists registros_alta on public.registros;
create policy registros_alta on public.registros for insert to authenticated
with check (
  (select public.esta_activo()) and (
    (select public.es_adolphus())
    or (empresa_id = (select public.mi_empresa())
        and coleccion in ('SOLICITUDES','COTIZACIONES','PLAN_OK'))
  )
);

drop policy if exists registros_cambio on public.registros;
create policy registros_cambio on public.registros for update to authenticated
using (
  (select public.esta_activo()) and (
    (select public.es_adolphus())
    or (empresa_id = (select public.mi_empresa())
        and coleccion in ('SOLICITUDES','COTIZACIONES','PLAN_OK'))
  )
)
with check (
  (select public.esta_activo()) and (
    (select public.es_adolphus())
    or (empresa_id = (select public.mi_empresa())
        and coleccion in ('SOLICITUDES','COTIZACIONES','PLAN_OK'))
  )
);

-- Nada se borra de verdad: se marca 'borrado' para que los demás
-- equipos se enteren de la baja al sincronizar.
drop policy if exists registros_baja on public.registros;
create policy registros_baja on public.registros for delete to authenticated
using ((select public.es_admin()));

-- Los códigos son la llave de la casa: sólo el personal de Adolphus los
-- ve, y sólo la gerencia los cambia.
alter table public.invitaciones enable row level security;

drop policy if exists invitaciones_lectura on public.invitaciones;
create policy invitaciones_lectura on public.invitaciones for select to authenticated
using ((select public.es_adolphus()));

drop policy if exists invitaciones_cambio on public.invitaciones;
create policy invitaciones_cambio on public.invitaciones for all to authenticated
using ((select public.es_admin())) with check ((select public.es_admin()));


-- ── 8. Las empresas y sus códigos de invitación ─────────────
--  Cambia los códigos por los que quieras entregar. Quien se registre
--  con el código de Adolphus entra como personal; quien use el de un
--  cliente entra viendo sólo las válvulas de ese cliente.
insert into public.empresas (nombre, ruc, sector, planta, codigo_invitacion, es_proveedor, clave) values
 ('Adolphus S.A.',            '20512345678','Servicio de válvulas','Lima',              'ADOLPHUS-2026',  true,  'adolphus'),
 ('Refinería Costa Norte',    '20100128056','Petróleo y gas',      'Planta de Procesos','COSTANORTE-2026',false, 'refi'),
 ('Minera Los Andes S.A.A.',  '20419387561','Minería',             'Concentradora',     'ANDES-2026',     false, 'minera'),
 ('Agroindustrias del Valle', '20556677889','Agroindustria',       'Planta Sur',        'AGROVALLE-2026', false, 'agro')
on conflict (codigo_invitacion) do update
  set clave = excluded.clave, ruc = coalesce(public.empresas.ruc, excluded.ruc);

--  Un código por área. Cambia estos por los que vayas a repartir.
insert into public.invitaciones (codigo, empresa_id, rol, nota)
select v.codigo, e.id, v.rol::public.rol_usuario, v.nota
from (values
  ('ADOLPHUS-GERENCIA-2026','adolphus','admin',  'Gerencia y jefaturas: lo ve y lo cambia todo, y reparte los perfiles'),
  ('ADOLPHUS-TALLER-2026',  'adolphus','tec',    'Servicio técnico: órdenes, calibraciones, informes y repuestos'),
  ('ADOLPHUS-VENTAS-2026',  'adolphus','com',    'Comercial y otras áreas: solicitudes, cotizaciones y stock'),
  ('COSTANORTE-2026',       'refi',    'cliente','Refinería Costa Norte'),
  ('ANDES-2026',            'minera',  'cliente','Minera Los Andes'),
  ('AGROVALLE-2026',        'agro',    'cliente','Agroindustrias del Valle')
) as v(codigo, clave, rol, nota)
join public.empresas e on e.clave = v.clave
on conflict (codigo) do update
  set rol = excluded.rol, empresa_id = excluded.empresa_id, nota = excluded.nota;


-- ── 9. Comprobación ─────────────────────────────────────────
--  Al terminar deberías ver los códigos con el perfil que da cada uno.
select i.codigo, i.rol, e.nombre as empresa, i.nota
from public.invitaciones i join public.empresas e on e.id = i.empresa_id
where i.activa order by (e.es_proveedor is false), i.rol, i.codigo;
