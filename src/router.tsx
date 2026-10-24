import { createHashRouter } from 'react-router'
import Layout from './components/Layout.tsx'
import BudgetPage from './pages/BudgetPage.tsx'
import DashboardPage from './pages/DashboardPage.tsx'
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
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
])
