export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">

      {/* ── Left decorative panel ───────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 bg-hero-gradient flex-col items-center justify-center relative overflow-hidden p-12">
        <div className="absolute top-10 right-10 w-48 h-48 bg-pawblue/40 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-32 h-32 bg-pawblue-medium/30 rounded-full blur-2xl" />

        <div className="relative z-10 text-center max-w-sm">
          <span className="text-7xl">🐾</span>
          <h1 className="font-display text-4xl font-extrabold text-text mt-6 mb-3">
            Welcome to PawCare
          </h1>
          <p className="text-text-muted text-base leading-relaxed">
            AI-powered monitoring that keeps your cat safe and happy — even when you&apos;re away.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-3 text-left">
            {[
              { icon: "📹", title: "Live Monitoring", sub: "Any camera, real-time" },
              { icon: "🤖", title: "AI Detection",   sub: "YOLOv8 + face recognition" },
              { icon: "🔔", title: "Smart Alerts",   sub: "Instant notifications" },
              { icon: "📊", title: "Analytics",      sub: "Behaviour trends" },
            ].map((f) => (
              <div key={f.title} className="bg-white/50 backdrop-blur-sm rounded-2xl p-4 shadow-soft">
                <span className="text-2xl">{f.icon}</span>
                <p className="font-semibold text-text text-sm mt-2">{f.title}</p>
                <p className="text-text-muted text-xs mt-0.5">{f.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right form panel ────────────────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white p-8 min-h-screen">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-8">
            <span className="text-3xl">🐾</span>
            <span className="font-display text-2xl font-bold text-text">PawCare</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}