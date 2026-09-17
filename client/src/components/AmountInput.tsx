interface AmountInputProps {
  value: number | ''
  onChange: (value: number | '') => void
}

// UI_UX_Specification.md §18/§55: the amount is the single most visually
// prominent field, numeric keyboard, whole rupees only.
export function AmountInput({ value, onChange }: AmountInputProps) {
  return (
    <div className="form-group">
      <label className="form-label" htmlFor="expense-amount">
        Amount
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <span aria-hidden="true" style={{ fontSize: 28, fontWeight: 600 }}>
          ₹
        </span>
        <input
          id="expense-amount"
          type="number"
          inputMode="numeric"
          pattern="[0-9]*"
          step={1}
          min={1}
          max={99999}
          className="form-input form-input--amount"
          autoFocus
          value={value}
          onChange={(event) => {
            const raw = event.target.value
            onChange(raw === '' ? '' : Math.trunc(Number(raw)))
          }}
        />
      </div>
    </div>
  )
}
