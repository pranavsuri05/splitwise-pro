import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminPasswordSheet } from '../components/AdminPasswordSheet.js'
import { EmptyState } from '../components/EmptyState.js'
import { ErrorState } from '../components/ErrorState.js'
import { LoadingState } from '../components/LoadingState.js'
import { useCurrentGroup } from '../context/GroupContext.js'
import {
  useCreateSettlementMutation,
  useSettlementHistoryQuery,
  useSettlementSuggestionsQuery,
} from '../hooks/useSettlements.js'
import type { SettlementSuggestion } from '../api/types.js'
import { formatDateTime, formatRupees } from '../utils/format.js'

export function SettlementScreen() {
  const navigate = useNavigate()
  const { currentGroupId } = useCurrentGroup()
  const groupId = currentGroupId as string

  const suggestionsQuery = useSettlementSuggestionsQuery(groupId)
  const historyQuery = useSettlementHistoryQuery(groupId)
  const createSettlementMutation = useCreateSettlementMutation(groupId)

  const [pendingSuggestion, setPendingSuggestion] = useState<SettlementSuggestion | null>(null)

  return (
    <div className="screen">
      <header className="screen__header">
        <button
          type="button"
          className="icon-button"
          onClick={() => navigate(-1)}
          aria-label="Close"
        >
          <span aria-hidden="true">✕</span>
        </button>
        <span className="screen__title">Settlement</span>
        <span className="icon-button" aria-hidden="true" />
      </header>

      <div className="screen__body">
        <div className="section" style={{ marginTop: 'var(--space-2)' }}>
          <h2 className="section__title">Outstanding</h2>
          {suggestionsQuery.isLoading ? (
            <LoadingState label="Loading suggestions…" />
          ) : suggestionsQuery.isError ? (
            <ErrorState error={suggestionsQuery.error} onRetry={() => suggestionsQuery.refetch()} />
          ) : (suggestionsQuery.data ?? []).length === 0 ? (
            <EmptyState title="All settled 🎉" body="No outstanding payments." />
          ) : (
            <div className="card">
              {suggestionsQuery.data!.map((suggestion, index) => (
                <div
                  className="list-row list-row--static"
                  key={`${suggestion.from_person.id}-${suggestion.to_person.id}-${index}`}
                >
                  <div className="list-row__main">
                    <div className="list-row__title">
                      {suggestion.from_person.name} → {suggestion.to_person.name}
                    </div>
                    <div className="list-row__subtitle">{formatRupees(suggestion.amount)}</div>
                  </div>
                  <button
                    type="button"
                    className="button button--primary"
                    style={{ width: 'auto' }}
                    onClick={() => setPendingSuggestion(suggestion)}
                  >
                    ✓ Log Settlement
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="section">
          <h2 className="section__title">Settlement History</h2>
          {historyQuery.isLoading ? (
            <LoadingState />
          ) : historyQuery.isError ? (
            <ErrorState error={historyQuery.error} onRetry={() => historyQuery.refetch()} />
          ) : (historyQuery.data ?? []).length === 0 ? (
            <EmptyState title="No settlements logged yet." />
          ) : (
            <div className="card">
              {historyQuery.data!.map((settlement) => (
                <div className="list-row list-row--static" key={settlement.id}>
                  <div className="list-row__main">
                    <div className="list-row__title">
                      {settlement.from_person.name} → {settlement.to_person.name}
                    </div>
                    <div className="list-row__subtitle">
                      {formatDateTime(settlement.created_at)}
                    </div>
                  </div>
                  <span className="amount">{formatRupees(settlement.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {pendingSuggestion && (
        <AdminPasswordSheet
          title="Log Settlement"
          description={
            <p style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>
              {pendingSuggestion.from_person.name} → {pendingSuggestion.to_person.name}
              <br />
              <strong style={{ fontSize: 20 }}>{formatRupees(pendingSuggestion.amount)}</strong>
            </p>
          }
          confirmLabel="Log Settlement"
          onConfirm={async (password) => {
            await createSettlementMutation.mutateAsync({
              input: {
                from_person: pendingSuggestion.from_person.id,
                to_person: pendingSuggestion.to_person.id,
                amount: pendingSuggestion.amount,
              },
              adminPassword: password,
            })
            setPendingSuggestion(null)
          }}
          onCancel={() => setPendingSuggestion(null)}
        />
      )}
    </div>
  )
}
