import { getCsrfToken } from './getCsrfToken';

type ApiFetchOptions = RequestInit & {
  json?: unknown;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// REFERENCE PATTERN: csrf-json-fetch — see AGENTS.md
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');

  if (options.json !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  const csrfToken = getCsrfToken();
  if (csrfToken) {
    headers.set('X-CSRF-Token', csrfToken);
  }

  const response = await fetch(path, {
    ...options,
    headers,
    credentials: 'same-origin',
    body: options.json === undefined ? options.body : JSON.stringify(options.json),
  });

  const contentType = response.headers.get('content-type') ?? '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof body === 'object' && body && 'error' in body ? String(body.error) : response.statusText;
    throw new ApiError(message, response.status);
  }

  return body as T;
}
