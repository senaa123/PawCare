import Link from "next/link";

const features = [
  {
    icon: "📹",
    title: "Live Camera Monitoring",
    desc: "Stream from any webcam, RTSP, or ESP32 camera. See your cat any time.",
  },
  {
    icon: "🤖",
    title: "AI Cat Detection",
    desc: "YOLOv8-powered vision recognises your cat's face and tracks their behaviour.",
  },
  {
    icon: "🔔",
    title: "Instant Smart Alerts",
    desc: "Get notified about excessive meowing, inactivity, or unknown visitors.",
  },
  {
    icon: "⚡",
    title: "Automation Rules",
    desc: "Trigger feeders, notifications, and actions based on real-time AI events.",
  },
  {
    icon: "📊",
    title: "Behaviour Analytics",
    desc: "Visualise activity trends, sound patterns, and weekly behaviour reports.",
  },
  {
    icon: "🐾",
    title: "Cat Profiles",
    desc: "Manage multiple cats with individual profiles, breed info, and history.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white overflow-hidden">

      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md shadow-nav">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🐾</span>
            <span className="font-display text-xl font-bold text-text">PawCare</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login"    className="btn-ghost text-sm">Sign in</Link>
            <Link href="/register" className="btn-primary text-sm">Get started free</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative bg-hero-gradient overflow-hidden">
        {/* decorative blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-pawblue/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0  w-64 h-64 bg-pawblue-medium/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6 py-24 lg:py-32 flex flex-col lg:flex-row items-center gap-12">
          {/* Text */}
          <div className="flex-1 animate-slide-up">
            <span className="badge bg-pawblue text-[#2B6CB0] mb-4">
              🚀 Powered by YOLOv8 + EfficientNet
            </span>
            <h1 className="font-display text-5xl lg:text-6xl font-extrabold text-text leading-tight mt-3">
              Your cat,{" "}
              <span className="text-pawblue-dark">always watched</span>
              <br />over.
            </h1>
            <p className="mt-5 text-text-muted text-lg leading-relaxed max-w-lg">
              PawCare uses real-time AI to monitor your cat through any camera — detecting behaviour,
              recognising their face, and alerting you the moment something needs attention.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/register" className="btn-primary text-base px-8 py-3">
                Start monitoring free →
              </Link>
              <Link href="/login" className="btn-secondary text-base px-8 py-3">
                Sign in
              </Link>
            </div>
            <p className="mt-4 text-text-light text-sm">No credit card needed · Works with any webcam</p>
          </div>

          {/* Hero image placeholder — replace with a real cat photo */}
          <div className="flex-1 flex justify-center">
            <div className="relative w-full max-w-md aspect-square">
              <div className="absolute inset-0 bg-pawblue/20 rounded-[3rem] rotate-3" />
              <div className="relative bg-white rounded-[2.5rem] shadow-cardHover overflow-hidden h-full flex items-center justify-center">
                {/* Swap this src for a real cat image */}
                <img
                  src="https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&q=80"
                  alt="Happy cat"
                  className="w-full h-full object-cover"
                />
                {/* Live overlay badge */}
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-white/90 rounded-2xl px-3 py-1.5 shadow-soft">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse-soft" />
                  <span className="text-xs font-semibold text-text">Live · AI Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="wave-bottom">
          <svg viewBox="0 0 1440 60" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <path d="M0,30 C360,60 1080,0 1440,30 L1440,60 L0,60 Z" fill="#ffffff" />
          </svg>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="font-display text-4xl font-bold text-text">
              Everything your cat needs. All in one place.
            </h2>
            <p className="mt-3 text-text-muted text-lg">
              From live detection to smart automations — PawCare handles it all.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="card-hover group">
                <span className="text-4xl">{f.icon}</span>
                <h3 className="font-display font-semibold text-lg text-text mt-4 mb-2">{f.title}</h3>
                <p className="text-text-muted text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────── */}
      <section className="py-24 bg-hero-gradient">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <span className="text-5xl">🐾</span>
          <h2 className="font-display text-4xl font-bold text-text mt-4 mb-4">
            Ready to keep your cat safe?
          </h2>
          <p className="text-text-muted text-lg mb-8">
            Set up in minutes. No hardware required beyond your existing camera.
          </p>
          <Link href="/register" className="btn-primary text-base px-10 py-3 inline-block">
            Create your free account →
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="bg-white py-8 border-t border-border">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🐾</span>
            <span className="font-display font-semibold text-text">PawCare</span>
          </div>
          <p className="text-text-light text-sm">
            © {new Date().getFullYear()} PawCare. Built with AI + love for cats.
          </p>
        </div>
      </footer>
    </div>
  );
}