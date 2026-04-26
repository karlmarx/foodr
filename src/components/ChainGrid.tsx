"use client";

import { useMemo, useState } from "react";
import { chains } from "@/data/chains";
import ChainCard from "./ChainCard";
import { useFoodr } from "@/lib/FoodrProvider";

type SortKey = "default" | "top" | "popular" | "unrated" | "alpha";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "default", label: "All" },
  { key: "top", label: "Top rated" },
  { key: "popular", label: "Most rated" },
  { key: "unrated", label: "Not yet rated by you" },
  { key: "alpha", label: "A → Z" },
];

export default function ChainGrid() {
  const { stats, yourRatings } = useFoodr();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("default");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = chains.filter(
      (c) =>
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.tagline.toLowerCase().includes(q),
    );
    switch (sort) {
      case "top":
        list = [...list].sort(
          (a, b) =>
            (stats[b.id]?.average ?? 0) - (stats[a.id]?.average ?? 0) ||
            (stats[b.id]?.count ?? 0) - (stats[a.id]?.count ?? 0),
        );
        break;
      case "popular":
        list = [...list].sort(
          (a, b) => (stats[b.id]?.count ?? 0) - (stats[a.id]?.count ?? 0),
        );
        break;
      case "unrated":
        list = list.filter((c) => !(c.id in yourRatings));
        break;
      case "alpha":
        list = [...list].sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
    return list;
  }, [query, sort, stats, yourRatings]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <input
          type="search"
          placeholder="Search chains…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 min-w-[180px] bg-[var(--card)] border border-[var(--border)] rounded-full px-4 py-2 text-sm outline-none focus:border-[var(--accent)] transition-colors"
        />
        <div className="flex flex-wrap gap-1.5">
          {SORTS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSort(s.key)}
              className="px-3 py-1.5 rounded-full text-xs border transition-colors"
              style={{
                background:
                  sort === s.key ? "var(--accent)" : "var(--card)",
                color: sort === s.key ? "#0a0a0a" : "var(--muted)",
                borderColor:
                  sort === s.key ? "var(--accent)" : "var(--border)",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="glass p-10 text-center text-[var(--muted)]">
          No chains match your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((chain) => (
            <ChainCard key={chain.id} chain={chain} />
          ))}
        </div>
      )}
    </div>
  );
}
