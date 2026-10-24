-- 엑셀 가계부 기능 추가 마이그레이션
-- 001_init.sql 을 실행한 DB 에서, SQL Editor → New query 에 전체를 붙여넣고 Run 하세요.
-- 기존 데이터는 지우지 않습니다.

-- ─────────────────────────────────────────────
-- 반복되는 "본인 데이터만 허용" 설정을 함수로 묶는다 (스크립트 끝에서 삭제)
-- ─────────────────────────────────────────────
create function public.tmp_enable_owner_rls(t regclass) returns void
language plpgsql as $$
begin
  execute format('grant select, insert, update, delete on %s to authenticated', t);
  execute format('alter table %s enable row level security', t);
  execute format(
    'create policy "own rows" on %s for all to authenticated
       using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
end $$;

-- ─────────────────────────────────────────────
-- 사람 (공동 / 남편 / 아내 …). 거래의 member_id 가 비어 있으면 '공동'으로 본다.
-- ─────────────────────────────────────────────
create table public.members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default clock_timestamp(),
  unique (user_id, name)
);
select public.tmp_enable_owner_rls('public.members');

-- ─────────────────────────────────────────────
-- 카테고리: 대분류/소분류 2단계
-- parent_id 가 비어 있으면 대분류, 있으면 그 대분류의 소분류
-- ─────────────────────────────────────────────
alter table public.categories
  add column parent_id uuid references public.categories (id) on delete cascade;
alter table public.categories drop constraint categories_user_id_type_name_key;
-- '기타'처럼 같은 이름이 서로 다른 대분류 아래에 있을 수 있도록 parent_id 까지 묶어서 중복 검사
-- (nulls not distinct: parent_id 가 둘 다 비어 있어도 같은 값으로 보고 중복을 막는다)
alter table public.categories
  add constraint categories_unique_name unique nulls not distinct (user_id, type, parent_id, name);

-- ─────────────────────────────────────────────
-- 거래: 성격(고정/부가 수입, 저축성/고정/변동 지출), 할인, 사람
-- amount 는 '실지출'(결제금액 - 할인) 이다.
-- ─────────────────────────────────────────────
alter table public.transactions
  add column kind text,
  add column discount bigint not null default 0 check (discount >= 0),
  add column member_id uuid references public.members (id) on delete set null;
update public.transactions set kind = case type when 'income' then 'fixed' else 'variable' end;
alter table public.transactions
  alter column kind set not null,
  add constraint transactions_kind_check check (
    (type = 'income' and kind in ('fixed', 'extra')) or
    (type = 'expense' and kind in ('saving', 'fixed', 'variable'))
  );

-- ─────────────────────────────────────────────
-- 연도별 재무 목표
-- ─────────────────────────────────────────────
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  year int not null,
  monthly_saving_target bigint not null default 0,
  saving_rate_target numeric not null default 0, -- 퍼센트 (60 = 60%)
  unique (user_id, year)
);
select public.tmp_enable_owner_rls('public.goals');

-- ─────────────────────────────────────────────
-- 투자: 계좌, 매매(매수 1건 = 1행, 팔면 매도 정보를 채움), 현재가
-- ─────────────────────────────────────────────
create table public.invest_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  member_id uuid references public.members (id) on delete set null,
  memo text,
  created_at timestamptz not null default clock_timestamp(),
  unique (user_id, name)
);
select public.tmp_enable_owner_rls('public.invest_accounts');

create table public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  account_id uuid not null references public.invest_accounts (id) on delete cascade,
  stock_code text not null, -- 종목코드 6자리 (예: 000660)
  stock_name text not null,
  buy_date date,
  buy_price numeric not null check (buy_price >= 0),
  quantity numeric not null check (quantity > 0),
  sell_date date,
  sell_price numeric check (sell_price >= 0),
  fee bigint not null default 0 check (fee >= 0), -- 매매 수수료·세금
  memo text,
  created_at timestamptz not null default clock_timestamp()
);
select public.tmp_enable_owner_rls('public.trades');

create table public.stock_prices (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  stock_code text not null,
  price numeric not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, stock_code)
);
select public.tmp_enable_owner_rls('public.stock_prices');

-- ─────────────────────────────────────────────
-- 자산 / 부채
-- term: long(장기) / mid(중기) / short(단기)
-- rate, tax_rate 는 퍼센트 (3.5 = 연 3.5%, 15.4 = 이자소득세 15.4%)
-- ─────────────────────────────────────────────
create table public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  bank text,
  name text not null,
  kind text,
  term text not null default 'short' check (term in ('long', 'mid', 'short')),
  account_number text,
  purpose text,
  member_id uuid references public.members (id) on delete set null,
  opened_on date,
  balance bigint not null default 0,
  memo text,
  created_at timestamptz not null default clock_timestamp()
);
select public.tmp_enable_owner_rls('public.bank_accounts');

create table public.deposits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  bank text,
  name text not null,
  member_id uuid references public.members (id) on delete set null,
  start_date date not null,
  maturity_date date not null,
  principal bigint not null check (principal >= 0),
  rate numeric not null default 0,
  tax_rate numeric not null default 15.4,
  memo text,
  created_at timestamptz not null default clock_timestamp()
);
select public.tmp_enable_owner_rls('public.deposits');

create table public.installment_savings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  bank text,
  name text not null,
  member_id uuid references public.members (id) on delete set null,
  start_date date not null,
  maturity_date date not null,
  monthly_amount bigint not null check (monthly_amount >= 0),
  rate numeric not null default 0,
  tax_rate numeric not null default 15.4,
  method text not null default 'simple' check (method in ('simple', 'monthly_compound')),
  memo text,
  created_at timestamptz not null default clock_timestamp()
);
select public.tmp_enable_owner_rls('public.installment_savings');

create table public.loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lender text,
  name text not null,
  start_date date not null,
  maturity_date date not null,
  principal bigint not null check (principal >= 0),
  rate numeric not null default 0,
  -- equal_payment: 원리금균등, equal_principal: 원금균등, bullet: 만기일시
  method text not null default 'equal_payment' check (method in ('equal_payment', 'equal_principal', 'bullet')),
  memo text,
  created_at timestamptz not null default clock_timestamp()
);
select public.tmp_enable_owner_rls('public.loans');

create table public.real_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  amount bigint not null default 0,
  memo text,
  created_at timestamptz not null default clock_timestamp()
);
select public.tmp_enable_owner_rls('public.real_assets');

create table public.net_worth_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  year int not null,
  amount bigint not null,
  memo text,
  unique (user_id, year)
);
select public.tmp_enable_owner_rls('public.net_worth_snapshots');

-- ─────────────────────────────────────────────
-- 통장 기록: 공동통장, 비상금처럼 입출금 내역과 잔액만 관리하는 장부
-- 가계부 수입/지출 합계에는 들어가지 않는다.
-- ─────────────────────────────────────────────
create table public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  book text not null, -- 장부 이름 (예: 공동통장, 비상금)
  date date not null,
  direction text not null check (direction in ('in', 'out')),
  amount bigint not null check (amount > 0),
  member_id uuid references public.members (id) on delete set null,
  memo text,
  created_at timestamptz not null default clock_timestamp()
);
create index ledger_entries_user_book_date_idx on public.ledger_entries (user_id, book, date);
select public.tmp_enable_owner_rls('public.ledger_entries');

drop function public.tmp_enable_owner_rls(regclass);
