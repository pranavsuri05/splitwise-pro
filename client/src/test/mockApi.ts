import { vi } from 'vitest'

interface MockRoute {
  method: string
  match: (pathname: string) => boolean
  respond: (
    pathname: string,
    url: URL,
    init?: RequestInit,
  ) => { status: number; body: unknown } | Promise<{ status: number; body: unknown }>
}

export interface MockApi {
  fetchMock: ReturnType<typeof vi.fn>
  calls: { method: string; url: URL; body: unknown }[]
}

// A minimal hand-rolled request router standing in for the real backend in
// frontend unit tests — the goal is to exercise our own component/API-client
// logic, never the live Supabase-backed server.
export function installMockApi(routes: MockRoute[]): MockApi {
  const calls: MockApi['calls'] = []

  const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
    const url = new URL(input.toString())
    const method = (init?.method ?? 'GET').toUpperCase()
    calls.push({ method, url, body: init?.body ? JSON.parse(init.body as string) : undefined })

    const route = routes.find((r) => r.method === method && r.match(url.pathname))
    if (!route) {
      throw new Error(`Unhandled mock request: ${method} ${url.pathname}`)
    }

    const { status, body } = await route.respond(url.pathname, url, init)
    return new Response(status === 204 ? null : JSON.stringify(body), { status })
  })

  vi.stubGlobal('fetch', fetchMock)
  return { fetchMock, calls }
}

export function route(
  method: string,
  matcher: string | ((pathname: string) => boolean),
  respond: MockRoute['respond'],
): MockRoute {
  return {
    method: method.toUpperCase(),
    match:
      typeof matcher === 'string'
        ? (pathname) => pathname === matcher || pathname.endsWith(matcher)
        : matcher,
    respond,
  }
}

export function success(body: unknown, status = 200) {
  return { status, body: { success: true, data: body } }
}

export function failure(
  code: string,
  message: string,
  status = 422,
  fields?: Record<string, string>,
) {
  return { status, body: { success: false, error: { code, message, fields } } }
}
