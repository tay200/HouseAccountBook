# 가계부

웹 가계부. React + TypeScript + Vite + Tailwind CSS, 데이터는 Supabase, 배포는 GitHub Pages.

## 기능
| 메뉴 | 내용 |
|---|---|
| 대시보드 | 월 요약(수입·총지출·소비성·저축성·저축률), 소비성 지출 분석(예산·전월 대비), 변동지출 달력(무지출), 6개월 추이, 결제수단별·사람별 지출 |
| 거래 내역 | 수입(고정/부가)·지출(변동/고정/저축성) 기록, 대분류/소분류, 결제수단, 사람, 할인, 필터 |
| 예산 | 대분류별 월 예산과 사용률, 지난달 예산 복사 |
| 연간 리포트 | 월별 리포트, 재무 목표(월 저축액·저축률), 항목별·세부항목별·카드별·사람별 연간표 |
| 투자 | 계좌별 현황, 보유 종목, 매매 내역, 현재가 자동 조회(Edge Function) 또는 직접 입력 |
| 자산 · 부채 | 자산현황(기간별·위험 비율), 계좌, 예금, 적금, 대출(상환 스케줄), 부동자산, 연도별 순자산 |
| 통장 기록 | 공동통장·비상금처럼 입출금과 잔액만 따로 관리 |
| 설정 | 카테고리(2단계), 결제수단, 사람 |

## 폴더 구조
```
src/
  api/         Supabase 조회·저장 (TanStack Query 훅). createTableApi = 테이블별 CRUD 훅 공장
  auth/        로그인 화면과 로그인 상태 관리
  components/  여러 화면에서 쓰는 UI 조각 (CrudTable = 공용 편집 표)
  hooks/       공용 훅 (선택한 달, 이름 찾기)
  lib/         타입, 포맷, 통계·금융·투자 계산
  pages/       메뉴별 화면
supabase/
  migrations/  DB 변경 SQL (번호 순서대로 한 번씩 실행)
  functions/   Edge Function (현재가 조회)
private/       개인 데이터 (Git 에 올라가지 않음)
```

## 처음 설정

### 1. Supabase
1. SQL Editor 에서 `supabase/migrations/` 의 SQL 을 **번호 순서대로** 실행
2. Authentication → Users → **Add user** 로 내 계정 생성 (**Auto Confirm User** 체크)
3. Authentication → Sign In / Providers → **Allow new users to sign up** 끄기
4. Edge Functions → **Deploy a new function → Via Editor**, 이름 `stock-prices`, 내용은 `supabase/functions/stock-prices/index.ts`
5. Project Settings → API Keys 에서 **Project URL** 과 **Publishable key** 확인

### 2. 내 PC에서 실행
```bash
cp .env.example .env.local   # 값 채우기
npm install
npm run dev                  # http://localhost:5173
```

### 3. GitHub Pages 배포
1. 저장소 Settings → Pages → Source 를 **GitHub Actions** 로 선택
2. Settings → Secrets and variables → Actions → **Variables** 탭에
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` 등록
3. `main` 브랜치에 push 하면 자동 배포

> Publishable key 는 공개되어도 되는 키예요. 데이터는 DB의 RLS 규칙이 로그인한 본인에게만 허용합니다.

## 명령어
| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 타입 검사 + 배포용 빌드 (`dist/`) |
| `npm run lint` | 코드 검사 |
| `npm run preview` | 빌드 결과 미리보기 |
