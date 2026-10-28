import { apiRequest } from './api'
import type {
  LoginRequest,
  RegisterRequest,
  TokenResponse,
  User,
} from '../types/auth'

const TOKEN_KEY = 'mindblaze_access_token'

export async function registerUser(
  data: RegisterRequest,
): Promise<User> {
  return apiRequest<User>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function loginUser(
  data: LoginRequest,
): Promise<TokenResponse> {
  const result = await apiRequest<TokenResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  })

  localStorage.setItem(TOKEN_KEY, result.access_token)

  return result
}

export function logoutUser(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}