import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { GroupProvider } from '../context/GroupContext.js'

export function renderWithProviders(element: ReactElement, initialEntries: string[] = ['/']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <GroupProvider>
        <MemoryRouter initialEntries={initialEntries}>{element}</MemoryRouter>
      </GroupProvider>
    </QueryClientProvider>,
  )
}
