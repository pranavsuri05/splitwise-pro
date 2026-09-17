import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { failure, installMockApi, route, success } from '../test/mockApi.js'
import { renderWithProviders } from '../test/renderWithProviders.js'
import { SettingsScreen } from './SettingsScreen.js'

const GROUP = { id: 'group-1', name: 'Goa Trip', created_at: '' }

function setup() {
  localStorage.setItem('splitwise-pro:current-group-id', 'group-1')
}

afterEach(() => vi.unstubAllGlobals())

function renderScreen() {
  return renderWithProviders(
    <Routes>
      <Route path="/settings" element={<SettingsScreen />} />
      <Route path="/" element={<div>Home</div>} />
    </Routes>,
    ['/settings'],
  )
}

describe('SettingsScreen', () => {
  it('renames the group without requiring a password', async () => {
    setup()
    let currentGroup = GROUP
    installMockApi([
      route('GET', '/groups/group-1', () => success(currentGroup)),
      route('PATCH', '/groups/group-1', () => {
        currentGroup = { ...GROUP, name: 'Manali Trip' }
        return success(currentGroup)
      }),
    ])

    renderScreen()
    const user = userEvent.setup()

    await user.click(await screen.findByText('Goa Trip'))
    const dialog = screen.getByRole('dialog', { name: 'Group Name' })
    const input = within(dialog).getByLabelText('Group Name', { selector: 'input' })
    await user.clear(input)
    await user.type(input, 'Manali Trip')
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Manali Trip')).toBeInTheDocument()
  })

  it('requires the admin password to clear all transactions', async () => {
    setup()
    let cleared = false
    installMockApi([
      route('GET', '/groups/group-1', () => success(GROUP)),
      route('DELETE', '/groups/group-1/expenses', () => {
        cleared = true
        return { status: 204, body: undefined }
      }),
    ])

    renderScreen()
    const user = userEvent.setup()

    await user.click(await screen.findByText('Clear All Transactions'))
    expect(await screen.findByText('Clear all transactions?')).toBeInTheDocument()
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Clear All' }))

    const passwordInput = await screen.findByLabelText('Admin Password', { selector: 'input' })
    await user.type(passwordInput, 'correct-password')
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Clear All' }))

    await waitFor(() => expect(cleared).toBe(true))
  })

  it('shows a backend error when the delete-group password is incorrect', async () => {
    setup()
    installMockApi([
      route('GET', '/groups/group-1', () => success(GROUP)),
      route('DELETE', '/groups/group-1', () =>
        failure('INVALID_ADMIN_PASSWORD', 'Admin authorization failed.', 401),
      ),
    ])

    renderScreen()
    const user = userEvent.setup()

    await user.click(await screen.findByText('Delete Group'))
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete Group' }),
    )
    const passwordInput = await screen.findByLabelText('Admin Password', { selector: 'input' })
    await user.type(passwordInput, 'wrong')
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete Group' }),
    )

    expect(await screen.findByText('Incorrect admin password.')).toBeInTheDocument()
  })
})
