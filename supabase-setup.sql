-- Run this SQL once in Supabase Dashboard > SQL Editor.
create table if not exists public.transactions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  type text not null check (type in ('purchase','sale','receipt','payment','expense')),
  party text,
  product text,
  pack_kg numeric(12,2) default 0,
  cartons numeric(12,2) default 0,
  kg numeric(14,2) default 0,
  unit_price numeric(20,0) default 0,
  amount numeric(20,0) default 0,
  settled numeric(20,0) default 0,
  method text,
  cheque_no text,
  cheque_due date,
  note text,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists transactions_user_date_idx on public.transactions(user_id, date desc);
alter table public.transactions enable row level security;
drop policy if exists "Users can read own transactions" on public.transactions;
drop policy if exists "Users can insert own transactions" on public.transactions;
drop policy if exists "Users can update own transactions" on public.transactions;
create policy "Users can read own transactions" on public.transactions for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own transactions" on public.transactions for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own transactions" on public.transactions for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
