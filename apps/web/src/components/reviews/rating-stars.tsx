export function RatingStars({ value, onChange, readOnly = false }: { value: number; onChange?: (value: number) => void; readOnly?: boolean }) {
  return <div className="flex gap-1" aria-label={`${value} out of 5 stars`}>{[1, 2, 3, 4, 5].map((star) => <button key={star} type="button" disabled={readOnly} onClick={() => onChange?.(star)} aria-label={`${star} star`} className={`text-xl ${star <= value ? 'text-amber-400' : 'text-muted-foreground'} ${readOnly ? 'cursor-default' : ''}`}>★</button>)}</div>;
}
