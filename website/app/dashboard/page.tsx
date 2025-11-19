'use client'

import { useState } from 'react'

import { Sidebar } from '@/components/dashboard/sidebar'
import { Header } from '@/components/dashboard/header'
import { OverviewSection } from '@/components/dashboard/overview-section'
import { FirstStepsCard } from '@/components/dashboard/first-steps-card'
import { PlatformActivity } from '@/components/dashboard/platform-activity'
import { StablecoinKpis } from '@/components/dashboard/stablecoin-kpis'
import { StablecoinsPanel } from '@/components/dashboard/stablecoins-panel'
import { OperationsTable } from '@/components/dashboard/operations-table'
import { StatusBreakdown } from '@/components/dashboard/status-breakdown'
import { ClientAnalytics } from '@/components/dashboard/client-analytics'
import { useDashboardData } from '@/hooks/use-dashboard-data'
import { EmptyState } from '@/components/ui/interactive-empty-state'
import BoxLoader from '@/components/ui/box-loader'
import { RefreshCw, TrendingUp, Database, AlertCircle, PlusCircle, Coins, Receipt } from 'lucide-react'

const tabDescriptions: Record<string, { title: string; description: string }> = {
  Overview: {
    title: 'All systems nominal',
    description: 'Monitor issuance, liquidity and developer activity in real time.',
  },
  Stablecoins: {
    title: 'Stablecoin programs',
    description: 'Configure assets, float limits and funding operations for BRL programs.',
  },
  Developer: {
    title: 'Developer workspace',
    description: 'Manage API keys, webhooks, SDKs and sandbox credentials.',
  },
  Settings: {
    title: 'Organization settings',
    description: 'Control access, security policies and production environments.',
  },
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<string>('Overview')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { title, description } = tabDescriptions[activeTab]
  const { data, loading, error } = useDashboardData()

  return (
    <div className="flex h-screen bg-[#0B0E14] text-white overflow-hidden">
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        <Header 
          section={activeTab}
          onMenuClick={() => setIsMobileMenuOpen(true)}
        />
        <main className="flex-1 overflow-auto bg-[#0F131C]">
          <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            {loading && (
              <div className="flex flex-col items-center justify-center py-24 space-y-6">
                <BoxLoader />
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-semibold text-white">Loading data...</h3>
                  <p className="text-sm text-white/60">Fetching real-time dashboard information</p>
                </div>
              </div>
            )}

            {error && (
              <EmptyState
                theme="dark"
                size="lg"
                variant="error"
                title="Error loading dashboard"
                description={`Unable to connect to backend. ${error}`}
                icons={[
                  <AlertCircle key="1" className="h-6 w-6" />,
                  <Database key="2" className="h-6 w-6" />,
                  <RefreshCw key="3" className="h-6 w-6" />
                ]}
                action={{
                  label: "Retry",
                  icon: <RefreshCw className="h-4 w-4" />,
                  onClick: () => window.location.reload()
                }}
              />
            )}

            {!loading && !error && data && (
              <>
                {activeTab === 'Overview' && (
                  <>
                    {data.operations.length === 0 && data.stablecoins.length === 0 ? (
                      <EmptyState
                        theme="dark"
                        size="lg"
                        title="Welcome to Fountain Dashboard!"
                        description="You don't have any stablecoins or operations yet. Start by creating your first stablecoin to track deposits and withdrawals in real-time."
                        icons={[
                          <Coins key="1" className="h-6 w-6" />,
                          <PlusCircle key="2" className="h-6 w-6" />,
                          <Receipt key="3" className="h-6 w-6" />
                        ]}
                        action={{
                          label: "View documentation",
                          icon: <TrendingUp className="h-4 w-4" />,
                          onClick: () => window.open('https://github.com/olivmath/rayls', '_blank')
                        }}
                      />
                    ) : (
                      <>
                        <OverviewSection data={data} />
                        <PlatformActivity data={data} />
                        <StatusBreakdown data={data} />
                        <OperationsTable data={data} />
                      </>
                    )}
                  </>
                )}

                {activeTab === 'Stablecoins' && (
                  <>
                    {data.stablecoins.length === 0 ? (
                      <EmptyState
                        theme="dark"
                        size="lg"
                        title="No stablecoins created"
                        description="Create your first stablecoin to start processing deposits and withdrawals in BRL. Use the API to register and deploy ERC20 tokens."
                        icons={[
                          <Coins key="1" className="h-6 w-6" />,
                          <Database key="2" className="h-6 w-6" />,
                          <PlusCircle key="3" className="h-6 w-6" />
                        ]}
                        action={{
                          label: "View API docs",
                          icon: <TrendingUp className="h-4 w-4" />,
                          onClick: () => window.open('/back-end/CLAUDE.md', '_blank')
                        }}
                      />
                    ) : (
                      <>
                        <StablecoinKpis data={data} />
                        <ClientAnalytics data={data} />
                        <StablecoinsPanel data={data} />
                      </>
                    )}
                  </>
                )}

                {activeTab !== 'Overview' && activeTab !== 'Stablecoins' && (
                  <SectionPlaceholder title={title} description={description} />
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

function SectionPlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-[#111726] p-12">
      <p className="text-xs uppercase tracking-[0.4em] text-white/30">coming soon</p>
      <h2 className="mt-3 text-3xl font-semibold text-white">{title}</h2>
      <p className="mt-3 text-white/60 max-w-2xl">{description}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/70 hover:text-white hover:border-white/40 transition">
          Request early access
        </button>
        <button className="text-sm text-white/50 hover:text-white">View documentation →</button>
      </div>
    </div>
  )
}
