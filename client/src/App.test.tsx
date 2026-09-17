import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('App', () => {
  it('renders the app title and reports a connected backend', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { status: 'ok', timestamp: 'now' } }),
      }),
    )

    render(<App />)

    expect(screen.getByText('Splitwise Pro')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Backend: connected')).toBeInTheDocument())
  })

  it('reports an unreachable backend when the health check fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))

    render(<App />)

    await waitFor(() => expect(screen.getByText('Backend: unreachable')).toBeInTheDocument())
  })
})
