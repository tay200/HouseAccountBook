import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { useMonthlySnapshotSync } from '../hooks/useMonthlySnapshotSync'

const navItems = [
  { to: '/', label: '대시보드' },
  { to: '/transactions', label: '수입/지출 내역' },
  { to: '/budget', label: '예산' },
  { to: '/report', label: '연간 리포트' },
  { to: '/invest', label: '투자' },
  { to: '/assets', label: '자산 · 부채' },
  { to: '/ledger', label: '통장 기록' },
  { to: '/gifts', label: '경조사' },
  { to: '/settings', label: '설정' },
]

// 휴대폰 하단 탭에 바로 보이는 메뉴. 나머지는 '더보기' 안에 넣는다
const tabItems = [
  { to: '/', label: '대시보드' },
  { to: '/transactions', label: '내역' },
]
const tabItemsAfterAdd = [{ to: '/budget', label: '예산' }]
const moreItems = navItems.filter((item) => !['/', '/transactions', '/budget'].includes(item.to))

/** 다른 화면에 있다가 (+)를 누르면 거래 내역으로 가면서 입력 폼을 열라고 알려주는 표시 */
export type NewTransactionState = { newTransaction: true }

export default function Layout() {
  // 메뉴를 옮겨도 ?month=... 가 유지되도록 현재 주소의 쿼리스트링을 그대로 붙인다
  const { search, pathname } = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)
  const inMore = moreItems.some((item) => item.to === pathname)
  // 어느 화면을 열든 이번 달 자산 기록을 지금 값으로 맞춘다 (지난달 대비 비교용)
  useMonthlySnapshotSync()

  return (
    <div className="flex min-h-screen">
      {/* PC: 왼쪽 사이드바 (md = 화면 폭 768px 이상에서만 보임) */}
      <aside className="hidden w-56 shrink-0 border-r border-slate-200 bg-white p-4 md:block">
        <h1 className="mb-6 px-3 text-lg font-bold">가계부</h1>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={{ pathname: item.to, search }}
              end={item.to === '/'}
              // NavLink는 현재 주소와 일치하면 isActive=true를 넘겨준다
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* 휴대폰에서는 아래쪽 탭이 화면을 가리지 않도록 아래 여백(pb-24)을 더 둔다 */}
      <main className="min-w-0 flex-1 p-4 pb-24 md:p-8">
        {/* 현재 주소에 맞는 자식 페이지가 이 자리에 그려진다 */}
        <Outlet />
      </main>

      {/* 휴대폰: 아래쪽 고정 탭 (md 이상에서는 숨김) */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        {moreOpen && (
          <>
            {/* 메뉴 바깥을 누르면 닫히도록 화면 전체를 덮는 투명한 판 */}
            <div className="fixed inset-0 -z-10" onClick={() => setMoreOpen(false)} />
            <div className="absolute right-2 bottom-full mb-2 flex w-44 flex-col rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
              {moreItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={{ pathname: item.to, search }}
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-2.5 text-sm font-medium ${isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600'}`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </>
        )}
        <div className="grid grid-cols-5 items-center">
          {tabItems.map((item) => (
            <TabLink key={item.to} to={item.to} label={item.label} search={search} onClick={() => setMoreOpen(false)} />
          ))}
          <div className="flex justify-center">
            <NavLink
              to={{ pathname: '/transactions', search }}
              // state 는 주소에 보이지 않는 표시. 거래 내역 화면이 이걸 보고 입력 폼으로 스크롤한다
              state={{ newTransaction: true } satisfies NewTransactionState}
              onClick={() => setMoreOpen(false)}
              aria-label="거래 입력"
              className="flex size-12 items-center justify-center rounded-full bg-blue-600 text-2xl text-white shadow-md"
            >
              +
            </NavLink>
          </div>
          {tabItemsAfterAdd.map((item) => (
            <TabLink key={item.to} to={item.to} label={item.label} search={search} onClick={() => setMoreOpen(false)} />
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            className={`py-3 text-xs font-medium ${inMore || moreOpen ? 'text-blue-700' : 'text-slate-500'}`}
          >
            더보기
          </button>
        </div>
      </nav>
    </div>
  )
}

function TabLink({ to, label, search, onClick }: { to: string; label: string; search: string; onClick: () => void }) {
  return (
    <NavLink
      to={{ pathname: to, search }}
      end={to === '/'}
      onClick={onClick}
      className={({ isActive }) => `py-3 text-center text-xs font-medium ${isActive ? 'text-blue-700' : 'text-slate-500'}`}
    >
      {label}
    </NavLink>
  )
}
