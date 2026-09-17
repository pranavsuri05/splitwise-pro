import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { installMockApi, route, success } from '../test/mockApi.js'
import { renderWithProviders } from '../test/renderWithProviders.js'
import { PeopleScreen } from './PeopleScreen.js'

function setup() {
  localStorage.setItem('splitwise-pro:current-group-id', 'group-1')
}

afterEach(() => vi.unstubAllGlobals())

function renderScreen() {
  return renderWithProviders(
    <Routes>
      <Route path="/settings/people" element={<PeopleScreen />} />
    </Routes>,
    ['/settings/people'],
  )
}

describe('PeopleScreen', () => {
  it('adds a person without requiring a password', async () => {
    setup()
    let people = [{ id: 'p1', name: 'Sidhant', is_active: true, created_at: '' }]
    installMockApi([
      route('GET', '/groups/group-1/people', () => success(people)),
      route('POST', '/groups/group-1/people', (_p, _url, init) => {
        const body = JSON.parse(init!.body as string)
        const person = { id: 'p2', name: body.name, is_active: true, created_at: '' }
        people = [...people, person]
        return success(person, 201)
      }),
    ])

    renderScreen()
    const user = userEvent.setup()

    await user.click(await screen.findByText('+ Add Person'))
    await user.type(screen.getByLabelText('Name'), 'Rahul')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(await screen.findByText('Rahul')).toBeInTheDocument()
  })

  it('shows active and inactive people, and requires the admin password to remove someone', async () => {
    setup()
    let people = [
      { id: 'p1', name: 'Sidhant', is_active: true, created_at: '' },
      { id: 'p2', name: 'Rahul', is_active: true, created_at: '' },
    ]
    installMockApi([
      route('GET', '/groups/group-1/people', () => success(people)),
      route('PATCH', '/groups/group-1/people/p2', () => {
        people = people.map((p) => (p.id === 'p2' ? { ...p, is_active: false } : p))
        return success(people.find((p) => p.id === 'p2'))
      }),
    ])

    renderScreen()
    const user = userEvent.setup()

    await user.click(await screen.findByText('Rahul'))
    expect(await screen.findByText('Remove Rahul?')).toBeInTheDocument()
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove' }))

    const passwordInput = await screen.findByLabelText('Admin Password', { selector: 'input' })
    await user.type(passwordInput, 'correct-password')
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove' }))

    await waitFor(() => expect(screen.getByText('Inactive')).toBeInTheDocument())
  })
})
