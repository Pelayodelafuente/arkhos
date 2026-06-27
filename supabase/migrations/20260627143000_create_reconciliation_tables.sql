-- Reconciliación de Patrimonio: snapshots de extracción + auditoría de cambios
create table if not exists public.reconciliation_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  run_id uuid not null,
  plataforma text not null,
  source text not null check (source in ('export','scrape')),
  tipo text,
  activo_o_prestamo text,
  originador text,
  fecha date,
  cantidad numeric,
  importe numeric,
  divisa text not null default 'EUR',
  comision numeric,
  raw_json jsonb,
  created_at timestamptz not null default now()
);

alter table public.reconciliation_snapshots enable row level security;

drop policy if exists "owner_only" on public.reconciliation_snapshots;
create policy "owner_only" on public.reconciliation_snapshots
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_recon_snap_user_run on public.reconciliation_snapshots(user_id, run_id);
create index if not exists idx_recon_snap_plataforma on public.reconciliation_snapshots(plataforma);

-- Auditoría de cambios aplicados a Arkhos (antes/después), dry-run hasta aprobación
create table if not exists public.reconciliation_audit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  run_id uuid not null,
  plataforma text,
  entidad text,
  registro_ref text,
  estado text check (estado in ('FALTA','MAL','OK','FANTASMA')),
  campo text,
  valor_antes jsonb,
  valor_despues jsonb,
  delta numeric,
  aplicado boolean not null default false,
  aplicado_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.reconciliation_audit enable row level security;

drop policy if exists "owner_only" on public.reconciliation_audit;
create policy "owner_only" on public.reconciliation_audit
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_recon_audit_user_run on public.reconciliation_audit(user_id, run_id);
create index if not exists idx_recon_audit_estado on public.reconciliation_audit(estado);
