-- 미국 주식 지원
--   market: KR(한국, 원화) / US(미국, 달러). US 는 stock_code 에 티커(AAPL 등)를 넣는다.
--   buy_fx_rate / sell_fx_rate: 매수·매도 당시 환율(원/달러). 비우면 현재 환율로 계산한다.
--   환율 현재값은 stock_prices 에 stock_code = 'USDKRW' 로 저장한다.
alter table public.trades
  add column market text not null default 'KR' check (market in ('KR', 'US')),
  add column buy_fx_rate numeric check (buy_fx_rate > 0),
  add column sell_fx_rate numeric check (sell_fx_rate > 0);
