import { Icon } from './Icons'

const typeIcons = { success: 'check', error: 'x', info: 'info' }

export function ToastContainer({ toasts }) {
  if (toasts.length === 0) return null

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type}${toast.exiting ? ' toast-exit' : ''}`}>
          <span className="toast-icon">
            <Icon name={typeIcons[toast.type] || 'info'} size={15} strokeWidth={2.5} />
          </span>
          {toast.message}
        </div>
      ))}
    </div>
  )
}
