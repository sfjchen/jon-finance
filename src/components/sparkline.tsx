export function Sparkline({ points, width = 160, height = 40, className }: { points: number[]; width?: number; height?: number; className?: string }) {
  if (points.length < 2) return <svg width={width} height={height} className={className} aria-hidden />;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = width / (points.length - 1);
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(height - 2 - ((p - min) / range) * (height - 4)).toFixed(1)}`)
    .join(" ");
  const up = points[points.length - 1]! >= points[0]!;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden>
      <path d={d} fill="none" stroke={up ? "#2f7d57" : "#b54a3a"} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
