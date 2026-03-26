"use client";

interface ChainRatingIconProps {
  emoji: string;
  filled: boolean;
  color: string;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const sizeClasses = {
  sm: "w-6 h-6 text-base",
  md: "w-10 h-10 text-2xl",
  lg: "w-14 h-14 text-4xl",
};

export default function ChainRatingIcon({
  emoji,
  filled,
  color,
  size = "md",
  onClick,
  onMouseEnter,
  onMouseLeave,
}: ChainRatingIconProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`${sizeClasses[size]} flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer select-none`}
      style={{
        opacity: filled ? 1 : 0.2,
        transform: filled ? "scale(1.1)" : "scale(0.9)",
        filter: filled ? `drop-shadow(0 0 8px ${color}40)` : "grayscale(1)",
      }}
    >
      {emoji}
    </button>
  );
}
