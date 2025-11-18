"use client";

import { RoadmapCard } from "@/components/ui/roadmap-card";
import type { RoadmapItem } from "@/components/ui/roadmap-card";

const roadmapItems: RoadmapItem[] = [
  {
    quarter: "V1 · NOW",
    title: "Production deployment",
    description: "Live tokenization partner, 4M BRL MRR, and full mint/burn flows.",
    status: "done",
  },
  {
    quarter: "V2 · 2 MONTHS",
    title: "Expanded liquidity",
    description: "Exchange integrations, resilient PIX rails, and RLUSD in production.",
    status: "in-progress",
  },
  {
    quarter: "V3 · 6 MONTHS",
    title: "Enterprise scale",
    description: "5+ tokenizers, 20M BRL MRR, and enterprise-grade controls.",
    status: "upcoming",
  },
  {
    quarter: "V4 · 12 MONTHS",
    title: "Global expansion",
    description: "Multi-entity governance, multi-currency support, and new jurisdictions.",
    status: "upcoming",
  },
];

export function RoadmapSection() {
  return (
    <section id="roadmap" className="relative overflow-hidden bg-black px-6 py-20 text-white md:py-32">
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage: [
            "radial-gradient(100% 80% at 50% 50%, rgba(88,112,255,0.18) 0%, rgba(252,91,75,0.12) 40%, transparent 70%)",
          ].join(","),
        }}
      />
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-12 text-center">
        <div className="max-w-2xl">
          <h2 className="text-balance text-4xl font-bold md:text-5xl">Our roadmap</h2>
          <p className="mt-4 text-lg text-white/70">From today's operations to global Rayls-native infrastructure.</p>
        </div>

        <RoadmapCard
          title="Fountain timeline"
          description="Key milestones for product, liquidity, and regulatory expansion."
          items={roadmapItems}
          className="border-white/10 bg-black/60"
        />
      </div>
    </section>
  );
}
