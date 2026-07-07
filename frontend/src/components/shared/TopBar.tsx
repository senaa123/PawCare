// src/components/shared/TopBar.tsx — CHANGED
// What changed: hamburger Menu icon added on left for mobile only

'use client';

import { Menu, Bell } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useSidebarStore } from './Sidebar';

export function TopBar() {
  const { user }   = useAuthStore();
  const { toggle } = useSidebarStore();

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center px-4 gap-3 shrink-0">

      {/* Hamburger — mobile only */}
      <button
        onClick={toggle}
        className="lg:hidden text-gray-500 hover:text-gray-800 p-1"
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side icons */}
      <button className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-50">
        <Bell size={20} />
      </button>

      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
        {user?.full_name?.[0]?.toUpperCase() ?? '?'}
      </div>
    </header>
  );
}