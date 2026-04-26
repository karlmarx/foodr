"use client";

interface RatingDistributionProps {
  distribution: [number, number, number, number, number];
  color: string;
  emoji: string;
}

export default function RatingDistribution({
  distribution,
  color,
  emoji,
}: RatingDistributionProps) {
  const max = Math.max(1, ...distribution);
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {[5, 4, 3, 2, 1].map((star) => {
        const count = distribution[star - 1];
        const pct = (count / max) * 100;
        return (
          <div key={star} className="flex items-center gap-2 text-xs">
            <span
              className="w-10 flex items-center gap-1 stat-number"
              style={{ color: "var(--muted)" }}
            >
              {star}
              <span className="opacity-60">{emoji}</span>
            </span>
            <div className="flex-1 h-1.5 rounded-full bg-[var(--card-strong)] overflow-hidden">
              <div
                className="distribution-bar"
                style={
                  {
                    width: `${pct}%`,
                    "--bar-color": color,
                  } as React.CSSProperties
                }
              />
            </div>
            <span
              className="w-8 text-right stat-number"
              style={{ color: "var(--muted)" }}
            >
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}
