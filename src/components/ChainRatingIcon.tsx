"use client";

interface ChainRatingIconProps {
  emoji: string;
  filled: boolean;
  color: string;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  ariaLabel?: string;
}

const sizeClasses = {
  sm: "w-6 h-6 text-base",
  md: "w-9 h-9 text-2xl",
  lg: "w-12 h-12 text-3xl",
};

export default function ChainRatingIcon({
  emoji,
  filled,
  color,
  size = "md",
  onClick,
  onMouseEnter,
  onMouseLeave,
  ariaLabel,
}: ChainRatingIconProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      aria-label={ariaLabel}
      className={`btn-rate ${sizeClasses[size]}`}
      style={{
        opacity: filled ? 1 : 0.22,
        transform: filled ? "scale(1.05)" : "scale(0.9)",
        filter: filled ? `drop-shadow(0 0 10px ${color}66)` : "grayscale(0.95)",
      }}
    >
      {emoji}
    </button>
  );
}
