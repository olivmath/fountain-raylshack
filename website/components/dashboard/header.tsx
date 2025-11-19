'use client'

import { Search, Bell, BookOpen, User, LogOut } from 'lucide-react'
import Link from 'next/link'

interface HeaderProps {
  section: string
}

export function Header({ section }: HeaderProps) {
  return (
    <div className="bg-[#0F131C] border-b border-white/5 px-8 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3 text-white/80">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-white/40">section</p>
          <span className="text-sm font-medium text-white">{section}</span>
        </div>
      </div>

      <div className="flex-1 mx-8 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Search"
            className="w-full pl-9 pr-3 py-2 bg-[#111726] border border-white/5 rounded-lg text-sm text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-white/30"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40">⌘ K</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="text-white/70 hover:text-white transition-colors">
          <Bell className="w-5 h-5" />
        </button>
        <button className="text-white/70 hover:text-white transition-colors">
          <BookOpen className="w-5 h-5" />
        </button>
        <button className="text-white/70 hover:text-white transition-colors">
          <User className="w-5 h-5" />
        </button>
        <Link
          href="/"
          className="text-white/70 hover:text-white transition-colors flex items-center gap-1"
          aria-label="Sign out"
        >
          <LogOut className="w-5 h-5" />
        </Link>
      </div>
    </div>
  )
}

