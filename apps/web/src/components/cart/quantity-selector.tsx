'use client';

export function QuantitySelector({ value, onChange, disabled = false }: { value: number; onChange: (value: number) => void; disabled?: boolean }) {
  return (
    <div className="inline-flex items-center border" aria-label="Item quantity">
      <button type="button" disabled={disabled || value <= 1} className="grid size-11 place-items-center disabled:cursor-not-allowed disabled:opacity-40" onClick={() => onChange(Math.max(1, value - 1))} aria-label="Decrease quantity">−</button>
      <span className="min-w-9 text-center text-sm tabular-nums" aria-live="polite">{value}</span>
      <button type="button" disabled={disabled || value >= 99} className="grid size-11 place-items-center disabled:cursor-not-allowed disabled:opacity-40" onClick={() => onChange(Math.min(99, value + 1))} aria-label="Increase quantity">+</button>
    </div>
  );
}
