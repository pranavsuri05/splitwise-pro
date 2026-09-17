const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api'

export class ApiRequestError extends Error {
  code: string
  status: number
  fields?: Record<string, string>

  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.code = code
    this.fields = fields
  }
}

// Thrown when the request never reached the server at all (offline, DNS
// failure, backend down) — distinct from a structured API error response,
// so callers can show "check your connection" instead of a business error.
export class NetworkError extends Error {
  constructor() {
    super('Could not reach the server. Check your connection and try again.')
    this.name = 'NetworkError'
  }
}

interface ApiSuccessBody<T> {
  success: true
  data: T
}

interface ApiErrorBody {
  success: false
  error: {
    code: string
    message: string
    fields?: Record<string, string>
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  query?: Record<string, string | undefined>
  adminPassword?: string
}

function buildUrl(path: string, query?: Record<string, string | undefined>): string {
  const url = new URL(`${API_BASE_URL}${path}`)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        url.searchParams.set(key, value)
      }
    }
  }
  return url.toString()
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, adminPassword } = options

  const headers: Record<string, string> = {}
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  if (adminPassword) {
    headers['X-Admin-Password'] = adminPassword
  }

  let response: Response
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new NetworkError()
  }

  if (response.status === 204) {
    return undefined as T
  }

  let parsed: ApiSuccessBody<T> | ApiErrorBody
  try {
    parsed = await response.json()
  } catch {
    throw new ApiRequestError(response.status, 'INTERNAL_ERROR', 'Something went wrong.')
  }

  if (!parsed.success) {
    throw new ApiRequestError(
      response.status,
      parsed.error.code,
      parsed.error.message,
      parsed.error.fields,
    )
  }

  return parsed.data
}

export function get<T>(path: string, query?: Record<string, string | undefined>): Promise<T> {
  return apiRequest<T>(path, { method: 'GET', query })
}

export function post<T>(path: string, body?: unknown, adminPassword?: string): Promise<T> {
  return apiRequest<T>(path, { method: 'POST', body, adminPassword })
}

export function patch<T>(path: string, body?: unknown, adminPassword?: string): Promise<T> {
  return apiRequest<T>(path, { method: 'PATCH', body, adminPassword })
}

export function del<T>(path: string, adminPassword?: string): Promise<T> {
  return apiRequest<T>(path, { method: 'DELETE', adminPassword })
}
