const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  'http://127.0.0.1:8000/api/v1'

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem('mindblaze_access_token')

  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const data = await response.json().catch(() => null)

    const message =
      typeof data?.detail === 'string'
        ? data.detail
        : `Request failed with status ${response.status}`

    throw new Error(message)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}


export interface MLFatiguePredictionRequest {
  work_hours: number
  interruption_count: number
  pending_task_minutes: number
  task_difficulty_1_to_5: number
  sleep_hours: number | null
  activity_type: string
}

export interface MLFatiguePredictionResponse {
  predicted_fatigue_rating: number
  scale: '0-10'
  model: string
  disclaimer: string
}

export async function predictMLFatigue(
  data: MLFatiguePredictionRequest,
): Promise<MLFatiguePredictionResponse> {
  return apiRequest<MLFatiguePredictionResponse>(
    '/analytics/fatigue/ml-predict',
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  )
}
