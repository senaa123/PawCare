// Shared TypeScript types — mirrors the backend Pydantic schemas

export interface User {
  id:        string
  email:     string
  full_name: string
  is_active: boolean
}

export interface AuthTokens {
  access_token: string
  token_type:   string
}

export interface Cat {
  id:                  string
  name:                string
  breed:               string | null
  birth_date:          string | null
  weight_kg:           number | null
  profile_image_url:   string | null
  face_embedding_path: string | null
  owner_id:            string
}

export interface CameraStream {
  id:         string
  name:       string
  url:        string
  is_active:  boolean
  owner_id:   string
}

export interface Alert {
  id:          string
  title:       string
  description: string
  severity:    'info' | 'warning' | 'critical'
  is_read:     boolean
  created_at:  string
}

export interface CreateCatRequest {
  name:       string
  breed?:     string
  birth_date?: string
  weight_kg?:  number
}

export interface CreateStreamRequest {
  name:      string
  url:       string
  is_active?: boolean
}

export interface RegisterRequest {
  email:     string
  password:  string
  full_name: string
}
