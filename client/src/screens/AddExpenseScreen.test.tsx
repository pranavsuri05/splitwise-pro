import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { failure, installMockApi, route, success } from '../test/mockApi.js'
import { renderWithProviders } from '../test/renderWithProviders.js'
import { AddExpenseScreen } from './AddExpenseScreen.js'

const PEOPLE = [
  { id: 'p1', name: 'Sidhant', is_active: true, created_at: '' },
  { id: 'p2', name: 'Rahul', is_active: true, created_at: '' },
  { id: 'p3', name: 'Arjun', is_active: true, created_at: '' },
]
const CATEGORIES = [{ id: 'c1', name: 'Food', created_at: '' }]

function setup() {
  localStorage.setItem('splitwise-pro:current-group-id', 'group-1')
}

afterEach(() => vi.unstubAllGlobals())

function renderScreen() {
  return renderWithProviders(
    <Routes>
      <Route path="/add-expense" element={<AddExpenseScreen />} />
      <Route path="/" element={<div>Home</div>} />
    </Routes>,
    ['/add-expense'],
  )
}

describe('AddExpenseScreen', () => {
  it('disables submit until required fields are valid, then computes an equal split with the deterministic remainder', async () => {
    setup()
    installMockApi([
      route('GET', '/groups/group-1/people', () => success(PEOPLE)),
      route('GET', '/groups/group-1/categories', () => success(CATEGORIES)),
    ])

    renderScreen()
    const user = userEvent.setup()

    const submit = await screen.findByRole('button', { name: 'Add Expense' })
    expect(submit).toBeDisabled()

    await user.type(screen.getByLabelText('Amount'), '100')
    await user.type(screen.getByLabelText('Description'), 'Remainder check')
    expect(submit).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /Select person/ }))
    await user.click(await screen.findByRole('button', { name: 'Sidhant' }))
    expect(submit).toBeDisabled()

    await user.click(screen.getByLabelText('Sidhant'))
    await user.click(screen.getByLabelText('Rahul'))
    await user.click(screen.getByLabelText('Arjun'))

    await waitFor(() => {
      expect(screen.getByLabelText('Sidhant share')).toHaveValue(34)
      expect(screen.getByLabelText('Rahul share')).toHaveValue(33)
      expect(screen.getByLabelText('Arjun share')).toHaveValue(33)
    })
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(submit).toBeEnabled()
  })

  it('rejects a zero-value share by disabling submission', async () => {
    setup()
    installMockApi([
      route('GET', '/groups/group-1/people', () => success(PEOPLE)),
      route('GET', '/groups/group-1/categories', () => success(CATEGORIES)),
    ])

    renderScreen()
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Amount'), '100')
    await user.type(screen.getByLabelText('Description'), 'Zero share')
    await user.click(screen.getByRole('button', { name: /Select person/ }))
    await user.click(await screen.findByRole('button', { name: 'Sidhant' }))
    await user.click(screen.getByLabelText('Sidhant'))
    await user.click(screen.getByLabelText('Rahul'))

    const rahulShare = screen.getByLabelText('Rahul share')
    await user.clear(rahulShare)
    await user.type(rahulShare, '0')

    const sidhantShare = screen.getByLabelText('Sidhant share')
    await user.clear(sidhantShare)
    await user.type(sidhantShare, '100')

    expect(
      await screen.findByText("Every participant's share must be at least ₹1."),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add Expense' })).toBeDisabled()
  })

  it('allows editing an unequal split as long as the total matches exactly', async () => {
    setup()
    installMockApi([
      route('GET', '/groups/group-1/people', () => success(PEOPLE)),
      route('GET', '/groups/group-1/categories', () => success(CATEGORIES)),
    ])

    renderScreen()
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Amount'), '1000')
    await user.type(screen.getByLabelText('Description'), 'Unequal cab split')
    await user.click(screen.getByRole('button', { name: /Select person/ }))
    await user.click(await screen.findByRole('button', { name: 'Rahul' }))
    await user.click(screen.getByLabelText('Sidhant'))
    await user.click(screen.getByLabelText('Rahul'))
    await user.click(screen.getByLabelText('Arjun'))

    const sidhantShare = screen.getByLabelText('Sidhant share')
    await user.clear(sidhantShare)
    await user.type(sidhantShare, '600')
    const rahulShare = screen.getByLabelText('Rahul share')
    await user.clear(rahulShare)
    await user.type(rahulShare, '300')
    const arjunShare = screen.getByLabelText('Arjun share')
    await user.clear(arjunShare)
    await user.type(arjunShare, '100')

    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add Expense' })).toBeEnabled()
  })

  it('submits successfully and returns to Home', async () => {
    setup()
    installMockApi([
      route('GET', '/groups/group-1/people', () => success(PEOPLE)),
      route('GET', '/groups/group-1/categories', () => success(CATEGORIES)),
      route('POST', '/groups/group-1/expenses', () =>
        success(
          {
            id: 'e1',
            description: 'Solo',
            amount: 500,
            paid_by: { id: 'p1', name: 'Sidhant' },
            category: null,
            shares: [{ person_id: 'p1', person_name: 'Sidhant', amount: 500 }],
            created_at: '2026-09-17T00:00:00Z',
          },
          201,
        ),
      ),
    ])

    renderScreen()
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Amount'), '500')
    await user.type(screen.getByLabelText('Description'), 'Solo')
    await user.click(screen.getByRole('button', { name: /Select person/ }))
    await user.click(await screen.findByRole('button', { name: 'Sidhant' }))
    await user.click(screen.getByLabelText('Sidhant'))

    await user.click(screen.getByRole('button', { name: 'Add Expense' }))

    expect(await screen.findByText('Home')).toBeInTheDocument()
  })

  it('shows a backend error and does not navigate away on failure', async () => {
    setup()
    installMockApi([
      route('GET', '/groups/group-1/people', () => success(PEOPLE)),
      route('GET', '/groups/group-1/categories', () => success(CATEGORIES)),
      route('POST', '/groups/group-1/expenses', () =>
        failure('INVALID_EXPENSE_SHARES', 'Shares must total ₹500.'),
      ),
    ])

    renderScreen()
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Amount'), '500')
    await user.type(screen.getByLabelText('Description'), 'Solo')
    await user.click(screen.getByRole('button', { name: /Select person/ }))
    await user.click(await screen.findByRole('button', { name: 'Sidhant' }))
    await user.click(screen.getByLabelText('Sidhant'))

    const submit = screen.getByRole('button', { name: 'Add Expense' })
    await user.click(submit)

    expect(await screen.findByText('Shares must total ₹500.')).toBeInTheDocument()
    expect(screen.queryByText('Home')).not.toBeInTheDocument()
  })

  it('prevents duplicate submission while a request is in progress', async () => {
    setup()
    let submitCount = 0
    installMockApi([
      route('GET', '/groups/group-1/people', () => success(PEOPLE)),
      route('GET', '/groups/group-1/categories', () => success(CATEGORIES)),
      route('POST', '/groups/group-1/expenses', async () => {
        submitCount += 1
        await new Promise((resolve) => setTimeout(resolve, 20))
        return success(
          {
            id: 'e1',
            description: 'Solo',
            amount: 500,
            paid_by: { id: 'p1', name: 'Sidhant' },
            category: null,
            shares: [{ person_id: 'p1', person_name: 'Sidhant', amount: 500 }],
            created_at: '',
          },
          201,
        )
      }),
    ])

    renderScreen()
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Amount'), '500')
    await user.type(screen.getByLabelText('Description'), 'Solo')
    await user.click(screen.getByRole('button', { name: /Select person/ }))
    await user.click(await screen.findByRole('button', { name: 'Sidhant' }))
    await user.click(screen.getByLabelText('Sidhant'))

    const submit = screen.getByRole('button', { name: 'Add Expense' })
    await user.click(submit)
    expect(submit).toBeDisabled()

    // A second click while the first request is still in flight must not
    // trigger a second submission — the button is disabled while pending.
    await user.click(submit)

    await waitFor(() => expect(screen.getByText('Home')).toBeInTheDocument())
    expect(submitCount).toBe(1)
  })
})
