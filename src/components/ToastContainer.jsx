export function ToastContainer({ toasts }) {
  if (toasts.length === 0) return null

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type}${toast.exiting ? ' toast-exit' : ''}`}>
          {toast.message}
        </div>
      ))}
    </div>
  )
}
