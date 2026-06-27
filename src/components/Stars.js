// Simple read-only star rating display.
export default function Stars({ value = 0, count }) {
  const hasReviews = value > 0;
  const full = Math.round(value);
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span aria-hidden className={hasReviews ? "text-amber-500" : "text-gray-300"}>
        {"★".repeat(full)}
        <span className="text-gray-300">{"☆".repeat(5 - full)}</span>
      </span>
      {hasReviews ? (
        <>
          <span className="font-medium text-gray-700">{value.toFixed(1)}</span>
          {count != null && <span className="text-gray-400">({count})</span>}
        </>
      ) : (
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">New · no reviews yet</span>
      )}
    </span>
  );
}
