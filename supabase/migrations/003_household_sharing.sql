-- 가계부 공유: 여러 계정이 한 사람(소유자)의 가계부를 함께 보고 쓴다.
-- 002 까지 실행한 DB 에서 SQL Editor 에 붙여넣고 Run 하세요.
--
-- 구조
--   shares(owner_id, member_id): member 로 로그인하면 owner 의 가계부를 쓴다.
--   my_owner_id(): 지금 로그인한 사람이 쓰는 가계부의 주인 id
--                  (공유받았으면 owner, 아니면 자기 자신)
--   모든 테이블의 user_id = 가계부 주인 id. RLS 는 "user_id = my_owner_id()" 인 행만 허용한다.
--
-- 공유 설정은 앱이 아니라 SQL Editor 에서만 한다 (shares 는 앱에서 읽기/쓰기 불가):
--   insert into public.shares (owner_id, member_id) values (
--     (select id from auth.users where email = '주인@이메일'),
--     (select id from auth.users where email = '함께쓸@이메일'));

create table public.shares (
  owner_id uuid not null references auth.users (id) on delete cascade,
  member_id uuid primary key references auth.users (id) on delete cascade, -- 한 계정은 한 가계부만 공유받는다
  created_at timestamptz not null default now(),
  check (owner_id <> member_id)
);
-- RLS 를 켜고 정책을 하나도 만들지 않으면 앱(authenticated)에서는 아예 접근할 수 없다
alter table public.shares enable row level security;

-- security definer: 이 함수는 만든 사람(관리자) 권한으로 실행되어, 앱 사용자가 못 읽는 shares 를 읽을 수 있다
create function public.my_owner_id() returns uuid
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select owner_id from public.shares where member_id = auth.uid()),
    auth.uid()
  )
$$;

-- 모든 가계부 테이블: 기본 user_id 와 RLS 정책을 '가계부 주인' 기준으로 바꾼다
do $$
declare
  t text;
begin
  foreach t in array array[
    'categories', 'payment_methods', 'transactions', 'budgets', 'members', 'goals',
    'invest_accounts', 'trades', 'stock_prices', 'bank_accounts', 'deposits', 'installment_savings',
    'loans', 'real_assets', 'net_worth_snapshots', 'ledger_entries'
  ] loop
    execute format('alter table public.%I alter column user_id set default public.my_owner_id()', t);
    execute format('drop policy "own rows" on public.%I', t);
    execute format(
      'create policy "household rows" on public.%I for all to authenticated
         using (user_id = (select public.my_owner_id()))
         with check (user_id = (select public.my_owner_id()))', t);
  end loop;
end $$;
