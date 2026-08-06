/* ── AuthLayout.tsx ──────────────────────────────────────────────────────────
   Transparent passthrough — LoginPage and RegisterPage are fully self-contained
   split-panel pages and manage their own layout, titlebar, and background.
─────────────────────────────────────────────────────────────────────────── */
import { Outlet } from 'react-router-dom'

export default function AuthLayout() {
  return <Outlet />
}
