/* ── LoginPage.tsx ───────────────────────────────────────────────────────────
   Pixel-perfect implementation matching the PawCare Sign-in HTML reference.
─────────────────────────────────────────────────────────────────────────── */
import { useState }          from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore }      from '@/store/authStore'
import { authApi }           from '@/lib/api'

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth  = useAuthStore((s) => s.setAuth)

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('••••••••')
  const [showPw,   setShowPw]   = useState(false)
  const [remember, setRemember] = useState(true)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await authApi.login(email, password)
      const token = res.data.access_token
      localStorage.setItem('access_token', token)
      const meRes = await authApi.me()
      setAuth(token, meRes.data)
      navigate('/dashboard', { replace: true })
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 422) {
        setError('Invalid email or password.')
      } else {
        setError('Could not connect to PawCare server.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#FBF6ED] text-[#22201B] font-sans overflow-hidden select-none">

      {/* ── Custom titlebar ─────────────────────────────────────────────── */}
      <div className="drag-region h-10 flex-shrink-0 flex items-center justify-between px-4 relative z-20 bg-transparent">
        <span className="text-xs text-[#6B6558] tracking-wide no-drag">PawCare</span>
        <div className="no-drag flex items-center gap-2">
          <button
            onClick={() => (window as any).electron?.ipcRenderer?.send('window-minimize')}
            className="w-2.5 h-2.5 rounded-full bg-[#22201B]/20 hover:bg-yellow-500 transition-colors"
          />
          <button
            onClick={() => (window as any).electron?.ipcRenderer?.send('window-maximize')}
            className="w-2.5 h-2.5 rounded-full bg-[#22201B]/20 hover:bg-green-500 transition-colors"
          />
          <button
            onClick={() => (window as any).electron?.ipcRenderer?.send('window-close')}
            className="w-2.5 h-2.5 rounded-full bg-[#22201B]/20 hover:bg-red-500 transition-colors"
          />
        </div>
      </div>

      {/* ── Main body row ────────────────────────────────────────────────── */}
      <div className="flex flex-1 relative overflow-hidden">

        {/* ── LEFT — Brand Panel (44% width) ────────────────────────────── */}
        <div className="w-[44%] bg-[#1F3A2E] text-[#CFE0D3] relative px-16 pt-8 pb-12 flex flex-col justify-between overflow-hidden">

          {/* Paw field background pattern */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.05] pointer-events-none" viewBox="0 0 400 800" preserveAspectRatio="none">
            <defs>
              <pattern id="paws" width="80" height="80" patternUnits="userSpaceOnUse">
                <path d="M20 30c0-4 3-7 7-7s7 3 7 7-3 7-7 7-7-3-7-7Zm20-6c0-3 2-5 5-5s5 2 5 5-2 5-5 5-5-2-5-5Zm-30 0c0-3 2-5 5-5s5 2 5 5-2 5-5 5-5-2-5-5Zm15 12c-7 0-13 5-13 12 0 6 6 10 13 10s13-4 13-10c0-7-6-12-13-12Z" fill="#F4EFE3"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#paws)"/>
          </svg>

          {/* Brand Top — Logo */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[9px] bg-[#E8813A] flex items-center justify-center relative">
                <div className="absolute top-[5px] right-[5px] w-1.5 h-1.5 rounded-full bg-white/60" />
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="8" cy="8" r="1.6"/><circle cx="16" cy="8" r="1.6"/><circle cx="5.5" cy="13" r="1.4"/><circle cx="18.5" cy="13" r="1.4"/>
                  <path d="M12 13c-4 0-6.5 2.4-6.5 5.2 0 2.1 2.3 3.3 6.5 3.3s6.5-1.2 6.5-3.3c0-2.8-2.5-5.2-6.5-5.2Z"/>
                </svg>
              </div>
              <span className="font-serif text-xl font-medium text-[#F4EFE3] tracking-tight" style={{ fontFamily: 'Fraunces, serif' }}>
                PawCare
              </span>
            </div>
          </div>

          {/* Brand Mid — Headline */}
          <div className="relative z-10 mt-12">
            <div className="text-xs tracking-[0.12em] uppercase text-[#E8813A] font-semibold mb-4">
              Desktop monitoring
            </div>
            <h1 className="font-serif text-[42px] leading-[1.18] font-normal text-[#F7F3E9] max-w-[9.5em]" style={{ fontFamily: 'Fraunces, serif' }}>
              Every whisker,<br />
              <em className="italic text-[#E8813A] font-normal">watched with care.</em>
            </h1>
            <p className="mt-5 text-[15px] leading-relaxed text-[#CFE0D3]/85 max-w-[26em]">
              Local AI keeps an eye on your cats while you're away — no footage ever leaves your machine.
            </p>
          </div>

          {/* Feature List */}
          <div className="relative z-10 mt-auto flex flex-col pt-8">
            <div className="flex items-center gap-3.5 py-4 border-t border-white/14">
              <div className="w-8 h-8 rounded-[9px] bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 stroke-[#EFE7D8]" viewBox="0 0 24 24" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.2"/>
                </svg>
              </div>
              <div className="text-left">
                <b className="block text-sm font-semibold text-[#F4EFE3]">Live monitoring</b>
                <span className="text-[12.5px] text-[#CFE0D3]/75">Any camera, real time</span>
              </div>
            </div>

            <div className="flex items-center gap-3.5 py-4 border-t border-white/14">
              <div className="w-8 h-8 rounded-[9px] bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 stroke-[#EFE7D8]" viewBox="0 0 24 24" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="8.5"/><path d="M9 10.5c0-.9.7-1.5 1.5-1.5M14 10.5c0-.9-.7-1.5-1.5-1.5M8 15c1 1 2.5 1.5 4 1.5s3-.5 4-1.5"/>
                </svg>
              </div>
              <div className="text-left">
                <b className="block text-sm font-semibold text-[#F4EFE3]">AI detection</b>
                <span className="text-[12.5px] text-[#CFE0D3]/75">YOLOv8 and face recognition</span>
              </div>
            </div>

            <div className="flex items-center gap-3.5 py-4 border-t border-white/14">
              <div className="w-8 h-8 rounded-[9px] bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 stroke-[#EFE7D8]" viewBox="0 0 24 24" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8a6 6 0 1 0-12 0c0 4-2 5-2 7h16c0-2-2-3-2-7Z"/><path d="M10 19a2 2 0 0 0 4 0"/>
                </svg>
              </div>
              <div className="text-left">
                <b className="block text-sm font-semibold text-[#F4EFE3]">Smart alerts</b>
                <span className="text-[12.5px] text-[#CFE0D3]/75">Instant notifications</span>
              </div>
            </div>

            <div className="flex items-center gap-3.5 py-4 border-t border-b border-white/14">
              <div className="w-8 h-8 rounded-[9px] bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 stroke-[#EFE7D8]" viewBox="0 0 24 24" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 20V10M11 20V4M18 20v-7"/>
                </svg>
              </div>
              <div className="text-left">
                <b className="block text-sm font-semibold text-[#F4EFE3]">Analytics</b>
                <span className="text-[12.5px] text-[#CFE0D3]/75">Behaviour trends over time</span>
              </div>
            </div>
          </div>
        </div>

        {/* Wave Divider SVG */}
        <svg className="absolute top-0 left-[44%] w-16 h-full -translate-x-8 z-10 pointer-events-none" viewBox="0 0 64 1000" preserveAspectRatio="none">
          <path d="M32 0 C 8 62, 56 125, 32 187 C 8 250, 56 312, 32 375 C 8 437, 56 500, 32 562 C 8 625, 56 687, 32 750 C 8 812, 56 875, 32 937 C 20 968, 32 1000, 32 1000 L 0 1000 L 0 0 Z" fill="#1F3A2E"/>
        </svg>

        {/* ── RIGHT — Form Panel ────────────────────────────────────────── */}
        <div className="flex-1 bg-[#FBF6ED] flex items-center justify-center relative p-8">
          <div className="w-[380px]">

            {/* Form Eyebrow */}
            <div className="text-xs text-[#6B6558] tracking-wider flex items-center gap-1.5 mb-5 font-normal">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5FA872]" />
              Signed out
            </div>

            {/* Form Title */}
            <h2 className="font-serif text-[32px] font-normal text-[#22201B] mb-2" style={{ fontFamily: 'Fraunces, serif' }}>
              Welcome back
            </h2>
            <p className="text-sm text-[#6B6558] mb-8 leading-relaxed">
              Sign in to check in on Milo, Fluffy and Arny.
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="mb-4 text-left">
                <label htmlFor="email" className="block text-[13px] font-semibold text-[#22201B] mb-1.5">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-[46px] border border-[#E3D6BC] bg-white rounded-[10px] px-3.5 text-sm text-[#22201B] outline-none focus:border-[#1F3A2E] focus:ring-2 focus:ring-[#1F3A2E]/10 transition-colors"
                  required
                />
              </div>

              <div className="mb-4 text-left">
                <label htmlFor="password" className="block text-[13px] font-semibold text-[#22201B] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPw ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-[46px] border border-[#E3D6BC] bg-white rounded-[10px] px-3.5 pr-10 text-sm text-[#22201B] outline-none focus:border-[#1F3A2E] focus:ring-2 focus:ring-[#1F3A2E]/10 transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6558] hover:text-[#22201B] transition-colors"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Remember me & Forgot Password */}
              <div className="flex items-center justify-between mb-6">
                <label className="flex items-center gap-2 text-[13px] text-[#6B6558] font-normal cursor-pointer">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-[15px] h-[15px] accent-[#1F3A2E] rounded cursor-pointer"
                  />
                  Remember me
                </label>
                <a href="#" className="text-[13px] text-[#1F3A2E] font-semibold hover:underline">
                  Forgot password?
                </a>
              </div>

              {error && (
                <div className="mb-4 p-3 text-xs bg-red-50 text-red-600 border border-red-200 rounded-[10px] text-left">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-[48px] bg-[#E8813A] hover:bg-[#C4661F] text-white rounded-[10px] font-sans font-semibold text-[14.5px] flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm disabled:opacity-50"
              >
                {loading ? (
                  <span>Signing in…</span>
                ) : (
                  <>
                    Sign in
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M13 5l7 7-7 7"/>
                    </svg>
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6 text-xs text-[#6B6558]">
              <div className="flex-1 h-[1px] bg-[#E3D6BC]" />
              or
              <div className="flex-1 h-[1px] bg-[#E3D6BC]" />
            </div>

            {/* Register Link */}
            <p className="text-center text-[13.5px] text-[#6B6558]">
              Don't have an account?{' '}
              <Link to="/register" className="text-[#1F3A2E] font-semibold hover:underline">
                Create one free
              </Link>
            </p>
          </div>

          {/* PawCare Version Footer Corner */}
          <div className="absolute bottom-7 right-9 text-[11.5px] text-[#B7AF9C] flex items-center gap-1.5 pointer-events-none">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="8" cy="8" r="2.2"/><circle cx="16" cy="8" r="2.2"/><circle cx="5" cy="13.5" r="1.9"/><circle cx="19" cy="13.5" r="1.9"/>
              <path d="M12 13c-4.4 0-7 2.6-7 5.6 0 2.3 2.5 3.6 7 3.6s7-1.3 7-3.6c0-3-2.6-5.6-7-5.6Z"/>
            </svg>
            PawCare v1.0
          </div>
        </div>

      </div>
    </div>
  )
}
