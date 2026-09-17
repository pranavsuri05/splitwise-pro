import { useState, type FormEvent } from 'react'
import type { Category, CreateExpenseInput, Person } from '../api/types.js'
import { formatRupees } from '../utils/format.js'
import { computeEqualSplit } from '../utils/equalSplit.js'
import { AmountInput } from './AmountInput.js'
import { CategorySelectorSheet } from './CategorySelectorSheet.js'
import { ParticipantSelector } from './ParticipantSelector.js'
import { PersonSelectorSheet } from './PersonSelectorSheet.js'
import { ShareInput } from './ShareInput.js'

const DESCRIPTION_MAX_LENGTH = 150

export interface ExpenseFormValues {
  description: string
  amount: number | ''
  paidBy: string
  participantIds: string[]
  shares: Record<string, number>
  categoryId: string | null
}

export function emptyExpenseFormValues(): ExpenseFormValues {
  return {
    description: '',
    amount: '',
    paidBy: '',
    participantIds: [],
    shares: {},
    categoryId: null,
  }
}

function splitKey(values: ExpenseFormValues): string {
  return `${values.amount}|${values.participantIds.join(',')}`
}

function computeShares(amount: number | '', participantIds: string[]): Record<string, number> {
  if (typeof amount !== 'number' || amount <= 0 || participantIds.length === 0) {
    return {}
  }
  const computed = computeEqualSplit(amount, participantIds)
  return Object.fromEntries(computed.map((s) => [s.personId, s.amount]))
}

interface ExpenseFormProps {
  people: Person[]
  categories: Category[]
  initialValues: ExpenseFormValues
  submitLabel: string
  isSubmitting: boolean
  submitError?: string | null
  onSubmit: (input: CreateExpenseInput) => void
}

export function ExpenseForm({
  people,
  categories,
  initialValues,
  submitLabel,
  isSubmitting,
  submitError,
  onSubmit,
}: ExpenseFormProps) {
  const [values, setValues] = useState(initialValues)
  const [activeSheet, setActiveSheet] = useState<'payer' | 'category' | null>(null)
  const [descriptionTouched, setDescriptionTouched] = useState(false)

  // Equal split is the default whenever the amount or the set of
  // participants changes; manual per-share edits are respected until the
  // next such change, matching UI_UX_Specification.md §22. Adjusted during
  // render (React's documented pattern for derived state) rather than via
  // useEffect+setState, which would cause an extra render pass.
  const [lastSplitKey, setLastSplitKey] = useState(() => splitKey(initialValues))
  const currentSplitKey = splitKey(values)
  if (currentSplitKey !== lastSplitKey) {
    setLastSplitKey(currentSplitKey)
    setValues((current) => ({
      ...current,
      shares: computeShares(current.amount, current.participantIds),
    }))
  }

  const payer = people.find((p) => p.id === values.paidBy)
  const category = categories.find((c) => c.id === values.categoryId)

  const total = values.participantIds.reduce((sum, id) => sum + (values.shares[id] ?? 0), 0)
  const hasZeroShare = values.participantIds.some((id) => (values.shares[id] ?? 0) < 1)
  const isAmountValid =
    typeof values.amount === 'number' && values.amount >= 1 && values.amount <= 99999
  const isTotalValid = isAmountValid && total === values.amount
  const canSubmit =
    isAmountValid &&
    values.description.trim().length > 0 &&
    values.paidBy !== '' &&
    values.participantIds.length > 0 &&
    !hasZeroShare &&
    isTotalValid &&
    !isSubmitting

  function toggleParticipant(personId: string) {
    setValues((current) => ({
      ...current,
      participantIds: current.participantIds.includes(personId)
        ? current.participantIds.filter((id) => id !== personId)
        : [...current.participantIds, personId],
    }))
  }

  function setShareAmount(personId: string, amount: number) {
    setValues((current) => ({ ...current, shares: { ...current.shares, [personId]: amount } }))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit || typeof values.amount !== 'number') return

    onSubmit({
      description: values.description.trim(),
      amount: values.amount,
      paid_by: values.paidBy,
      category_id: values.categoryId,
      shares: values.participantIds.map((id) => ({
        person_id: id,
        amount: values.shares[id] ?? 0,
      })),
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <AmountInput
        value={values.amount}
        onChange={(amount) => setValues((c) => ({ ...c, amount }))}
      />

      <div className="form-group">
        <label className="form-label" htmlFor="expense-description">
          Description
        </label>
        <input
          id="expense-description"
          className="form-input"
          maxLength={DESCRIPTION_MAX_LENGTH}
          value={values.description}
          onBlur={() => setDescriptionTouched(true)}
          onChange={(event) => setValues((c) => ({ ...c, description: event.target.value }))}
        />
        {descriptionTouched && values.description.trim().length === 0 && (
          <p className="form-error">Description is required.</p>
        )}
      </div>

      <div className="form-group">
        <span className="form-label">Paid by</span>
        <button type="button" className="list-row card" onClick={() => setActiveSheet('payer')}>
          <span className="list-row__title">{payer ? payer.name : 'Select person'}</span>
          <span className="list-row__chevron" aria-hidden="true">
            ›
          </span>
        </button>
      </div>

      <div className="form-group">
        <span className="form-label">Split between</span>
        <ParticipantSelector
          people={people}
          selectedIds={values.participantIds}
          onToggle={toggleParticipant}
        />
        {values.participantIds.length > 0 && (
          <>
            {values.participantIds.map((id) => {
              const person = people.find((p) => p.id === id)
              if (!person) return null
              return (
                <ShareInput
                  key={id}
                  personName={person.name}
                  amount={values.shares[id] ?? 0}
                  onChange={(amount) => setShareAmount(id, amount)}
                />
              )
            })}
            <div className={`share-total ${isTotalValid ? '' : 'share-total--invalid'}`}>
              <span>Total</span>
              <span>
                {formatRupees(total)} /{' '}
                {isAmountValid ? formatRupees(values.amount as number) : '—'}
              </span>
            </div>
            {!isTotalValid && isAmountValid && (
              <p className="form-error">
                Shares must equal {formatRupees(values.amount as number)}.
              </p>
            )}
            {hasZeroShare && (
              <p className="form-error">Every participant's share must be at least ₹1.</p>
            )}
          </>
        )}
      </div>

      <div className="form-group">
        <span className="form-label">Category (optional)</span>
        <button type="button" className="list-row card" onClick={() => setActiveSheet('category')}>
          <span className="list-row__title">{category ? category.name : 'None'}</span>
          <span className="list-row__chevron" aria-hidden="true">
            ›
          </span>
        </button>
      </div>

      {submitError && (
        <p className="form-error" role="alert">
          {submitError}
        </p>
      )}

      <button type="submit" className="button button--primary" disabled={!canSubmit}>
        {isSubmitting ? 'Saving…' : submitLabel}
      </button>

      {activeSheet === 'payer' && (
        <PersonSelectorSheet
          people={people.filter((p) => p.is_active)}
          selectedId={values.paidBy || undefined}
          onSelect={(id) => {
            setValues((c) => ({ ...c, paidBy: id }))
            setActiveSheet(null)
          }}
          onClose={() => setActiveSheet(null)}
        />
      )}

      {activeSheet === 'category' && (
        <CategorySelectorSheet
          categories={categories}
          selectedId={values.categoryId}
          onSelect={(id) => {
            setValues((c) => ({ ...c, categoryId: id }))
            setActiveSheet(null)
          }}
          onClose={() => setActiveSheet(null)}
        />
      )}
    </form>
  )
}
