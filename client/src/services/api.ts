export interface HealthResponse {
  status: string
  timestamp: string
}

interface ApiSuccess<T> {
  success: true
  data: T
}

interface ApiFailure {
  success: false
  error: {
    code: string
    message: string
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api'

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health`)
  const body = (await response.json()) as ApiSuccess<HealthResponse> | ApiFailure

  if (!response.ok || !body.success) {
    throw new Error(!body.success ? body.error.message : 'Request failed.')
  }

  return body.data
}
