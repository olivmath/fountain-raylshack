"use client";

import { useEffect, useRef, useState } from "react";
import {
  BlocksIcon,
  CpuIcon,
  LayersIcon,
  ShieldCheckIcon,
  WalletIcon,
  WorkflowIcon,
} from "lucide-react";

import { BentoCard, BentoGrid } from "@/components/ui/bento-grid";
import { cn } from "@/lib/utils";

const solutions = [
  {
    Icon: CpuIcon,
    name: "Unified issuance API",
    description: "Mint, burn, and reconcile BRL stablecoins with production-ready SDKs and webhooks.",
    href: "#api",
    cta: "Read docs",
    className: "lg:row-start-1 lg:row-end-4 lg:col-start-2",
    background: (
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.25),transparent_60%)] opacity-70" />
    ),
  },
  {
    Icon: ShieldCheckIcon,
    name: "Automated compliance",
    description: "KYC/KYB, sanctions lists, and programmable wallet limits without harming user experience.",
    href: "#compliance",
    cta: "Review workflow",
    className: "lg:row-start-1 lg:row-end-2 lg:col-start-1",
    background: (
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_60%)] opacity-70" />
    ),
  },
  {
    Icon: WorkflowIcon,
    name: "Liquidity orchestration",
    description: "PIX, TED, and crypto rails combined to settle in minutes with custom rules.",
    href: "#liquidity",
    cta: "Explore orchestration",
    className: "lg:row-start-2 lg:row-end-3 lg:col-start-1",
    background: (
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.18),transparent_60%)] opacity-70" />
    ),
  },
  {
    Icon: BlocksIcon,
    name: "Tokenization integrations",
    description: "Collect asset data, define vesting schedules, and sync status in real time.",
    href: "#tokenization",
    cta: "View integrations",
    className: "lg:row-start-3 lg:row-end-4 lg:col-start-1",
    background: (
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.2),transparent_65%)] opacity-70" />
    ),
  },
  {
    Icon: WalletIcon,
    name: "On-chain treasury",
    description: "Dashboards with proof of reserves, accounting reports, and continuous audit on the Rayls Network.",
    href: "#treasury",
    cta: "Open dashboard",
    className: "lg:row-start-1 lg:row-end-2 lg:col-start-3",
    background: (
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_60%)] opacity-70" />
    ),
  },
  {
    Icon: LayersIcon,
    name: "Global scalability",
    description: "Multi-entity, multi-currency, and granular governance to launch cross-border products.",
    href: "#scale",
    cta: "Plan expansion",
    className: "lg:row-start-2 lg:row-end-4 lg:col-start-3",
    background: (
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.22),transparent_65%)] opacity-70" />
    ),
  },
];

export function SolutionSection() {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 },
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section id="solution" ref={ref} className="relative overflow-hidden bg-black px-6 py-20 text-white md:py-32">
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage: [
            "radial-gradient(60% 60% at 30% 40%, rgba(252,91,75,0.18) 0%, transparent 65%)",
            "radial-gradient(70% 70% at 70% 60%, rgba(88,112,255,0.22) 0%, transparent 70%)",
          ].join(","),
        }}
      />

      <div className="mx-auto max-w-6xl">
        <div
          className={cn(
            "mb-16 text-center transition-all duration-1000",
            isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0",
          )}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1 text-sm text-white/80">
           Fountain Platform
          </div>
          <h2 className="mt-6 text-balance text-4xl font-bold md:text-5xl">
            Complete solution for issuing BRL stablecoins
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/70">
            APIs, compliance, liquidity, and continuous audit living inside infrastructure designed for Rayls-native
            real-world asset tokenizers.
          </p>
        </div>

        <div
          className={cn(
            "transition-all duration-1000",
            isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0",
          )}
          style={{ transitionDelay: isVisible ? "150ms" : "0ms" }}
        >
          <BentoGrid className="lg:grid-rows-3">
            {solutions.map((solution) => (
              <BentoCard key={solution.name} {...solution} />
            ))}
          </BentoGrid>
        </div>
      </div>
    </section>
  );
}
