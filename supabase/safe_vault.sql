-- SafeVault backend for the ClashX7 Supabase app.
-- Run this once in Supabase SQL Editor. Uses existing public.profiles(id, balance, winnings)
-- and auth.uid(); all wallet mutations happen in transactional SECURITY DEFINER RPCs.
-- Interest is simple interest: principal * 0.025 * duration_days, with a 3-365 day term.

create table if not exists public.safe_vault_investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  principal numeric(14,2) not null check (principal >= 100),
  duration_days integer not null check (duration_days between 3 and 365),
  daily_rate numeric(8,6) not null default 0.025 check (daily_rate = 0.025),
  status text not null default 'active' check (status in ('active','withdrawn')),
  started_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  interest_paid numeric(14,2),
  created_at timestamptz not null default now(),
  constraint safe_vault_withdrawal_fields check (
    (status = 'active' and withdrawn_at is null and interest_paid is null)
    or (status = 'withdrawn' and withdrawn_at is not null and interest_paid is not null)
  )
);

create unique index if not exists safe_vault_one_active_per_user
  on public.safe_vault_investments(user_id) where status = 'active';
create index if not exists safe_vault_user_created_idx
  on public.safe_vault_investments(user_id, created_at desc);

alter table public.safe_vault_investments enable row level security;
drop policy if exists "Users can read own SafeVault investments" on public.safe_vault_investments;
create policy "Users can read own SafeVault investments"
  on public.safe_vault_investments for select to authenticated
  using (auth.uid() = user_id);
revoke all on public.safe_vault_investments from anon, authenticated;
grant select on public.safe_vault_investments to authenticated;

create or replace function public.safe_vault_get()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_balance numeric(14,2);
  v_winnings numeric(14,2);
  v_investment jsonb;
begin
  if v_uid is null then raise exception 'Login required'; end if;
  select coalesce(p.balance,0), coalesce(p.winnings,0)
    into v_balance, v_winnings
    from public.profiles p where p.id = v_uid;
  if not found then raise exception 'Player profile not found'; end if;

  select jsonb_build_object(
    'id', i.id,
    'principal', i.principal,
    'duration_days', i.duration_days,
    'daily_rate', i.daily_rate,
    'started_at', i.started_at,
    'unlock_at', i.started_at + make_interval(days => i.duration_days),
    'status', i.status
  ) into v_investment
  from public.safe_vault_investments i
  where i.user_id = v_uid and i.status = 'active'
  order by i.created_at desc limit 1;

  return jsonb_build_object(
    'wallet_balance', v_balance + v_winnings,
    'balance', v_balance,
    'winnings', v_winnings,
    'investment', v_investment
  );
end;
$$;

create or replace function public.safe_vault_deposit(p_amount numeric, p_duration_days integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_balance numeric(14,2);
  v_winnings numeric(14,2);
  v_id uuid;
  v_started_at timestamptz := now();
  v_amount numeric(14,2);
begin
  if v_uid is null then raise exception 'Login required'; end if;
  if p_amount is null or p_amount < 100 or p_amount > 500000 then
    raise exception 'Investment must be between ₹100 and ₹500000';
  end if;
  if p_duration_days is null or p_duration_days < 3 or p_duration_days > 365 then
    raise exception 'Lock-in must be between 3 and 365 days';
  end if;
  v_amount := round(p_amount, 2);

  select coalesce(p.balance,0), coalesce(p.winnings,0)
    into v_balance, v_winnings
    from public.profiles p where p.id = v_uid for update;
  if not found then raise exception 'Player profile not found'; end if;
  if v_balance < v_amount then raise exception 'Insufficient deposit balance'; end if;
  if exists (
    select 1 from public.safe_vault_investments i
    where i.user_id = v_uid and i.status = 'active' for update
  ) then raise exception 'An active SafeVault investment already exists'; end if;

  update public.profiles set balance = balance - v_amount where id = v_uid;
  insert into public.safe_vault_investments(user_id, principal, duration_days, daily_rate, started_at)
    values (v_uid, v_amount, p_duration_days, 0.025, v_started_at)
    returning id into v_id;

  return jsonb_build_object(
    'success', true,
    'wallet_balance', v_balance - v_amount + v_winnings,
    'investment', jsonb_build_object(
      'id', v_id, 'principal', v_amount, 'duration_days', p_duration_days,
      'daily_rate', 0.025, 'started_at', v_started_at,
      'unlock_at', v_started_at + make_interval(days => p_duration_days), 'status', 'active'
    )
  );
end;
$$;

create or replace function public.safe_vault_withdraw()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_investment public.safe_vault_investments%rowtype;
  v_balance numeric(14,2);
  v_winnings numeric(14,2);
  v_interest numeric(14,2);
  v_payout numeric(14,2);
  v_now timestamptz := now();
begin
  if v_uid is null then raise exception 'Login required'; end if;
  select i.* into v_investment
    from public.safe_vault_investments i
    where i.user_id = v_uid and i.status = 'active'
    for update;
  if not found then raise exception 'No active SafeVault investment'; end if;
  if v_now < v_investment.started_at + make_interval(days => v_investment.duration_days) then
    raise exception 'Investment remains locked until maturity';
  end if;

  -- Fixed-term simple interest: no compounding, and no interest beyond the selected term.
  v_interest := round(v_investment.principal * v_investment.daily_rate * v_investment.duration_days, 2);
  v_payout := v_investment.principal + v_interest;
  update public.profiles
    set balance = coalesce(balance,0) + v_investment.principal,
        winnings = coalesce(winnings,0) + v_interest
    where id = v_uid
    returning balance, winnings into v_balance, v_winnings;
  if not found then raise exception 'Player profile not found'; end if;

  update public.safe_vault_investments
    set status = 'withdrawn', withdrawn_at = v_now, interest_paid = v_interest
    where id = v_investment.id;

  return jsonb_build_object(
    'success', true,
    'payout', v_payout,
    'interest_paid', v_interest,
    'wallet_balance', v_balance + v_winnings,
    'balance', v_balance,
    'winnings', v_winnings,
    'investment', null
  );
end;
$$;

revoke all on function public.safe_vault_get() from public, anon;
revoke all on function public.safe_vault_deposit(numeric, integer) from public, anon;
revoke all on function public.safe_vault_withdraw() from public, anon;
grant execute on function public.safe_vault_get() to authenticated;
grant execute on function public.safe_vault_deposit(numeric, integer) to authenticated;
grant execute on function public.safe_vault_withdraw() to authenticated;
