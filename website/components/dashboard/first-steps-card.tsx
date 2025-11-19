'use client'

import { X, ChevronDown } from 'lucide-react'

export function FirstStepsCard() {
  return (
    <div className="bg-[#111726] border border-white/5 rounded-xl p-6 mb-8">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-xs uppercase tracking-[0.35em] text-white/40">activation</p>
          <h3 className="text-lg font-semibold text-white mb-4">Onboarding checklist</h3>
          {/* Progress Bar */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1 flex-1">
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full ${i < 3 ? 'bg-[#4C5FD5]' : 'bg-white/15'}`}
                />
              ))}
            </div>
            <span className="text-sm text-white/70 ml-4">3 of 7 completed</span>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <X className="w-4 h-4 text-white/40 cursor-pointer hover:text-white/80 transition-colors" />
          <ChevronDown className="w-4 h-4 text-white/40 cursor-pointer hover:text-white/80 transition-colors" />
        </div>
      </div>
    </div>
  )
}

