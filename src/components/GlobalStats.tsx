"use client";

import { useMemo } from "react";
import { useFoodr } from "@/lib/FoodrProvider";

function format(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

export default function GlobalStats() {
  const { stats, yourRatings, ready } = useFoodr();

  const totals = useMemo(() => {
    let count = 0;
    let chainsRated = 0;
    let weightedSum = 0;
    for (const s of Object.values(stats)) {
      count += s.count;
      if (s.count > 0) chainsRated += 1;
      weightedSum += s.average * s.count;
    }
    const overall = count > 0 ? weightedSum / count : 0;
    return { count, chainsRated, overall };
  }, [stats]);

  const yourCount = Object.keys(yourRatings).length;

  const items = [
    { label: "Ratings", value: ready ? format(totals.count) : "—" },
    {
      label: "Chains rated",
      value: ready ? `${totals.chainsRated}/12` : "—",
    },
    {
      label: "Avg / chain",
      value: ready && totals.count > 0 ? totals.overall.toFixed(2) : "—",
    },
    { label: "You rated", value: ready ? `${yourCount}/12` : "—" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map((it) => (
        <div
          key={it.label}
          className="glass p-4 text-center transition-transform hover:-translate-y-0.5"
        >
          <div className="text-2xl font-black stat-number">{it.value}</div>
          <div className="text-[11px] uppercase tracking-wider text-[var(--muted)] mt-1">
            {it.label}
          </div>
        </div>
      ))}
    </div>
  );
}
