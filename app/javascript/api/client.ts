export class ApiValidationError extends Error {
  errors: Record<string, string[]>

  constructor(errors: Record<string, string[]>) {
    super("Validation failed")
    this.name = "ApiValidationError"
    this.errors = errors
  }
}

export class ApiRequestError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiRequestError"
    this.status = status
  }
}

interface ApiMeta {
  success: boolean
  error?: string
  errors?: Record<string, string[]>
}

function csrfToken(): string | undefined {
  return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(csrfToken() ? { "X-CSRF-Token": csrfToken()! } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new ApiRequestError("Network error — please check your connection and try again.", 0)
  }
  const body = (await response.json()) as { meta: ApiMeta }

  if (response.status === 422) {
    throw new ApiValidationError(body.meta.errors ?? {})
  }
  if (!response.ok) {
    throw new ApiRequestError(body.meta.error ?? response.statusText, response.status)
  }
  return body as T
}
