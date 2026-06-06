// Simple read-only star rating display.
export default function Stars({ value = 0, count }) {
  const full = Math.round(value);
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <span className="text-amber-500" aria-hidden>
        {"★".repeat(full)}
        <span className="text-gray-300">{"★".repeat(5 - full)}</span>
      </span>
      {value ? <span className="font-medium text-gray-700">{value.toFixed(1)}</span> : <span className="text-gray-400">No reviews</span>}
      {count != null && value ? <span className="text-gray-400">({count})</span> : null}
    </span>
  );
}
