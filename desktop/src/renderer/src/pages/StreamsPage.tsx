import { TopBar } from '@/components/shared/TopBar'
import { Video, Sparkles, ShieldCheck } from 'lucide-react'

export default function StreamsPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <TopBar
        title="Camera streams"
        subtitle="Multi-camera IP stream hub & RTSP network configuration"
      />

      <div className="bg-white rounded-2xl border border-[#E8DFC8] shadow-card p-12 text-center max-w-2xl mx-auto mt-8 flex flex-col items-center">
        {/* Icon Badge */}
        <div className="w-16 h-16 rounded-2xl bg-[#FEF6EC] border border-[#F5D8B8] flex items-center justify-center mb-6 text-[#E8813A]">
          <Video size={32} />
        </div>

        {/* Title */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FEF6EC] text-[#E8813A] text-xs font-semibold uppercase tracking-wider mb-3">
          <Sparkles size={14} /> Feature Coming Soon
        </div>
        
        <h2 className="text-2xl font-semibold text-[#22201B] mb-3" style={{ fontFamily: 'Fraunces, serif' }}>
          Multi-Camera & RTSP Integration
        </h2>

        <p className="text-sm text-[#6B6558] max-w-md leading-relaxed mb-8">
          We are building support for connecting external IP cameras, RTSP security feeds, and multi-room pet monitoring nodes directly into PawCare&apos;s local AI detection engine.
        </p>

        {/* Features preview list */}
        <div className="w-full bg-[#FBF6ED] rounded-xl border border-[#E8DFC8] p-5 text-left space-y-3 mb-6">
          <p className="text-xs font-semibold text-[#22201B] uppercase tracking-wider mb-2">Planned Capabilities</p>
          
          <div className="flex items-center gap-3 text-xs text-[#6B6558]">
            <ShieldCheck size={16} className="text-[#2F7D51] shrink-0" />
            <span>Connect wireless RTSP / ONVIF IP cameras across multiple rooms</span>
          </div>
          
          <div className="flex items-center gap-3 text-xs text-[#6B6558]">
            <ShieldCheck size={16} className="text-[#2F7D51] shrink-0" />
            <span>Simultaneous multi-feed AI behavior analysis & cat identity tracking</span>
          </div>

          <div className="flex items-center gap-3 text-xs text-[#6B6558]">
            <ShieldCheck size={16} className="text-[#2F7D51] shrink-0" />
            <span>Smart bandwith auto-scaling & edge node stream relays</span>
          </div>
        </div>

        <span className="text-xs text-[#9B8B72] italic">
          Currently active: Single Built-in Webcam AI on the Live Monitor page.
        </span>
      </div>
    </div>
  )
}
