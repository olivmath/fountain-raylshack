"use client"

import { useEffect, useRef, useState } from "react"

export function ProblemSection() {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.2 },
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [])

  const problems = [
    {
      title: "Layers of bureaucracy",
      description: "KYC, AML, and regulatory compliance hurdles",
      icon: "📋",
    },
    {
      title: "Expensive and slow",
      description: "Costly processes with long delays",
      icon: "⏱️",
    },
    {
      title: "Operational inefficiencies",
      description: "Manual flows and redundant checks",
      icon: "⚙️",
    },
    {
      title: "Legal exposure",
      description: "Compliance blind spots and risks",
      icon: "⚖️",
    },
  ]

  return (
    <section ref={ref} className="relative overflow-hidden bg-black px-6 py-20 md:py-32">
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage: [
            "radial-gradient(80% 60% at 50% 30%, rgba(252,91,75,0.2) 0%, rgba(214,76,82,0.15) 40%, transparent 70%)",
            "radial-gradient(100% 80% at 20% 80%, rgba(88,112,255,0.1) 0%, transparent 60%)",
          ].join(","),
        }}
      />

      <div className="mx-auto max-w-7xl">
        <div
          className={`mb-16 text-center transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-balance">The real problem</h2>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">
            By 2030 the global real-world asset tokenization market is expected to surpass $16T, yet the infrastructure
            is far from ready.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {problems.map((problem, i) => (
            <div
              key={i}
              className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur transition-all duration-500 hover:border-red-500/50 hover:bg-white/10 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
              }`}
              style={{
                transitionDelay: isVisible ? `${i * 150}ms` : "0ms",
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/0 via-transparent to-purple-500/0 group-hover:from-red-500/10 group-hover:to-purple-500/10 transition-all" />
              <div className="relative z-10">
                <div className="text-4xl mb-4">{problem.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{problem.title}</h3>
                <p className="text-sm text-white/70">{problem.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-2xl border border-white/10 bg-white/5 p-8 md:p-12 backdrop-blur">
          <h3 className="text-xl font-semibold mb-6">The current flow</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 font-semibold">
                1
              </div>
              <div>
                <p className="font-semibold">Investor wants access to tokenized real estate</p>
                <p className="text-sm text-white/60">Afonso plans to deploy BRL 10,000 into tokenized properties.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 font-semibold">
                2
              </div>
              <div>
                <p className="font-semibold">Developer issues RWA tokens</p>
                <p className="text-sm text-white/60">America Park Building tokenizes a 3.6M BRL project in 10K lots.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 font-semibold">
                3
              </div>
              <div>
                <p className="font-semibold">Tokenizer builds the stack from scratch</p>
                <p className="text-sm text-white/60">Sonica must handle KYC, AML, stablecoins, and deposits manually.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 font-semibold">
                4
              </div>
              <div>
                <p className="font-semibold">Process repeats for every client</p>
                <p className="text-sm text-white/60">Inefficiency is replicated for every new developer or issuer.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
