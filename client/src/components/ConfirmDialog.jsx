import { AlertTriangle, Trash2, X } from 'lucide-react'

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onCancel,
  onConfirm,
  busy = false,
}) {
  if (!open) {
    return null
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <div
        aria-describedby="confirm-dialog-description"
        aria-modal="true"
        className="dialog-panel fin-card fin-card-static"
        role="dialog"
      >
        <div className="fin-card-inner space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="empty-state-icon h-12 w-12 rounded-2xl">
                <AlertTriangle color="var(--danger)" size={22} strokeWidth={1.5} />
              </div>
              <div className="space-y-1">
                <p className="section-eyebrow text-red-300">Confirmation required</p>
                <h2 className="text-2xl font-display">{title}</h2>
              </div>
            </div>

            <button
              aria-label="Close dialog"
              className="btn btn-ghost btn-icon"
              onClick={onCancel}
              type="button"
            >
              <X size={18} strokeWidth={1.5} />
            </button>
          </div>

          <p className="fin-copy" id="confirm-dialog-description">
            {description}
          </p>
          <p className="text-sm text-red-300">This cannot be undone.</p>

          <div className="dialog-actions">
            <button className="btn btn-ghost" onClick={onCancel} type="button">
              {cancelLabel}
            </button>
            <button className="btn btn-danger" disabled={busy} onClick={onConfirm} type="button">
              <Trash2 size={18} strokeWidth={1.5} />
              {busy ? 'Working...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
