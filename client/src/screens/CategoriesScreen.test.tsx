import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { installMockApi, route, success } from '../test/mockApi.js'
import { renderWithProviders } from '../test/renderWithProviders.js'
import { CategoriesScreen } from './CategoriesScreen.js'

function setup() {
  localStorage.setItem('splitwise-pro:current-group-id', 'group-1')
}

afterEach(() => vi.unstubAllGlobals())

function renderScreen() {
  return renderWithProviders(
    <Routes>
      <Route path="/settings/categories" element={<CategoriesScreen />} />
    </Routes>,
    ['/settings/categories'],
  )
}

describe('CategoriesScreen', () => {
  it('adds a category without a password', async () => {
    setup()
    let categories = [{ id: 'c1', name: 'Food', created_at: '' }]
    installMockApi([
      route('GET', '/groups/group-1/categories', () => success(categories)),
      route('POST', '/groups/group-1/categories', (_p, _u, init) => {
        const body = JSON.parse(init!.body as string)
        const category = { id: 'c2', name: body.name, created_at: '' }
        categories = [...categories, category]
        return success(category, 201)
      }),
    ])

    renderScreen()
    const user = userEvent.setup()

    await user.click(await screen.findByText('+ Add Category'))
    await user.type(screen.getByLabelText('Name'), 'Travel')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(await screen.findByText(/Travel/)).toBeInTheDocument()
  })

  it('removes a category without a password, preserving historical expenses (backend handles the Uncategorized fallback)', async () => {
    setup()
    let categories = [{ id: 'c1', name: 'Food', created_at: '' }]
    installMockApi([
      route('GET', '/groups/group-1/categories', () => success(categories)),
      route('DELETE', '/groups/group-1/categories/c1', () => {
        categories = []
        return { status: 204, body: undefined }
      }),
    ])

    renderScreen()
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Remove Food' }))

    await waitFor(() => expect(screen.getByText('No categories yet.')).toBeInTheDocument())
  })
})
