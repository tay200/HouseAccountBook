-- 월별 자산 기록: 지난달 대비 순자산·투자 증감을 보기 위해 한 달에 1줄씩 남긴다
--
--   앱을 열 때마다(값이 바뀌었으면) 이번 달 줄을 덮어쓴다.
--   → 그 달에 마지막으로 앱을 연 시점의 값이 그 달 기록이 된다.
--   계좌 잔액·시세는 '현재 값'만 있어서, 이렇게 남겨 두지 않으면 지난 값을 알 수 없다.
--
--   투자 합계(invest_*)는 투자 탭과 같은 기준: '합계 포함'을 켠 계좌만
--   invest_accounts: 계좌별 값 [{ "id", "name", "included", "value", "cost", "realized" }]
--                    계좌를 지워도 지난 기록에 이름이 남도록 이름까지 저장한다

create table public.monthly_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default public.my_owner_id() references auth.users (id) on delete cascade,
  month date not null check (extract(day from month) = 1), -- 'YYYY-MM-01'
  financial bigint not null,       -- 금융자산
  real_assets bigint not null,     -- 부동자산
  debt bigint not null,            -- 부채
  net_worth bigint not null,       -- 순자산 = 금융 + 부동 - 부채
  invest_value bigint not null,    -- 투자 평가금액
  invest_cost bigint not null,     -- 투자 보유 매수금액 (원금)
  invest_realized bigint not null, -- 투자 실현손익 누계
  invest_accounts jsonb not null default '[]',
  saved_at timestamptz not null default now(),
  unique (user_id, month)
);

grant select, insert, update, delete on public.monthly_snapshots to authenticated;
alter table public.monthly_snapshots enable row level security;
create policy "household rows" on public.monthly_snapshots for all to authenticated
  using (user_id = (select public.my_owner_id()))
  with check (user_id = (select public.my_owner_id()));
