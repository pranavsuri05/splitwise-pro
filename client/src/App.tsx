import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppGate } from './AppGate.js'
import { GroupProvider } from './context/GroupContext.js'
import { AddExpenseScreen } from './screens/AddExpenseScreen.js'
import { CategoriesScreen } from './screens/CategoriesScreen.js'
import { ExpenseDetailScreen } from './screens/ExpenseDetailScreen.js'
import { HomeScreen } from './screens/HomeScreen.js'
import { PeopleScreen } from './screens/PeopleScreen.js'
import { SettingsScreen } from './screens/SettingsScreen.js'
import { SettlementScreen } from './screens/SettlementScreen.js'

// Exported so tests can clear the cache between renders of <App /> within
// the same file (module-level singleton, otherwise long-lived by design).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GroupProvider>
        <BrowserRouter>
          <AppGate>
            <Routes>
              <Route path="/" element={<HomeScreen />} />
              <Route path="/add-expense" element={<AddExpenseScreen />} />
              <Route path="/expenses/:expenseId" element={<ExpenseDetailScreen />} />
              <Route path="/settings" element={<SettingsScreen />} />
              <Route path="/settings/people" element={<PeopleScreen />} />
              <Route path="/settings/categories" element={<CategoriesScreen />} />
              <Route path="/settlement" element={<SettlementScreen />} />
            </Routes>
          </AppGate>
        </BrowserRouter>
      </GroupProvider>
    </QueryClientProvider>
  )
}

export default App
