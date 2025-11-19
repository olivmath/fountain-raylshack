'use client'

import { ChevronDown, ChevronLeft, Menu, LayoutDashboard, Coins, Code2, Settings, Building2 } from 'lucide-react'
import { Player } from '@lordicon/react'
import { useState, useEffect } from 'react'

// Import your Lordicon JSON here when available
// Example: import companyIconData from '@/assets/lordicon-company.json'
// For now, we'll use a fallback icon
const useLordicon = () => {
  const [iconData, setIconData] = useState<any>(null)
  
  useEffect(() => {
    // If you have a Lordicon JSON file, import it here
    // Example:
    // import('@/assets/lordicon-company.json').then(setIconData)
    // For now, we'll keep it null to use the fallback
  }, [])
  
  return iconData
}

const navItems = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Stablecoins', icon: Coins },
  { label: 'Developer', icon: Code2 },
  { label: 'Settings', icon: Settings },
]

interface SidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const lordiconData = useLordicon()
  const [isMenuOpen, setIsMenuOpen] = useState(true)

  return (
    <div className="w-64 bg-[#0F131C] border-r border-white/5 flex flex-col p-6">
      {/* Logo / Collapse */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <span className="text-xl font-semibold tracking-tight">Fountain</span>
        </div>
        <button
          className="text-white/50 hover:text-white transition-colors"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label={isMenuOpen ? 'Recolher menu' : 'Expandir menu'}
        >
          <ChevronLeft className={`w-5 h-5 transition-transform ${isMenuOpen ? '' : 'rotate-180'}`} />
        </button>
      </div>

      {/* Organization */}
      <div className="pb-6 border-b border-white/5">
        <button
          className="flex w-full items-center gap-3 rounded-lg px-2 py-1 hover:bg-white/5 transition-colors"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          aria-expanded={isMenuOpen}
        >
          <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden bg-[#1C2231]">
            {lordiconData && typeof lordiconData === 'object' ? (
              <Player icon={lordiconData} size={40} />
            ) : (
              <Building2 className="w-5 h-5 text-white" />
            )}
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-white">Guest.</p>
            <p className="text-xs text-white/50">Sonica Inc.</p>
          </div>
        </button>
      </div>

      {/* Navigation */}
      <nav className={`mt-6 space-y-1 transition-all ${isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {navItems.map((item) => (
          <NavItem
            key={item.label}
            icon={item.icon}
            label={item.label}
            active={item.label === activeTab}
            onSelect={() => onTabChange(item.label)}
          />
        ))}
      </nav>
    </div>
  )
}

function NavItem({
  icon: Icon,
  label,
  active = false,
  onSelect,
}: {
  icon: any
  label: string
  active?: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors ${
        active ? 'bg-white/10 text-white font-medium' : 'text-white/70 hover:bg-white/5 hover:text-white'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </button>
  )
}

