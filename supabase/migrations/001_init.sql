-- 가계부 테이블 생성 스크립트
-- Supabase 대시보드 → SQL Editor → New query 에 전체를 붙여넣고 Run 하세요.

-- ─────────────────────────────────────────────
-- 테이블
-- ─────────────────────────────────────────────
-- 모든 테이블에 user_id 를 두고, 기본값을 auth.uid()(= 로그인한 사용자 id)로 한다.
-- 그래서 앱에서 데이터를 넣을 때 user_id 를 따로 보내지 않아도 된다.
-- created_at 에 now() 대신 clock_timestamp() 를 쓰는 이유:
-- now() 는 한 문장 안에서 모두 같은 시각이라, 여러 행을 한 번에 넣으면 순서가 섞인다.

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  color text not null default '#94a3b8',
  created_at timestamptz not null default clock_timestamp(),
  unique (user_id, type, name)
);

create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('cash', 'card', 'account')),
  created_at timestamptz not null default clock_timestamp(),
  unique (user_id, name)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  type text not null check (type in ('income', 'expense')),
  amount bigint not null check (amount > 0),
  -- 카테고리/결제수단을 지워도 거래는 남기고 '미분류'로 표시한다
  category_id uuid references public.categories (id) on delete set null,
  payment_method_id uuid references public.payment_methods (id) on delete set null,
  memo text,
  created_at timestamptz not null default clock_timestamp()
);

-- 월별 조회가 많으므로 (사용자, 날짜) 인덱스를 만든다
create index transactions_user_date_idx on public.transactions (user_id, date);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- 해당 월의 1일로 저장한다 (예: 2026-10-01)
  month date not null check (extract(day from month) = 1),
  category_id uuid not null references public.categories (id) on delete cascade,
  amount bigint not null check (amount > 0),
  created_at timestamptz not null default clock_timestamp(),
  unique (user_id, month, category_id)
);

-- ─────────────────────────────────────────────
-- 권한 + RLS(Row Level Security)
-- ─────────────────────────────────────────────
-- 앱 코드와 접속 키는 GitHub Pages 에 공개되므로, 보안은 DB 에서 지킨다.
-- RLS 를 켜면 아래 정책을 통과한 행만 읽고 쓸 수 있다.
-- 정책: "로그인한 사용자 id 와 행의 user_id 가 같을 때만 허용"

grant select, insert, update, delete
  on public.categories, public.payment_methods, public.transactions, public.budgets
  to authenticated;

alter table public.categories enable row level security;
alter table public.payment_methods enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;

create policy "own rows" on public.categories for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "own rows" on public.payment_methods for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "own rows" on public.transactions for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "own rows" on public.budgets for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
