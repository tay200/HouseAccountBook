-- 투자 수익 직접 입력: 증권사 앱에 나오는 판매수익·배당금을 금액 그대로 적는다
--
--   sale     : 판매수익 (매도 가격·수량 없이 실현 금액만 아는 경우. 손실은 음수)
--   dividend : 배당금 (세후 받은 금액)
--   금액은 원화. 매매 내역에 매도를 기록하면 그 손익은 지금처럼 자동 계산되므로, 같은 매도를 여기에 또 넣지 않는다.

create table public.invest_incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default public.my_owner_id() references auth.users (id) on delete cascade,
  account_id uuid not null references public.invest_accounts (id) on delete cascade,
  kind text not null check (kind in ('sale', 'dividend')),
  income_date date not null,
  market text not null default 'KR' check (market in ('KR', 'US')),
  stock_code text,
  stock_name text not null,
  amount bigint not null, -- 원
  memo text,
  created_at timestamptz not null default clock_timestamp()
);

create index invest_incomes_user_date_idx on public.invest_incomes (user_id, income_date);
create index invest_incomes_account_idx on public.invest_incomes (account_id);

grant select, insert, update, delete on public.invest_incomes to authenticated;
alter table public.invest_incomes enable row level security;
create policy "household rows" on public.invest_incomes for all to authenticated
  using (user_id = (select public.my_owner_id()))
  with check (user_id = (select public.my_owner_id()));
