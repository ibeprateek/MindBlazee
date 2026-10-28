export interface User {
  id: number
  email: string
  full_name: string | null
  is_active: boolean
}

export interface RegisterRequest {
  email: string
  full_name?: string | null
  password: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
}