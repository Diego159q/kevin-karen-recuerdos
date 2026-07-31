import { formatDate } from '../utils/formatDate'
import { Icon } from './Icons'

export function MemoryCard({ memory, onOpen, onDownload, onApprove, onHide }) {
  return (
    <article className={`memory-card ${memory.approved ? 'approved' : 'pending'}`}>
      <button className={`memory-media ${memory.accent || ''}`} onClick={onOpen}>
        {memory.previewUrl && memory.type === 'image' && <img src={memory.previewUrl} alt={memory.fileName} loading="lazy" onLoad={(e) => { e.currentTarget.classList.add('loaded') }} onError={(e) => { e.target.style.display = 'none' }} />}
        {memory.previewUrl && memory.type === 'video' && <video src={memory.previewUrl} muted />}
        {!memory.previewUrl && <span>{memory.type === 'video' ? 'Video' : 'Foto'}</span>}
        {memory.previewUrl && memory.type === 'video' && (
          <span className="play-badge">
            <Icon name="play" size={22} />
          </span>
        )}
      </button>
      <div className="memory-info">
        <span className={`status-pill ${memory.approved ? 'approved' : 'pending'}`}>
          {memory.approved ? 'En vivo' : 'Oculto'}
        </span>
        {memory.guestName && memory.guestName !== 'Anonimo' && <strong>{memory.guestName}</strong>}
        {(memory.table && memory.table !== 'Sin mesa') || (memory.relation && memory.relation !== 'Invitado')
          ? <span>{memory.table} · {memory.relation}</span>
          : null}
        {memory.moment && memory.moment !== 'Otro' && <span>{memory.moment}</span>}
        <small>{formatDate(memory.uploadedAt)}</small>
      </div>
      <div className="card-actions">
        <button onClick={onOpen}>Ver</button>
        <button onClick={onDownload} disabled={!memory.previewUrl}>Descargar</button>
        {memory.approved ? (
          <button onClick={onHide}>Ocultar</button>
        ) : (
          <button onClick={onApprove}>Mostrar</button>
        )}
      </div>
    </article>
  )
}
