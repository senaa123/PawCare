import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'

interface AuthState {
  token:          string | null
  user:           User   | null
  _hasHydrated:   boolean
  setHasHydrated: (val: boolean) => void
  setAuth:        (token: string, user: User) => void
  setUser:        (user: User) => void
  logout:         () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token:          null,
      user:           null,
      _hasHydrated:   false,

      setHasHydrated: (val) => set({ _hasHydrated: val }),

      setAuth: (token, user) => {
        localStorage.setItem('access_token', token)
        set({ token, user })
      },

      setUser: (user) => set({ user }),

      logout: () => {
        localStorage.removeItem('access_token')
        set({ token: null, user: null })
      },
    }),
    {
      name: 'pawcare-auth',
      partialize: (s) => ({ token: s.token, user: s.user }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)
