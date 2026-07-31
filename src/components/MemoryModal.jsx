import { useEffect, useRef, useState } from 'react'
import { formatDate } from '../utils/formatDate'

export function MemoryModal({ memory, onClose, onDownload, onDelete, onApprove, onHide }) {
  const [busy, setBusy] = useState(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const busyRef = useRef(busy)
  busyRef.current = busy

  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'Escape' && !busyRef.current) onCloseRef.current()
    }
    window.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [])

  async function runAction(action, callback) {
    if (busy) return
    setBusy(action)
    try {
      await callback()
    } finally {
      setBusy(null)
    }
  }

  function handleClose() {
    if (!busy) onClose()
  }

  const approvalText = memory.approved ? 'Ocultar de galeria en vivo' : 'Mostrar en galeria en vivo'
  const approvalBusy = busy === 'approve' || busy === 'hide'

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={handleClose}>
      <article className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className={`modal-media ${memory.accent || ''}`}>
          {memory.previewUrl && memory.type === 'image' && <img src={memory.previewUrl} alt={memory.fileName} loading="lazy" onError={(e) => { e.target.style.display = 'none' }} />}
          {memory.previewUrl && memory.type === 'video' && <video src={memory.previewUrl} controls />}
          {!memory.previewUrl && <span>{memory.type === 'video' ? 'Video destacado' : 'Foto destacada'}</span>}
        </div>
        <aside className="modal-details">
          <button className="close-button" onClick={handleClose} disabled={busy !== null}>Cerrar</button>
          <span className="eyebrow">Detalle del recuerdo</span>
          <h3>{memory.fileName}</h3>
          <dl>
            <div><dt>Subido por</dt><dd>{memory.guestName}</dd></div>
            <div><dt>Mesa</dt><dd>{memory.table}</dd></div>
            <div><dt>Relacion</dt><dd>{memory.relation}</dd></div>
            <div><dt>Momento</dt><dd>{memory.moment}</dd></div>
            <div><dt>Estado</dt><dd>{memory.approved ? 'En vivo' : 'Oculto'}</dd></div>
            <div><dt>Fecha y hora</dt><dd>{formatDate(memory.uploadedAt)}</dd></div>
          </dl>
          <button
            className="secondary-button full"
            onClick={() => runAction(memory.approved ? 'hide' : 'approve', memory.approved ? onHide : onApprove)}
            disabled={busy !== null}
          >
            {approvalBusy ? 'Procesando...' : approvalText}
          </button>
          <button className="primary-button full" onClick={onDownload} disabled={!memory.previewUrl || busy !== null}>
            Descargar archivo
          </button>
          {confirmingDelete ? (
            <div className="confirm-actions">
              <span>¿Eliminar este recuerdo? Esta accion no se puede deshacer.</span>
              <button
                className="danger-button full"
                onClick={() => runAction('delete', onDelete)}
                disabled={busy !== null}
              >
                {busy === 'delete' ? 'Eliminando...' : 'Si, eliminar'}
              </button>
              <button className="secondary-button full" onClick={() => setConfirmingDelete(false)} disabled={busy !== null}>
                Cancelar
              </button>
            </div>
          ) : (
            <button className="danger-button full" onClick={() => setConfirmingDelete(true)} disabled={busy !== null}>
              Eliminar
            </button>
          )}
        </aside>
      </article>
    </div>
  )
}
