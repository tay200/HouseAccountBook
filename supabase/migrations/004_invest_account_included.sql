-- 투자 계좌별 '합계에 포함' 여부 (예: 연금 계좌는 투자 탭 합계에서 빼기)
-- SQL Editor 에 붙여넣고 Run 하세요.
alter table public.invest_accounts
  add column included boolean not null default true;
