import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import type { AuthTokens, User, Cat, CameraStream, CreateCatRequest, CreateStreamRequest, RegisterRequest } from '@/types'

// In Vite, env vars are accessed via import.meta.env (not process.env)
const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1'

export const api = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
})

// ── Attach JWT ───────────────────────────────────────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Handle 401 ───────────────────────────────────────────────────────────────
const AUTH_ENDPOINTS = ['/auth/login', '/auth/register']

api.interceptors.response.use(
  (r) => r,
  (err: AxiosError) => {
    const url = err.config?.url ?? ''
    const isAuthEndpoint = AUTH_ENDPOINTS.some((e) => url.includes(e))
    if (err.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('access_token')
      // In Electron/React Router we use hash routing — redirect to login
      window.location.hash = '#/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login:    (email: string, password: string) =>
    api.post<AuthTokens>('/auth/login', { email, password }),
  register: (data: RegisterRequest) => api.post<User>('/auth/register', data),
  me:       ()                       => api.get<User>('/auth/me'),
}

// ── Cats ─────────────────────────────────────────────────────────────────────
export const catsApi = {
  list:   ()                                              => api.get<Cat[]>('/cats/'),
  get:    (id: string)                                    => api.get<Cat>(`/cats/${id}`),
  create: (data: CreateCatRequest)                        => api.post<Cat>('/cats/', data),
  update: (id: string, data: Partial<CreateCatRequest>)   => api.put<Cat>(`/cats/${id}`, data),
  delete: (id: string)                                    => api.delete(`/cats/${id}`),
}

// ── Streams ───────────────────────────────────────────────────────────────────
export const streamsApi = {
  list:   ()                                                    => api.get<CameraStream[]>('/streams/'),
  get:    (id: string)                                          => api.get<CameraStream>(`/streams/${id}`),
  create: (data: CreateStreamRequest)                           => api.post<CameraStream>('/streams/', data),
  update: (id: string, d: Partial<CreateStreamRequest>)         => api.put<CameraStream>(`/streams/${id}`, d),
  delete: (id: string)                                          => api.delete(`/streams/${id}`),
  toggle: (id: string, is_active: boolean)                      => api.patch<CameraStream>(`/streams/${id}/toggle`, { is_active }),
}
