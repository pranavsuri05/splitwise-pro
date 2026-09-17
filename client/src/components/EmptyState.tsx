interface EmptyStateProps {
  title: string
  body?: string
  action?: React.ReactNode
}

export function EmptyState({ title, body, action }: EmptyStateProps) {
  return (
    <div className="state-block" role="status">
      <p className="state-block__title">{title}</p>
      {body && <p className="state-block__body">{body}</p>}
      {action}
    </div>
  )
}
