export class ApiError extends Error {
  statusCode: number
  code: string
  fields?: Record<string, string>

  constructor(statusCode: number, code: string, message: string, fields?: Record<string, string>) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.code = code
    this.fields = fields
  }
}
