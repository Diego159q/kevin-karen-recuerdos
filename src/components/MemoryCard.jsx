import { formatDate } from '../utils/formatDate'

export function MemoryCard({ memory, onOpen, onDownload, onApprove, onHide }) {
  return (
    <article className={`memory-card ${memory.approved ? 'approved' : 'pending'}`}>
      <button className={`memory-media ${memory.accent || ''}`} onClick={onOpen}>
        {memory.previewUrl && memory.type === 'image' && <img src={memory.previewUrl} alt={memory.fileName} loading="lazy" onError={(e) => { e.target.style.display = 'none' }} />}
        {memory.previewUrl && memory.type === 'video' && <video src={memory.previewUrl} muted />}
        {!memory.previewUrl && <span>{memory.type === 'video' ? 'Video' : 'Foto'}</span>}
      </button>
      <div className="memory-info">
        <span className={`status-pill ${memory.approved ? 'approved' : 'pending'}`}>
          {memory.approved ? 'En vivo' : 'Oculto'}
        </span>
        <strong>{memory.guestName}</strong>
        <span>{memory.table} · {memory.relation}</span>
        <span>{memory.moment}</span>
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
