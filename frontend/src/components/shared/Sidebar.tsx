// src/components/shared/Sidebar.tsx — CHANGED
// What changed:
//   + useSidebarStore (Zustand) for open/close state
//   + hamburger button exported for TopBar to use
//   + backdrop overlay closes drawer on tap
//   + sidebar uses translate-x-0 / -translate-x-full for mobile drawer

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { create } from 'zustand';
import { useAuthStore } from '@/store/authStore';

// ── tiny Zustand store for sidebar open state ──────────────────────────────────
interface SidebarStore { isOpen: boolean; open: () => void; close: () => void; toggle: () => void; }
export const useSidebarStore = create<SidebarStore>((set) => ({
  isOpen: false,
  open:   () => set({ isOpen: true }),
  close:  () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
}));

const NAV = [
  { label: 'Dashboard',      href: '/dashboard'  },
  { label: 'Live Monitor',   href: '/monitoring' },
  { label: 'My Cats',        href: '/cats'       },
  { label: 'Camera Streams', href: '/streams'    },
  { label: 'Alerts',         href: '/alerts'     },
  { label: 'Analytics',      href: '/analytics'  },
  { label: 'Automation',     href: '/automation' },
];

export function Sidebar() {
  const pathname  = usePathname();
  const router    = useRouter();
  const { user, logout }    = useAuthStore();
  const { isOpen, close }   = useSidebarStore();

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo + mobile close button */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-gray-100 shrink-0">
        <span className="font-bold text-lg text-blue-600">PawCare</span>
        {/* X button — only visible on mobile */}
        <button onClick={close} className="lg:hidden text-gray-400 hover:text-gray-700">
          <X size={20} />
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 p-3 flex flex-col gap-0.5 overflow-y-auto">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={close}   // close drawer on mobile after navigating
            className={`text-sm px-3 py-2 rounded-lg transition-colors ${
              pathname === item.href
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="p-4 border-t border-gray-100 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {user?.full_name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.full_name}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => { logout(); router.push('/login'); close(); }}
          className="text-sm text-gray-400 hover:text-red-600 transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Desktop sidebar — always visible on lg+ ── */}
      <aside className="hidden lg:flex w-60 shrink-0 bg-white border-r border-gray-100 flex-col">
        {sidebarContent}
      </aside>

      {/* ── Mobile drawer ── */}
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={close}
        />
      )}

      {/* Drawer panel */}
      <aside className={`
        fixed top-0 left-0 h-full w-72 bg-white z-50
        transform transition-transform duration-300 ease-in-out
        lg:hidden
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {sidebarContent}
      </aside>
    </>
  );
}