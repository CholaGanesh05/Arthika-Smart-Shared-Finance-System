export function EmptyState({ title, description, action }) {
  return (
    <div className="empty-state">
      <p className="empty-state__eyebrow">Nothing here yet</p>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  )
}
