import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { failure, installMockApi, route, success } from '../test/mockApi.js'
import { renderWithProviders } from '../test/renderWithProviders.js'
import { ExpenseDetailScreen } from './ExpenseDetailScreen.js'

const EXPENSE = {
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
}
const PEOPLE = [
  { id: 'p1', name: 'Sidhant', is_active: true, created_at: '' },
  { id: 'p2', name: 'Rahul', is_active: true, created_at: '' },
  { id: 'p3', name: 'Arjun', is_active: true, created_at: '' },
]
const CATEGORIES = [{ id: 'c1', name: 'Food', created_at: '' }]

// Rahul has since been removed from the group, but was a participant on
// this historical expense; Varun is an active person not part of it yet.
const PEOPLE_WITH_INACTIVE_PARTICIPANT = [
  { id: 'p1', name: 'Sidhant', is_active: true, created_at: '' },
  { id: 'p2', name: 'Rahul', is_active: false, created_at: '' },
  { id: 'p3', name: 'Arjun', is_active: true, created_at: '' },
  { id: 'p4', name: 'Varun', is_active: true, created_at: '' },
]

function setup() {
  localStorage.setItem('splitwise-pro:current-group-id', 'group-1')
}

afterEach(() => vi.unstubAllGlobals())

function renderScreen() {
  return renderWithProviders(
    <Routes>
      <Route path="/expenses/:expenseId" element={<ExpenseDetailScreen />} />
      <Route path="/" element={<div>Home</div>} />
    </Routes>,
    ['/expenses/e1'],
  )
}

describe('ExpenseDetailScreen', () => {
  it('renders expense details correctly', async () => {
    setup()
    installMockApi([
      route('GET', '/groups/group-1/expenses/e1', () => success(EXPENSE)),
      route('GET', '/groups/group-1/people', () => success(PEOPLE)),
      route('GET', '/groups/group-1/categories', () => success(CATEGORIES)),
    ])

    renderScreen()

    expect(await screen.findByText('Dinner')).toBeInTheDocument()
    expect(screen.getByText('₹2,400')).toBeInTheDocument()
    expect(screen.getAllByText('Sidhant').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('₹800')).toHaveLength(3)
    expect(screen.getByText(/Food/)).toBeInTheDocument()
  })

  it('requires the admin password to edit, and updates on success', async () => {
    setup()
    let currentExpense = EXPENSE
    installMockApi([
      route('GET', '/groups/group-1/expenses/e1', () => success(currentExpense)),
      route('GET', '/groups/group-1/people', () => success(PEOPLE)),
      route('GET', '/groups/group-1/categories', () => success(CATEGORIES)),
      route('PATCH', '/groups/group-1/expenses/e1', () => {
        currentExpense = { ...EXPENSE, description: 'Dinner at Cafe' }
        return success(currentExpense)
      }),
    ])

    renderScreen()
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Edit' }))
    const description = screen.getByLabelText('Description')
    await user.clear(description)
    await user.type(description, 'Dinner at Cafe')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    const passwordInput = await screen.findByLabelText('Admin Password', { selector: 'input' })
    await user.type(passwordInput, 'correct-password')
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Save Changes' }),
    )

    expect(await screen.findByText('Dinner at Cafe')).toBeInTheDocument()
  })

  it('shows an error and keeps the sheet open on an incorrect admin password', async () => {
    setup()
    installMockApi([
      route('GET', '/groups/group-1/expenses/e1', () => success(EXPENSE)),
      route('GET', '/groups/group-1/people', () => success(PEOPLE)),
      route('GET', '/groups/group-1/categories', () => success(CATEGORIES)),
      route('PATCH', '/groups/group-1/expenses/e1', () =>
        failure('INVALID_ADMIN_PASSWORD', 'Admin authorization failed.', 401),
      ),
    ])

    renderScreen()
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Edit' }))
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    const passwordInput = await screen.findByLabelText('Admin Password', { selector: 'input' })
    await user.type(passwordInput, 'wrong-password')
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Save Changes' }),
    )

    expect(await screen.findByText('Incorrect admin password.')).toBeInTheDocument()
    expect(screen.getByLabelText('Admin Password', { selector: 'input' })).toBeInTheDocument()
  })

  it('requires confirmation and the admin password to delete, then navigates home', async () => {
    setup()
    installMockApi([
      route('GET', '/groups/group-1/expenses/e1', () => success(EXPENSE)),
      route('GET', '/groups/group-1/people', () => success(PEOPLE)),
      route('GET', '/groups/group-1/categories', () => success(CATEGORIES)),
      route('DELETE', '/groups/group-1/expenses/e1', () => ({ status: 204, body: undefined })),
    ])

    renderScreen()
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Delete' }))
    expect(await screen.findByText('Delete Expense?')).toBeInTheDocument()

    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))
    const passwordInput = await screen.findByLabelText('Admin Password', { selector: 'input' })
    await user.type(passwordInput, 'correct-password')
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(screen.getByText('Home')).toBeInTheDocument())
  })

  it('locks an inactive historical participant during edit: visible, labelled, and not selectable elsewhere', async () => {
    setup()
    installMockApi([
      route('GET', '/groups/group-1/expenses/e1', () => success(EXPENSE)),
      route('GET', '/groups/group-1/people', () => success(PEOPLE_WITH_INACTIVE_PARTICIPANT)),
      route('GET', '/groups/group-1/categories', () => success(CATEGORIES)),
    ])

    renderScreen()
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Edit' }))

    // The removed participant (Rahul) stays visible, labelled, checked and
    // locked — not removable/replaceable through normal selection.
    const rahulCheckbox = screen.getByRole('checkbox', { name: 'Rahul (inactive)' })
    expect(rahulCheckbox).toBeChecked()
    expect(rahulCheckbox).toBeDisabled()

    // An active person not yet on the expense is still selectable normally.
    const varunCheckbox = screen.getByRole('checkbox', { name: 'Varun' })
    expect(varunCheckbox).not.toBeChecked()
    expect(varunCheckbox).not.toBeDisabled()

    // The payer selector only offers active people — Rahul never appears
    // as a newly selectable payer.
    await user.click(screen.getByRole('button', { name: 'Sidhant' }))
    const payerDialog = screen.getByRole('dialog', { name: 'Paid by' })
    expect(within(payerDialog).queryByText('Rahul')).not.toBeInTheDocument()
    expect(within(payerDialog).getByText('Varun')).toBeInTheDocument()
  })

  it('shows a backend error and does not delete when the password is wrong', async () => {
    setup()
    installMockApi([
      route('GET', '/groups/group-1/expenses/e1', () => success(EXPENSE)),
      route('GET', '/groups/group-1/people', () => success(PEOPLE)),
      route('GET', '/groups/group-1/categories', () => success(CATEGORIES)),
      route('DELETE', '/groups/group-1/expenses/e1', () =>
        failure('INVALID_ADMIN_PASSWORD', 'Admin authorization failed.', 401),
      ),
    ])

    renderScreen()
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Delete' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))
    const passwordInput = await screen.findByLabelText('Admin Password', { selector: 'input' })
    await user.type(passwordInput, 'wrong')
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('Incorrect admin password.')).toBeInTheDocument()
    expect(screen.getByText('Dinner')).toBeInTheDocument()
  })
})
