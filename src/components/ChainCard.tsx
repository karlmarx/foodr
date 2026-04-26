"use client";

import { useState } from "react";
import type { Chain } from "@/data/chains";
import RatingRow from "./RatingRow";
import Confetti from "./Confetti";
import RatingDistribution from "./RatingDistribution";
import { useFoodr } from "@/lib/FoodrProvider";

interface ChainCardProps {
  chain: Chain;
}

const RATING_LABELS = [
  "Tap to rate",
  "Not great, even for {name}",
  "Below average {name}",
  "Solid {name}",
  "Great {name}",
  "Peak {name} experience",
];

export default function ChainCard({ chain }: ChainCardProps) {
  const { stats, yourRatings, submit, ready } = useFoodr();
  const myRating = yourRatings[chain.id] ?? 0;
  const chainStats = stats[chain.id];

  const [hover, setHover] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [justRated, setJustRated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);

  const ratingForLabel = hover || myRating;
  const label = RATING_LABELS[ratingForLabel].replace("{name}", chain.name);

  const handleRate = async (newRating: number) => {
    if (submitting || !ready) return;
    setError(null);
    setSubmitting(true);
    try {
      await submit({ chainId: chain.id, rating: newRating });
      setJustRated(true);
      setTimeout(() => setJustRated(false), 1100);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const count = chainStats?.count ?? 0;
  const average = chainStats?.average ?? 0;
  const distribution = chainStats?.distribution ?? [0, 0, 0, 0, 0];

  return (
    <div
      className="relative rounded-2xl p-5 overflow-hidden transition-all duration-300 hover:-translate-y-0.5 fade-in-up"
      style={{
        background: `
          radial-gradient(140% 100% at 0% 0%, ${chain.color}22 0%, transparent 55%),
          linear-gradient(180deg, var(--card) 0%, var(--card-strong) 100%)
        `,
        border: `1px solid ${chain.color}33`,
        boxShadow: `0 12px 40px -20px ${chain.color}55`,
      }}
    >
      {justRated && <Confetti color={chain.color} />}

      {/* Honeypot — bots filling all visible fields will trip this */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="honeypot"
        aria-hidden="true"
      />

      <div className="flex items-start justify-between mb-4">
        <div className="min-w-0">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span
              className="text-3xl"
              style={{ filter: `drop-shadow(0 0 12px ${chain.color}55)` }}
            >
              {chain.emoji}
            </span>
            <span className="truncate">{chain.name}</span>
          </h2>
          <p
            className="text-xs mt-0.5 italic truncate"
            style={{ color: chain.color }}
          >
            “{chain.tagline}”
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className="chip stat-number"
            style={{
              background: `${chain.color}20`,
              borderColor: `${chain.color}55`,
              color: chain.color,
            }}
            title="Average rating on this chain's own scale"
          >
            {count > 0 ? average.toFixed(2) : "—"}{" "}
            <span className="opacity-70">{chain.emoji}</span>
          </span>
          <span className="chip stat-number">{count} ratings</span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 mt-2">
        <RatingRow
          emoji={chain.emoji}
          color={chain.color}
          rating={hover || myRating}
          onRate={handleRate}
          size="lg"
          disabled={submitting}
          chainName={chain.name}
        />
        <p
          className="text-sm text-[var(--muted)] h-5"
          onMouseLeave={() => setHover(0)}
        >
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <span className="spinner" /> Solving challenge…
            </span>
          ) : myRating > 0 && !hover ? (
            <>
              You rated{" "}
              <span className="font-semibold" style={{ color: chain.color }}>
                {myRating}/5
              </span>{" "}
              <span className="opacity-70">on the {chain.name} scale</span>
            </>
          ) : (
            label
          )}
        </p>
        {error && (
          <p className="text-xs text-[var(--bad)] max-w-full truncate">{error}</p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowStats((s) => !s)}
          className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          aria-expanded={showStats}
        >
          {showStats ? "Hide" : "Show"} distribution {showStats ? "▲" : "▼"}
        </button>
        {chainStats?.last_rated_at && (
          <span className="text-[10px] text-[var(--muted)] stat-number">
            last: {new Date(chainStats.last_rated_at).toLocaleTimeString()}
          </span>
        )}
      </div>

      {showStats && (
        <div className="mt-3 pt-3 border-t border-[var(--border)] fade-in-up">
          <RatingDistribution
            distribution={distribution}
            color={chain.color}
            emoji={chain.emoji}
          />
        </div>
      )}
    </div>
  );
}
