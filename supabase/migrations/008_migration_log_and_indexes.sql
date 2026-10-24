-- 1) 어떤 migration 파일을 DB 에 적용했는지 기록하는 표
--    scripts/db.mjs --migrate 가 아직 기록되지 않은 파일만 순서대로 실행하고 여기에 적는다.
--    앱(브라우저)에서는 쓸 일이 없으므로 RLS 를 켜고 정책을 두지 않는다 (= 앱에서는 읽기·쓰기 불가).
create table if not exists public.schema_migrations (
  version text primary key,          -- 파일 이름 (예: 008_migration_log_and_indexes.sql)
  applied_at timestamptz not null default now()
);
alter table public.schema_migrations enable row level security;

-- 지금까지 손으로 적용한 파일들을 기록해 둔다
insert into public.schema_migrations (version) values
  ('001_init.sql'),
  ('002_excel_features.sql'),
  ('003_household_sharing.sql'),
  ('004_invest_account_included.sql'),
  ('005_us_stocks.sql'),
  ('006_trade_fee_local_currency.sql'),
  ('007_holdings_and_trade_events.sql')
on conflict do nothing;

-- 2) 인덱스: 데이터가 많아져도 조회가 느려지지 않도록
--    모든 조회에 RLS 조건 user_id = my_owner_id() 가 붙으므로 user_id 로 찾는 인덱스가 필요하다.
--    (unique 제약에 user_id 가 앞에 있는 테이블은 이미 인덱스가 있어서 뺐다)
create index if not exists invest_accounts_user_idx on public.invest_accounts (user_id);
create index if not exists stock_holdings_user_idx on public.stock_holdings (user_id);
create index if not exists stock_trades_user_date_idx on public.stock_trades (user_id, trade_date);
create index if not exists bank_accounts_user_idx on public.bank_accounts (user_id);
create index if not exists deposits_user_idx on public.deposits (user_id);
create index if not exists installment_savings_user_idx on public.installment_savings (user_id);
create index if not exists loans_user_idx on public.loans (user_id);
create index if not exists real_assets_user_idx on public.real_assets (user_id);

--    다른 표를 가리키는 열(FK): 삭제 시 연결된 행 찾기, 삭제 확인창의 건수 세기에 쓰인다
create index if not exists transactions_category_idx on public.transactions (category_id);
create index if not exists transactions_payment_method_idx on public.transactions (payment_method_id);
create index if not exists transactions_member_idx on public.transactions (member_id);
create index if not exists budgets_category_idx on public.budgets (category_id);
create index if not exists stock_trades_account_idx on public.stock_trades (account_id);
create index if not exists stock_holdings_account_idx on public.stock_holdings (account_id);
