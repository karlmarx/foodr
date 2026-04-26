"use client";

import { useState } from "react";
import ChainRatingIcon from "./ChainRatingIcon";

interface RatingRowProps {
  emoji: string;
  color: string;
  maxRating?: number;
  rating: number;
  onRate: (rating: number) => void;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  chainName?: string;
}

export default function RatingRow({
  emoji,
  color,
  maxRating = 5,
  rating,
  onRate,
  size = "md",
  disabled = false,
  chainName,
}: RatingRowProps) {
  const [hoverRating, setHoverRating] = useState(0);
  const displayRating = hoverRating || rating;

  return (
    <div
      className="flex gap-1 items-center"
      style={{ pointerEvents: disabled ? "none" : "auto", opacity: disabled ? 0.6 : 1 }}
    >
      {Array.from({ length: maxRating }, (_, i) => (
        <ChainRatingIcon
          key={i}
          emoji={emoji}
          filled={i < displayRating}
          color={color}
          size={size}
          onClick={() => !disabled && onRate(i + 1)}
          onMouseEnter={() => !disabled && setHoverRating(i + 1)}
          onMouseLeave={() => setHoverRating(0)}
          ariaLabel={`Rate ${chainName ?? ""} ${i + 1} out of ${maxRating}`}
        />
      ))}
    </div>
  );
}
