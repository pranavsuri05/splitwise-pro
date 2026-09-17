import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { failure, installMockApi, route, success } from '../test/mockApi.js'
import { renderWithProviders } from '../test/renderWithProviders.js'
import { SettlementScreen } from './SettlementScreen.js'

const SUGGESTION = {
  from_person: { id: 'p2', name: 'Rahul' },
  to_person: { id: 'p1', name: 'Sidhant' },
  amount: 400,
}
const HISTORY_ITEM = {
  id: 's1',
  from_person: { id: 'p3', name: 'Arjun' },
  to_person: { id: 'p1', name: 'Sidhant' },
  amount: 300,
  created_at: '2026-09-16T21:52:00Z',
}

function setup() {
  localStorage.setItem('splitwise-pro:current-group-id', 'group-1')
}

afterEach(() => vi.unstubAllGlobals())

function renderScreen() {
  return renderWithProviders(
    <Routes>
      <Route path="/settlement" element={<SettlementScreen />} />
    </Routes>,
    ['/settlement'],
  )
}

describe('SettlementScreen', () => {
  it('renders suggestions and history', async () => {
    setup()
    installMockApi([
      route('GET', '/groups/group-1/settlements/suggestions', () =>
        success({ suggestions: [SUGGESTION] }),
      ),
      route('GET', '/groups/group-1/settlements', () => success([HISTORY_ITEM])),
    ])

    renderScreen()

    expect(await screen.findByText('Rahul → Sidhant')).toBeInTheDocument()
    expect(screen.getByText('₹400')).toBeInTheDocument()
    expect(screen.getByText('Arjun → Sidhant')).toBeInTheDocument()
    expect(screen.getByText('₹300')).toBeInTheDocument()
  })

  it('shows the "all settled" empty state when there are no suggestions', async () => {
    setup()
    installMockApi([
      route('GET', '/groups/group-1/settlements/suggestions', () => success({ suggestions: [] })),
      route('GET', '/groups/group-1/settlements', () => success([])),
    ])

    renderScreen()

    expect(await screen.findByText('All settled 🎉')).toBeInTheDocument()
    expect(screen.getByText('No outstanding payments.')).toBeInTheDocument()
    expect(screen.getByText('No settlements logged yet.')).toBeInTheDocument()
  })

  it('never exposes settlement edit/delete controls (immutability)', async () => {
    setup()
    installMockApi([
      route('GET', '/groups/group-1/settlements/suggestions', () => success({ suggestions: [] })),
      route('GET', '/groups/group-1/settlements', () => success([HISTORY_ITEM])),
    ])

    renderScreen()

    await screen.findByText('Arjun → Sidhant')
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
  })

  it('logs a settlement with the admin password and refreshes balances/suggestions', async () => {
    setup()
    let suggestions = [SUGGESTION]
    let history: (typeof HISTORY_ITEM)[] = []
    installMockApi([
      route('GET', '/groups/group-1/settlements/suggestions', () => success({ suggestions })),
      route('GET', '/groups/group-1/settlements', () => success(history)),
      route('POST', '/groups/group-1/settlements', () => {
        suggestions = []
        history = [{ ...SUGGESTION, id: 's2', created_at: '2026-09-17T00:00:00Z' }]
        return success(history[0], 201)
      }),
    ])

    renderScreen()
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: '✓ Log Settlement' }))
    const dialog = screen.getByRole('dialog', { name: 'Log Settlement' })
    const passwordInput = within(dialog).getByLabelText('Admin Password', { selector: 'input' })
    await user.type(passwordInput, 'correct-password')
    await user.click(within(dialog).getByRole('button', { name: 'Log Settlement' }))

    await waitFor(() => expect(screen.getByText('All settled 🎉')).toBeInTheDocument())
  })

  it('shows the backend error and leaves the suggestion in place when logging is rejected', async () => {
    setup()
    installMockApi([
      route('GET', '/groups/group-1/settlements/suggestions', () =>
        success({ suggestions: [SUGGESTION] }),
      ),
      route('GET', '/groups/group-1/settlements', () => success([])),
      route('POST', '/groups/group-1/settlements', () =>
        failure(
          'INVALID_SETTLEMENT',
          "Settlement amount exceeds the sender's outstanding debt of ₹0.",
        ),
      ),
    ])

    renderScreen()
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: '✓ Log Settlement' }))
    const dialog = screen.getByRole('dialog', { name: 'Log Settlement' })
    const passwordInput = within(dialog).getByLabelText('Admin Password', { selector: 'input' })
    await user.type(passwordInput, 'correct-password')
    await user.click(within(dialog).getByRole('button', { name: 'Log Settlement' }))

    expect(
      await screen.findByText("Settlement amount exceeds the sender's outstanding debt of ₹0."),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Rahul → Sidhant').length).toBeGreaterThanOrEqual(1)
  })
})
