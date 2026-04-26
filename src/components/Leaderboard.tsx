"use client";

import { useMemo } from "react";
import { chains } from "@/data/chains";
import { useFoodr } from "@/lib/FoodrProvider";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function Leaderboard() {
  const { stats, ready } = useFoodr();

  const ranked = useMemo(() => {
    const merged = chains.map((c) => {
      const s = stats[c.id];
      return {
        chain: c,
        count: s?.count ?? 0,
        average: s?.average ?? 0,
      };
    });
    return merged
      .filter((m) => m.count > 0)
      .sort((a, b) => b.average - a.average || b.count - a.count)
      .slice(0, 5);
  }, [stats]);

  return (
    <aside className="glass p-5 sticky top-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)] mb-3">
        Live leaderboard
      </h3>
      {!ready ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 rounded-lg shimmer" />
          ))}
        </div>
      ) : ranked.length === 0 ? (
        <p className="text-xs text-[var(--muted)]">
          No ratings yet. Be the first.
        </p>
      ) : (
        <ol className="flex flex-col gap-1.5">
          {ranked.map((r, i) => (
            <li
              key={r.chain.id}
              className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-[var(--card-hover)] transition-colors"
            >
              <span className="w-6 text-center text-base">
                {MEDALS[i] ?? `#${i + 1}`}
              </span>
              <span
                className="text-2xl"
                style={{ filter: `drop-shadow(0 0 6px ${r.chain.color}66)` }}
              >
                {r.chain.emoji}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">
                  {r.chain.name}
                </div>
                <div className="text-[10px] text-[var(--muted)] stat-number">
                  {r.count} {r.count === 1 ? "rating" : "ratings"}
                </div>
              </div>
              <div
                className="text-sm font-bold stat-number"
                style={{ color: r.chain.color }}
              >
                {r.average.toFixed(2)}
              </div>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}
