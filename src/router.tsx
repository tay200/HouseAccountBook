import type { ComponentType } from 'react'
import { createHashRouter } from 'react-router'
import Layout from './components/Layout.tsx'

// GitHub Pages는 '/transactions' 같은 경로로 새로고침하면 404를 반환한다.
// Hash 라우터는 주소를 '/#/transactions' 형태로 만들어 이 문제를 피한다.
//
// 화면마다 lazy 로 불러온다 (코드 분할): 처음에는 지금 여는 화면의 코드만 받고,
// 다른 메뉴를 누를 때 그 화면 코드를 받는다. 차트 라이브러리처럼 큰 코드는 쓰는 화면에서만 받게 된다.
const page = (load: () => Promise<{ default: ComponentType }>) => async () => ({ Component: (await load()).default })

export const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, lazy: page(() => import('./pages/DashboardPage.tsx')) },
      { path: 'transactions', lazy: page(() => import('./pages/TransactionsPage.tsx')) },
      { path: 'budget', lazy: page(() => import('./pages/BudgetPage.tsx')) },
      { path: 'report', lazy: page(() => import('./pages/ReportPage.tsx')) },
      { path: 'invest', lazy: page(() => import('./pages/InvestPage.tsx')) },
      { path: 'assets', lazy: page(() => import('./pages/AssetsPage.tsx')) },
      { path: 'ledger', lazy: page(() => import('./pages/LedgerPage.tsx')) },
      { path: 'settings', lazy: page(() => import('./pages/SettingsPage.tsx')) },
    ],
  },
])
