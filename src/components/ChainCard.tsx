"use client";

import { useState } from "react";
import type { Chain } from "@/data/chains";
import RatingRow from "./RatingRow";

interface ChainCardProps {
  chain: Chain;
}

export default function ChainCard({ chain }: ChainCardProps) {
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [reviewCount] = useState(() => Math.floor(Math.random() * 500) + 50);

  const handleRate = (newRating: number) => {
    setRating(newRating);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 2000);
  };

  const getRatingLabel = (r: number): string => {
    if (r === 0) return "Tap to rate";
    if (r === 1) return "Not great, even for " + chain.name;
    if (r === 2) return "Below average " + chain.name;
    if (r === 3) return "Solid " + chain.name;
    if (r === 4) return "Great " + chain.name;
    return "Peak " + chain.name + " experience";
  };

  return (
    <div
      className="rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, var(--card) 0%, ${chain.color}15 100%)`,
        border: `1px solid ${chain.color}30`,
      }}
    >
      {submitted && (
        <div
          className="absolute inset-0 flex items-center justify-center z-10 rounded-2xl animate-pulse"
          style={{ background: `${chain.color}20` }}
        >
          <span className="text-2xl font-bold" style={{ color: chain.color }}>
            Rated! {chain.emoji}
          </span>
        </div>
      )}

      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="text-3xl">{chain.emoji}</span>
            {chain.name}
          </h2>
          <p className="text-sm mt-1" style={{ color: chain.color }}>
            {chain.tagline}
          </p>
        </div>
        <div className="text-right">
          <div
            className="text-xs px-2 py-1 rounded-full"
            style={{ background: `${chain.color}20`, color: chain.color }}
          >
            {reviewCount} ratings
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 mt-4">
        <RatingRow
          emoji={chain.emoji}
          color={chain.color}
          rating={rating}
          onRate={handleRate}
          size="lg"
        />
        <p className="text-sm text-[var(--muted)] h-5">
          {rating > 0 ? (
            <>
              <span className="font-semibold" style={{ color: chain.color }}>
                {rating}/5
              </span>{" "}
              on the {chain.name} scale
            </>
          ) : (
            getRatingLabel(rating)
          )}
        </p>
        <p className="text-xs text-[var(--muted)] italic">
          {getRatingLabel(rating)}
        </p>
      </div>
    </div>
  );
}
