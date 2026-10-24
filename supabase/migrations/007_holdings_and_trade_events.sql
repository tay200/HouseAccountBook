-- 투자 구조 변경: '매수 1번 = 1줄(팔면 매도 정보 덧붙임)' → 보유 종목 + 매수·매도 기록
--
--   stock_holdings : 매매 기록 없이 직접 넣는 보유 종목 (예: 다른 앱에서 옮겨 온 평균단가·수량)
--   stock_trades   : 매수 1건 = 1줄, 매도 1건 = 1줄 (side 로 구분)
--
--   화면의 보유 수량·평균단가 = 직접 넣은 보유분 + 매수 - 매도 (이동평균법)
--   예전 trades 테이블은 데이터를 옮긴 뒤에도 바로 지우지 않고 남겨 둔다.

create table public.stock_holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default public.my_owner_id() references auth.users (id) on delete cascade,
  account_id uuid not null references public.invest_accounts (id) on delete cascade,
  market text not null default 'KR' check (market in ('KR', 'US')),
  stock_code text not null,
  stock_name text not null,
  quantity numeric not null check (quantity > 0),
  avg_price numeric not null check (avg_price >= 0), -- 해당 통화 (KR=원, US=달러)
  avg_fx_rate numeric check (avg_fx_rate > 0),        -- US 만. 비우면 현재 환율로 계산
  memo text,
  created_at timestamptz not null default clock_timestamp()
);

create table public.stock_trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default public.my_owner_id() references auth.users (id) on delete cascade,
  account_id uuid not null references public.invest_accounts (id) on delete cascade,
  side text not null check (side in ('buy', 'sell')),
  market text not null default 'KR' check (market in ('KR', 'US')),
  stock_code text not null,
  stock_name text not null,
  trade_date date,                                    -- 엑셀에서 옮긴 기록은 비어 있을 수 있음
  price numeric not null check (price >= 0),          -- 해당 통화
  quantity numeric not null check (quantity > 0),
  fx_rate numeric check (fx_rate > 0),                -- US 만. 거래 당시 환율
  fee numeric not null default 0 check (fee >= 0),    -- 수수료·세금, 해당 통화
  memo text,
  created_at timestamptz not null default clock_timestamp()
);

do $$
declare t text;
begin
  foreach t in array array['stock_holdings', 'stock_trades'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "household rows" on public.%I for all to authenticated
         using (user_id = (select public.my_owner_id()))
         with check (user_id = (select public.my_owner_id()))', t);
  end loop;
end $$;
