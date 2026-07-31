import { useRef } from 'react'
import { isSupabaseConfigured } from '../supabaseClient'
import { weddingDate, moments, maxFilesPerUpload, memoryDomain } from '../constants'

export function UploadView({ form, setForm, selectedFiles, handleFiles, removeSelectedFile, submitUpload, uploadState, uploadError, fileNotice, progress }) {
  const fileInputRef = useRef(null)

  return (
    <section className="upload-layout">
      <div className="section-heading">
        <span className="eyebrow">Kevin & Karen · {weddingDate}</span>
        <h2>Comparte tus recuerdos</h2>
        <p>Gracias por ser parte de esta historia. Sube varias fotos o videos sin crear cuenta.</p>
      </div>

      <form className="upload-card" onSubmit={submitUpload}>
        <div className={`integration-status ${isSupabaseConfigured ? 'connected' : 'demo'}`}>
          {isSupabaseConfigured
            ? 'Supabase conectado: las fotos se guardaran en la nube.'
            : 'Modo demo: configura Supabase para guardar fotos reales.'}
        </div>

        <div className="limit-note">
          Maximo {maxFilesPerUpload} archivos por subida. Fotos hasta 10 MB y videos hasta 100 MB.
          Las fotos grandes se comprimen automaticamente antes de subir.
        </div>

        <div className="upload-intro-grid">
          <article>
            <span>URL para QR</span>
            <strong>{memoryDomain}</strong>
          </article>
          <article>
            <span>Uso privado</span>
            <strong>Solo para recuerdos de los novios</strong>
          </article>
        </div>

        <div className="form-grid">
          <label>
            Tu nombre
            <input
              required
              value={form.guestName}
              onChange={(event) => setForm((prev) => ({ ...prev, guestName: event.target.value }))}
              placeholder="Ej. Laura Gomez"
            />
          </label>
          <label>
            Mesa o grupo
            <input
              value={form.table}
              onChange={(event) => setForm((prev) => ({ ...prev, table: event.target.value }))}
              placeholder="Ej. Mesa 4"
            />
          </label>
        </div>

        <label>
          Relacion con los novios
          <input
            value={form.relation}
            onChange={(event) => setForm((prev) => ({ ...prev, relation: event.target.value }))}
            placeholder="Ej. Familia de Karen, amigos de Kevin"
          />
        </label>

        <label>
          Momento del evento
          <select
            value={form.moment}
            onChange={(event) => setForm((prev) => ({ ...prev, moment: event.target.value }))}
          >
            {moments.map((moment) => (
              <option key={moment}>{moment}</option>
            ))}
          </select>
        </label>

        <label
          className="dropzone"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault()
            handleFiles(event.dataTransfer.files)
          }}
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
          <strong>Seleccionar fotos o videos</strong>
          <small>Tambien puedes arrastrarlos aqui</small>
        </label>

        {selectedFiles.length > 0 && (
          <div className="preview-grid">
            {selectedFiles.map((item) => (
              <article key={item.id} className="preview-item">
                {item.type === 'video' ? (
                  <video src={item.previewUrl} muted />
                ) : (
                  <img src={item.previewUrl} alt={item.file.name} loading="lazy" onError={(e) => { e.target.style.display = 'none' }} />
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

        {uploadState === 'success' && (
          <div className="success-message">
            Gracias por ser parte de nuestra historia. Tu recuerdo ya fue guardado y publicado
            en la galeria en vivo para Kevin & Karen.
          </div>
        )}

        {uploadState === 'error' && uploadError && (
          <div className="error-message">
            {uploadError}
          </div>
        )}

        <label className="consent-row">
          <input
            type="checkbox"
            checked={form.consent}
            onChange={(event) => setForm((prev) => ({ ...prev, consent: event.target.checked }))}
          />
          <span>
            Autorizo que Kevin & Karen guarden estas fotos o videos como recuerdo privado de su boda.
          </span>
        </label>

        <p className="privacy-note">
          Este espacio es privado para los novios. Evita subir contenido sensible o que no quieras compartir con ellos.
        </p>

        <button className="primary-button full" disabled={!form.guestName.trim() || selectedFiles.length === 0 || !form.consent || uploadState === 'uploading'}>
          {uploadState === 'uploading' ? `Subiendo recuerdos... ${progress}%` : 'Subir recuerdos'}
        </button>
      </form>
    </section>
  )
}
