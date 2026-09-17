interface ShareInputProps {
  personName: string
  amount: number
  onChange: (amount: number) => void
}

// UI_UX_Specification.md §22: equal split is the default; amounts remain
// directly editable for unequal splits.
export function ShareInput({ personName, amount, onChange }: ShareInputProps) {
  return (
    <div className="share-row">
      <span className="share-row__name">{personName}</span>
      <span aria-hidden="true">₹</span>
      <input
        type="number"
        inputMode="numeric"
        step={1}
        min={0}
        className="share-row__amount-input"
        aria-label={`${personName} share`}
        value={amount}
        onChange={(event) => onChange(Math.trunc(Number(event.target.value)) || 0)}
      />
    </div>
  )
}
