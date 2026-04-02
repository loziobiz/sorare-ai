function getBarColor(score: number): string {
  if (score < 30) {
    return "bg-red-400";
  }
  if (score < 40) {
    return "bg-orange-400";
  }
  if (score < 60) {
    return "bg-lime-400";
  }
  if (score < 80) {
    return "bg-emerald-400";
  }
  return "bg-cyan-400";
}

interface ScoreHistogramProps {
  scores: number[];
}

export function ScoreHistogram({ scores }: ScoreHistogramProps) {
  if (!scores || scores.length === 0) {
    return null;
  }

  const maxScore = 100;

  return (
    <div
      className="flex items-end gap-[2px]"
      style={{ height: "14px", width: "34px" }}
    >
      {scores.map((score, i) => {
        const val = score ?? 0;
        const height = Math.max(2, (val / maxScore) * 14);
        return (
          <div
            className={`w-[5px] rounded-[1px] ${getBarColor(val)}`}
            key={`${i}-${val}`}
            style={{ height: `${height}px` }}
            title={val.toFixed(0)}
          />
        );
      })}
    </div>
  );
}
