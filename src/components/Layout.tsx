import { NavLink, Outlet, useLocation } from 'react-router'

const navItems = [
  { to: '/', label: '대시보드' },
  { to: '/transactions', label: '거래 내역' },
  { to: '/budget', label: '예산' },
  { to: '/report', label: '연간 리포트' },
  { to: '/invest', label: '투자' },
  { to: '/assets', label: '자산 · 부채' },
  { to: '/ledger', label: '통장 기록' },
  { to: '/settings', label: '설정' },
]

export default function Layout() {
  // 메뉴를 옮겨도 ?month=... 가 유지되도록 현재 주소의 쿼리스트링을 그대로 붙인다
  const { search } = useLocation()

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-slate-200 bg-white p-4">
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

      <main className="min-w-0 flex-1 p-8">
        {/* 현재 주소에 맞는 자식 페이지가 이 자리에 그려진다 */}
        <Outlet />
      </main>
    </div>
  )
}
