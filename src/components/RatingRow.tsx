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
}

export default function RatingRow({
  emoji,
  color,
  maxRating = 5,
  rating,
  onRate,
  size = "md",
}: RatingRowProps) {
  const [hoverRating, setHoverRating] = useState(0);
  const displayRating = hoverRating || rating;

  return (
    <div className="flex gap-1 items-center">
      {Array.from({ length: maxRating }, (_, i) => (
        <ChainRatingIcon
          key={i}
          emoji={emoji}
          filled={i < displayRating}
          color={color}
          size={size}
          onClick={() => onRate(i + 1)}
          onMouseEnter={() => setHoverRating(i + 1)}
          onMouseLeave={() => setHoverRating(0)}
        />
      ))}
    </div>
  );
}
