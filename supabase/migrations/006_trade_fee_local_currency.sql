-- 매매 수수료·세금(fee)을 '해당 통화'로 저장한다: 한국 주식 = 원, 미국 주식 = 달러(소수점 가능)
-- 기존 값(원화 정수)은 그대로 유지된다. (기존 미국 매매는 모두 0)
alter table public.trades alter column fee type numeric;
