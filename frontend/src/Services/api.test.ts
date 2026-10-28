
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiRequest } from './api'

describe('apiRequest', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  
it('sends a GET request and returns JSON data', async () => {
  const mockData = { message: 'Success' }

  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(mockData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
  vi.stubGlobal('fetch', fetchMock)

  const result = await apiRequest<{ message: string }>('/test')

  expect(result).toEqual(mockData)

  expect(fetchMock).toHaveBeenCalledWith(
    'http://127.0.0.1:8000/api/v1/test',
    expect.objectContaining({
      headers: expect.any(Headers),
    }),
  )

  const requestOptions = fetchMock.mock.calls[0][1]
  expect(requestOptions?.method).toBeUndefined()
})


  it('adds the stored JWT to the Authorization header', async () => {
    localStorage.setItem('mindblaze_access_token', 'test-token')

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: 1 }), { status: 200 }),
      ),
    )

    await apiRequest('/tasks/')

    const requestOptions = vi.mocked(fetch).mock.calls[0][1]
    const headers = new Headers(requestOptions?.headers)

    expect(headers.get('Authorization')).toBe('Bearer test-token')
    expect(headers.get('Accept')).toBe('application/json')
  })

  it('throws the API error detail for unsuccessful responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: 'Invalid token' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(apiRequest('/tasks/')).rejects.toThrow('Invalid token')
  })

  it('uses a fallback message when the API error has no detail', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'Failed' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(apiRequest('/tasks/')).rejects.toThrow(
      'Request failed with status 500',
    )
  })

  it('returns undefined for a 204 response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
    )

    const result = await apiRequest<void>('/tasks/1')

    expect(result).toBeUndefined()
  })
})
