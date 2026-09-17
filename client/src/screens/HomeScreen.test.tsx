import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { failure, installMockApi, route, success } from '../test/mockApi.js'
import { renderWithProviders } from '../test/renderWithProviders.js'
import { HomeScreen } from './HomeScreen.js'

const GROUP = { id: 'group-1', name: 'Goa Trip', created_at: '2026-09-01T00:00:00Z' }
const BALANCES = {
  total_outstanding: 670,
  balances: [
    { person_id: 'p1', person_name: 'Sidhant', balance: 670 },
    { person_id: 'p2', person_name: 'Rahul', balance: -420 },
    { person_id: 'p3', person_name: 'Arjun', balance: -250 },
  ],
}
const EXPENSES = [
  {
    id: 'e1',
    description: 'Dinner',
    amount: 2400,
    paid_by: { id: 'p1', name: 'Sidhant' },
    category: { id: 'c1', name: 'Food' },
    shares: [
      { person_id: 'p1', person_name: 'Sidhant', amount: 800 },
      { person_id: 'p2', person_name: 'Rahul', amount: 800 },
      { person_id: 'p3', person_name: 'Arjun', amount: 800 },
    ],
    created_at: '2026-09-17T21:42:00Z',
  },
]

function setupGroupContext() {
  localStorage.setItem('splitwise-pro:current-group-id', GROUP.id)
}

afterEach(() => {
  localStorage.clear()
  vi.unstubAllGlobals()
})

describe('HomeScreen', () => {
  beforeEach(setupGroupContext)

  it('renders group balances and transactions', async () => {
    installMockApi([
      route('GET', '/groups/group-1', () => success(GROUP)),
      route('GET', '/groups/group-1/balances', () => success(BALANCES)),
      route('GET', '/groups/group-1/categories', () =>
        success([{ id: 'c1', name: 'Food', created_at: '' }]),
      ),
      route('GET', '/groups/group-1/people', () =>
        success([{ id: 'p1', name: 'Sidhant', is_active: true, created_at: '' }]),
      ),
      route('GET', '/groups/group-1/expenses', () => success(EXPENSES)),
    ])

    renderWithProviders(<HomeScreen />)

    expect(await screen.findByText('Goa Trip')).toBeInTheDocument()
    expect(await screen.findByText('+₹670')).toBeInTheDocument()
    expect(screen.getByText('-₹420')).toBeInTheDocument()
    expect(await screen.findByText('Dinner')).toBeInTheDocument()
    expect(screen.getByText('₹2,400')).toBeInTheDocument()
  })

  it('shows an empty state when there are no expenses', async () => {
    installMockApi([
      route('GET', '/groups/group-1', () => success(GROUP)),
      route('GET', '/groups/group-1/balances', () =>
        success({ total_outstanding: 0, balances: [] }),
      ),
      route('GET', '/groups/group-1/categories', () => success([])),
      route('GET', '/groups/group-1/people', () => success([])),
      route('GET', '/groups/group-1/expenses', () => success([])),
    ])

    renderWithProviders(<HomeScreen />)

    expect(await screen.findByText('No expenses yet.')).toBeInTheDocument()
    expect(screen.getByText('Add your first expense.')).toBeInTheDocument()
  })

  it('shows a loading state before balances arrive, never a fake zero', async () => {
    installMockApi([
      route('GET', '/groups/group-1', () => success(GROUP)),
      route('GET', '/groups/group-1/balances', () => success(BALANCES)),
      route('GET', '/groups/group-1/categories', () => success([])),
      route('GET', '/groups/group-1/people', () => success([])),
      route('GET', '/groups/group-1/expenses', () => success([])),
    ])

    renderWithProviders(<HomeScreen />)

    expect(screen.getByText('Loading balances…')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('+₹670')).toBeInTheDocument())
  })

  it('shows an error state with retry when balances fail to load', async () => {
    let attempt = 0
    installMockApi([
      route('GET', '/groups/group-1', () => success(GROUP)),
      route('GET', '/groups/group-1/balances', () => {
        attempt += 1
        return attempt === 1
          ? failure('INTERNAL_ERROR', 'Something went wrong.', 500)
          : success(BALANCES)
      }),
      route('GET', '/groups/group-1/categories', () => success([])),
      route('GET', '/groups/group-1/people', () => success([])),
      route('GET', '/groups/group-1/expenses', () => success([])),
    ])

    renderWithProviders(<HomeScreen />)

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    await waitFor(() => expect(screen.getByText('+₹670')).toBeInTheDocument())
  })

  it('applies a category filter by re-querying with the categoryId parameter', async () => {
    const api = installMockApi([
      route('GET', '/groups/group-1', () => success(GROUP)),
      route('GET', '/groups/group-1/balances', () => success(BALANCES)),
      route('GET', '/groups/group-1/categories', () =>
        success([{ id: 'c1', name: 'Food', created_at: '' }]),
      ),
      route('GET', '/groups/group-1/people', () =>
        success([{ id: 'p1', name: 'Sidhant', is_active: true, created_at: '' }]),
      ),
      route('GET', '/groups/group-1/expenses', () => success(EXPENSES)),
    ])

    renderWithProviders(<HomeScreen />)
    await screen.findByText('Dinner')

    const user = userEvent.setup()
    await user.selectOptions(screen.getByLabelText('Filter by category'), 'c1')

    await waitFor(() => {
      const lastExpensesCall = api.calls.filter((c) => c.url.pathname.endsWith('/expenses')).pop()
      expect(lastExpensesCall?.url.searchParams.get('categoryId')).toBe('c1')
    })
  })

  it('includes an inactive (removed) person in the "filter by person" dropdown', async () => {
    const api = installMockApi([
      route('GET', '/groups/group-1', () => success(GROUP)),
      route('GET', '/groups/group-1/balances', () => success(BALANCES)),
      route('GET', '/groups/group-1/categories', () => success([])),
      route('GET', '/groups/group-1/people', () =>
        success([
          { id: 'p1', name: 'Sidhant', is_active: true, created_at: '' },
          { id: 'p2', name: 'Rahul', is_active: false, created_at: '' },
        ]),
      ),
      route('GET', '/groups/group-1/expenses', () => success(EXPENSES)),
    ])

    renderWithProviders(<HomeScreen />)
    await screen.findByText('Dinner')

    const personFilter = screen.getByLabelText('Filter by person')
    expect(within(personFilter).getByText('Rahul')).toBeInTheDocument()

    const user = userEvent.setup()
    await user.selectOptions(personFilter, 'p2')

    await waitFor(() => {
      const lastExpensesCall = api.calls.filter((c) => c.url.pathname.endsWith('/expenses')).pop()
      expect(lastExpensesCall?.url.searchParams.get('personId')).toBe('p2')
    })
  })

  it('opens the group selector when the group name is tapped', async () => {
    installMockApi([
      route('GET', '/groups', () =>
        success([GROUP, { id: 'group-2', name: 'Flat Expenses', created_at: '' }]),
      ),
      route('GET', '/groups/group-1', () => success(GROUP)),
      route('GET', '/groups/group-1/balances', () => success(BALANCES)),
      route('GET', '/groups/group-1/categories', () => success([])),
      route('GET', '/groups/group-1/people', () => success([])),
      route('GET', '/groups/group-1/expenses', () => success([])),
    ])

    renderWithProviders(<HomeScreen />)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /Goa Trip/ }))

    const dialog = await screen.findByRole('dialog', { name: 'Select Group' })
    expect(within(dialog).getByText('Flat Expenses')).toBeInTheDocument()
  })
})
