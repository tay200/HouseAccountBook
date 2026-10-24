import { createHashRouter } from 'react-router'
import Layout from './components/Layout.tsx'
import AssetsPage from './pages/AssetsPage.tsx'
import BudgetPage from './pages/BudgetPage.tsx'
import DashboardPage from './pages/DashboardPage.tsx'
import InvestPage from './pages/InvestPage.tsx'
import LedgerPage from './pages/LedgerPage.tsx'
import ReportPage from './pages/ReportPage.tsx'
import SettingsPage from './pages/SettingsPage.tsx'
import TransactionsPage from './pages/TransactionsPage.tsx'

// GitHub Pages는 '/transactions' 같은 경로로 새로고침하면 404를 반환한다.
// Hash 라우터는 주소를 '/#/transactions' 형태로 만들어 이 문제를 피한다.
export const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'transactions', element: <TransactionsPage /> },
      { path: 'budget', element: <BudgetPage /> },
      { path: 'report', element: <ReportPage /> },
      { path: 'invest', element: <InvestPage /> },
      { path: 'assets', element: <AssetsPage /> },
      { path: 'ledger', element: <LedgerPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
])
