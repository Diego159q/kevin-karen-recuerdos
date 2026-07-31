import { useRef, useState } from 'react'
import { weddingDate, maxFilesPerUpload } from '../constants'
import { Icon } from '../components/Icons'

export function UploadView({ selectedFiles, handleFiles, removeSelectedFile, submitUpload, uploadState, uploadError, fileNotice, progress, resetUpload }) {
  const fileInputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  function onDragEnter(event) {
    event.preventDefault()
    setDragging(true)
  }

  function onDragOver(event) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }

  function onDragLeave(event) {
    if (event.currentTarget.contains(event.relatedTarget)) return
    event.preventDefault()
    setDragging(false)
  }

  function onDrop(event) {
    event.preventDefault()
    setDragging(false)
    handleFiles(event.dataTransfer.files)
  }

  return (
    <section className="upload-layout">
      <div className="section-heading">
        <span className="eyebrow">Kevin & Karen · {weddingDate}</span>
        <h2>Comparte tus recuerdos</h2>
        <p>Gracias por ser parte de esta historia. Elige tus fotos o videos y subelos.</p>
      </div>

      <form className="upload-card" onSubmit={submitUpload}>
        {uploadState === 'success' ? (
          <div className="success-message" role="status">
            <span className="success-check">
              <Icon name="check" size={40} strokeWidth={2.5} />
            </span>
            <h3>Recuerdos publicados</h3>
            <p>
              Gracias por ser parte de nuestra historia. Tu recuerdo ya fue guardado y publicado
              en la galeria en vivo para Kevin & Karen.
            </p>
            <div className="success-actions">
              <button type="button" className="primary-button" onClick={resetUpload}>
                <Icon name="upload" size={16} />
                Subir mas
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="limit-note">
              Hasta {maxFilesPerUpload} archivos por subida. Fotos hasta 10 MB y videos hasta 100 MB.
              Las fotos grandes se comprimen automaticamente antes de subir.
            </div>

            <label
              className={`dropzone${dragging ? ' dragging' : ''}`}
              onDragEnter={onDragEnter}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={(event) => {
                  handleFiles(event.target.files)
                  event.target.value = ''
                }}
              />
              <span className="drop-icon">+</span>
              <strong>{dragging ? 'Suelta tus archivos aqui' : 'Seleccionar fotos o videos'}</strong>
              <small>Tambien puedes arrastrarlos aqui</small>
            </label>

            {selectedFiles.length > 0 && (
              <div className="preview-grid">
                {selectedFiles.map((item) => (
                  <article key={item.id} className="preview-item">
                    {item.type === 'video' ? (
                      <>
                        <video src={item.previewUrl} muted />
                        <span className="play-badge">
                          <Icon name="play" size={20} />
                        </span>
                      </>
                    ) : (
                      <img
                        src={item.previewUrl}
                        alt={item.file.name}
                        loading="lazy"
                        onLoad={(e) => { e.currentTarget.classList.add('loaded') }}
                        onError={(e) => { e.target.style.display = 'none' }}
                      />
                    )}
                    <button type="button" onClick={() => removeSelectedFile(item.id)}>
                      Quitar
                    </button>
                  </article>
                ))}
              </div>
            )}

            {fileNotice && <div className="notice-message">{fileNotice}</div>}

            {uploadState === 'uploading' && (
              <div className="progress-block" aria-live="polite">
                <span>Subiendo recuerdos...</span>
                <div className="progress-track"><div style={{ width: `${progress}%` }} /></div>
              </div>
            )}

            {uploadState === 'error' && uploadError && (
              <div className="error-message">
                {uploadError}
              </div>
            )}

            <p className="privacy-note">
              Este espacio es privado para los novios. Evita subir contenido sensible o que no quieras compartir con ellos.
            </p>

            <button className="primary-button full" disabled={selectedFiles.length === 0 || uploadState === 'uploading'}>
              {uploadState === 'uploading' ? `Subiendo recuerdos... ${progress}%` : 'Subir recuerdos'}
            </button>
          </>
        )}
      </form>
    </section>
  )
}
