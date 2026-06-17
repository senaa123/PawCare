import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import type {
  AuthTokens, User, Cat, CameraStream,
  CreateCatRequest, CreateStreamRequest, RegisterRequest,
} from "@/types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL: BASE,
  headers: { "Content-Type": "application/json" },
});

// ── Attach JWT ───────────────────────────────────────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Handle 401 ───────────────────────────────────────────────────────────────
// Skip auto-redirect for auth endpoints — let the form's catch handle errors.
const AUTH_ENDPOINTS = ["/auth/login", "/auth/register"];

api.interceptors.response.use(
  (r) => r,
  (err: AxiosError) => {
    const url = err.config?.url ?? "";
    const isAuthEndpoint = AUTH_ENDPOINTS.some((e) => url.includes(e));
    if (
      err.response?.status === 401 &&
      typeof window !== "undefined" &&
      !isAuthEndpoint
    ) {
      localStorage.removeItem("access_token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ── Auth ─────────────────────────────────────────────────────────────────────
// Backend login expects JSON { email, password }.
export const authApi = {
  login:    (email: string, password: string) =>
    api.post<AuthTokens>("/auth/login", { email, password }),
  register: (data: RegisterRequest) => api.post<User>("/auth/register", data),
  me:       ()                       => api.get<User>("/auth/me"),
};

// ── Cats ─────────────────────────────────────────────────────────────────────
export const catsApi = {
  list:   ()                                          => api.get<Cat[]>("/cats/"),
  get:    (id: number)                                => api.get<Cat>(`/cats/${id}`),
  create: (data: CreateCatRequest)                    => api.post<Cat>("/cats/", data),
  update: (id: number, data: Partial<CreateCatRequest>) => api.put<Cat>(`/cats/${id}`, data),
  delete: (id: number)                                => api.delete(`/cats/${id}`),
};

// ── Streams ───────────────────────────────────────────────────────────────────
export const streamsApi = {
  list:   ()                                              => api.get<CameraStream[]>("/streams/"),
  get:    (id: number)                                    => api.get<CameraStream>(`/streams/${id}`),
  create: (data: CreateStreamRequest)                     => api.post<CameraStream>("/streams/", data),
  update: (id: number, d: Partial<CreateStreamRequest>)   => api.put<CameraStream>(`/streams/${id}`, d),
  delete: (id: number)                                    => api.delete(`/streams/${id}`),
  toggle: (id: number, is_active: boolean)                => api.patch<CameraStream>(`/streams/${id}/toggle`, { is_active }),
};
