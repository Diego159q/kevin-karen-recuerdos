import { useEffect, useRef, useState } from 'react'
import { formatDate } from '../utils/formatDate'
import { Icon } from './Icons'

export function MemoryModal({ memory, onClose, onDownload, onDelete, onApprove, onHide, onPrev, onNext, hasPrev, hasNext, position, total }) {
  const [busy, setBusy] = useState(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [lastMemoryId, setLastMemoryId] = useState(memory.id)
  const cardRef = useRef(null)
  const onCloseRef = useRef(onClose)
  const onPrevRef = useRef(onPrev)
  const onNextRef = useRef(onNext)
  const busyRef = useRef(busy)

  if (memory.id !== lastMemoryId) {
    setLastMemoryId(memory.id)
    setConfirmingDelete(false)
    setBusy(null)
  }

  useEffect(() => {
    onCloseRef.current = onClose
    onPrevRef.current = onPrev
    onNextRef.current = onNext
  })

  useEffect(() => {
    busyRef.current = busy
  })

  useEffect(() => {
    const previouslyFocused = document.activeElement
    cardRef.current?.focus()

    function handleKey(event) {
      if (event.key === 'Escape') {
        if (!busyRef.current) onCloseRef.current()
        return
      }
      if (busyRef.current) return
      if (event.key === 'ArrowLeft') onPrevRef.current?.()
      if (event.key === 'ArrowRight') onNextRef.current?.()
      if (event.key === 'Tab' && cardRef.current) {
        const focusables = Array.from(
          cardRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
        ).filter((element) => !element.disabled && element.offsetParent !== null)
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }

    window.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
      if (previouslyFocused?.focus) previouslyFocused.focus()
    }
  }, [])

  useEffect(() => {
    cardRef.current?.focus()
  }, [memory.id])

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
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={`Recuerdo ${position} de ${total}`} onClick={handleClose}>
      <article className="modal-card" tabIndex={-1} ref={cardRef} onClick={(e) => e.stopPropagation()}>
        <div className={`modal-media ${memory.accent || ''}`}>
          {memory.previewUrl && memory.type === 'image' && <img src={memory.previewUrl} alt={memory.fileName} loading="lazy" onLoad={(e) => { e.currentTarget.classList.add('loaded') }} onError={(e) => { e.target.style.display = 'none' }} />}
          {memory.previewUrl && memory.type === 'video' && <video src={memory.previewUrl} controls />}
          {!memory.previewUrl && <span>{memory.type === 'video' ? 'Video destacado' : 'Foto destacada'}</span>}
          <button
            className="modal-nav prev"
            type="button"
            aria-label="Recuerdo anterior"
            onClick={() => { setConfirmingDelete(false); onPrev() }}
            disabled={!hasPrev}
          >
            <Icon name="chevronLeft" size={22} />
          </button>
          <button
            className="modal-nav next"
            type="button"
            aria-label="Recuerdo siguiente"
            onClick={() => { setConfirmingDelete(false); onNext() }}
            disabled={!hasNext}
          >
            <Icon name="chevronRight" size={22} />
          </button>
        </div>
        <aside className="modal-details">
          <button className="close-button" onClick={handleClose} disabled={busy !== null}>Cerrar</button>
          <span className="eyebrow">Detalle del recuerdo · {position} de {total}</span>
          <h3>{memory.fileName}</h3>
          <dl>
            {memory.guestName && memory.guestName !== 'Anonimo' && <div><dt>Subido por</dt><dd>{memory.guestName}</dd></div>}
            {memory.table && memory.table !== 'Sin mesa' && <div><dt>Mesa</dt><dd>{memory.table}</dd></div>}
            {memory.relation && memory.relation !== 'Invitado' && <div><dt>Relacion</dt><dd>{memory.relation}</dd></div>}
            {memory.moment && memory.moment !== 'Otro' && <div><dt>Momento</dt><dd>{memory.moment}</dd></div>}
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
