import { useEffect, useMemo, useState } from 'react'
import JSZip from 'jszip'
import { isSupabaseConfigured, memoriesBucket, supabase } from './supabaseClient'

const moments = ['Preparativos', 'Ceremonia', 'Cena', 'Fiesta', 'Baile', 'Otro']
const coupleName = 'Kevin & Karen'
const weddingDate = '08.08.2026'
const privateCode = 'kevinkaren2026'
const invitationUrl = 'https://kevin-karen-boda.netlify.app/'
const rawDeployedUrl = import.meta.env.VITE_DEPLOYED_URL || ''
const deployedUrl = rawDeployedUrl.replace(/^https?:\/\//, '')
const memoryDomain = deployedUrl || window.location.host
const publicMemoryUrl = deployedUrl ? `https://${deployedUrl}` : window.location.origin
const maxFilesPerUpload = 20
const maxPhotoSize = 10 * 1024 * 1024
const maxVideoSize = 100 * 1024 * 1024
const maxImageDimension = 2200

const seedMemories = [
  {
    id: 'seed-1',
    guestName: 'Laura Gomez',
    table: 'Mesa 4',
    relation: 'Familia de Karen',
    moment: 'Ceremonia',
    uploadedAt: '2026-08-08T10:42:00',
    fileName: 'entrada-ceremonia.jpg',
    type: 'image',
    accent: 'champagne',
    approved: true,
  },
  {
    id: 'seed-2',
    guestName: 'Mateo Ruiz',
    table: 'Familia',
    relation: 'Amigos de Kevin',
    moment: 'Fiesta',
    uploadedAt: '2026-08-08T18:18:00',
    fileName: 'brindis.mp4',
    type: 'video',
    accent: 'olive',
    approved: true,
  },
  {
    id: 'seed-3',
    guestName: 'Sofia Marin',
    table: 'Mesa 2',
    relation: 'Amigos de la pareja',
    moment: 'Baile',
    uploadedAt: '2026-08-08T20:07:00',
    fileName: 'primer-baile.jpg',
    type: 'image',
    accent: 'rose',
    approved: false,
  },
]

function mapSupabaseMemory(row) {
  return {
    id: row.id,
    guestName: row.guest_name,
    table: row.table_name || 'Sin mesa',
    relation: row.relation || 'Invitado',
    moment: row.moment,
    uploadedAt: row.created_at,
    fileName: row.file_name,
    filePath: row.file_path,
    type: row.file_type,
    previewUrl: row.public_url,
    accent: row.file_type === 'video' ? 'olive' : 'champagne',
    approved: row.approved,
  }
}

function getSafeFileName(fileName) {
  return fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase()
}

function formatFileSize(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const url = URL.createObjectURL(file)

    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }

    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer la imagen para comprimirla.'))
    }

    image.src = url
  })
}

async function compressImage(file) {
  const compressibleTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!compressibleTypes.includes(file.type) || file.size <= maxPhotoSize) return file

  const image = await loadImage(file)
  const scale = Math.min(1, maxImageDimension / Math.max(image.width, image.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(image.width * scale)
  canvas.height = Math.round(image.height * scale)

  const context = canvas.getContext('2d')
  context.drawImage(image, 0, 0, canvas.width, canvas.height)

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82))
  if (!blob || blob.size >= file.size) return file

  const compressedName = file.name.replace(/\.[^.]+$/, '') + '.jpg'
  return new File([blob], compressedName, { type: 'image/jpeg', lastModified: Date.now() })
}

function formatDate(value) {
  return new Intl.DateTimeFormat('es', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function App() {
  const [view, setView] = useState('home')
  const [isAdmin, setIsAdmin] = useState(false)
  const [loginCode, setLoginCode] = useState('')
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [memories, setMemories] = useState(() => (isSupabaseConfigured ? [] : seedMemories))
  const [isLoadingMemories, setIsLoadingMemories] = useState(isSupabaseConfigured)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [uploadState, setUploadState] = useState('idle')
  const [uploadError, setUploadError] = useState('')
  const [fileNotice, setFileNotice] = useState('')
  const [isDownloadingZip, setIsDownloadingZip] = useState(false)
  const [progress, setProgress] = useState(0)
  const [activeMemory, setActiveMemory] = useState(null)
  const [filters, setFilters] = useState({ query: '', moment: 'Todos', table: '' })
  const [toasts, setToasts] = useState([])

  function addToast(message, type = 'info') {
    const id = crypto.randomUUID()
    setToasts((current) => [...current, { id, message, type }])
    setTimeout(() => {
      setToasts((current) => current.map((t) => t.id === id ? { ...t, exiting: true } : t))
      setTimeout(() => {
        setToasts((current) => current.filter((t) => t.id !== id))
      }, 300)
    }, 3500)
  }
  const [form, setForm] = useState({
    guestName: '',
    table: '',
    relation: '',
    moment: 'Ceremonia',
    consent: false,
  })

  useEffect(() => {
    if (!isSupabaseConfigured) return

    supabase.auth.getSession().then(({ data }) => {
      setIsAdmin(Boolean(data.session))
      if (data.session?.user?.email) setLoginEmail(data.session.user.email)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdmin(Boolean(session))
      if (session?.user?.email) setLoginEmail(session.user.email)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) return

    async function loadMemories() {
      setIsLoadingMemories(true)
      const { data, error } = await supabase
        .from('wedding_memories')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        setUploadError(`No se pudo cargar la galeria: ${error.message}`)
        setIsLoadingMemories(false)
        return
      }

      setMemories(data.map(mapSupabaseMemory))
      setIsLoadingMemories(false)
    }

    loadMemories()
  }, [])

  const filteredMemories = useMemo(() => {
    return memories.filter((memory) => {
      const query = filters.query.trim().toLowerCase()
      const matchesQuery =
        !query ||
        memory.guestName.toLowerCase().includes(query) ||
        memory.relation.toLowerCase().includes(query) ||
        memory.fileName.toLowerCase().includes(query)
      const matchesMoment = filters.moment === 'Todos' || memory.moment === filters.moment
      const matchesTable =
        !filters.table.trim() ||
        memory.table.toLowerCase().includes(filters.table.trim().toLowerCase())

      return matchesQuery && matchesMoment && matchesTable
    })
  }, [filters, memories])

  const stats = useMemo(() => {
    const guests = new Set(memories.map((memory) => memory.guestName)).size
    return {
      photos: memories.filter((memory) => memory.type === 'image').length,
      videos: memories.filter((memory) => memory.type === 'video').length,
      guests,
      latest: memories
        .slice()
        .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))[0],
    }
  }, [memories])

  async function handleFiles(files) {
    setUploadError('')
    setFileNotice('')
    setUploadState('idle')

    const incomingFiles = Array.from(files)
    const availableSlots = maxFilesPerUpload - selectedFiles.length

    if (availableSlots <= 0) {
      setUploadError(`Solo puedes subir hasta ${maxFilesPerUpload} archivos por vez.`)
      return
    }

    const notices = []
    const accepted = []

    if (incomingFiles.length > availableSlots) {
      notices.push(`Se tomaron ${availableSlots} archivos porque el maximo por subida es ${maxFilesPerUpload}.`)
    }

    for (const file of incomingFiles.slice(0, availableSlots)) {
      const isImage = file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')

      if (!isImage && !isVideo) {
        notices.push(`${file.name} no es una foto o video permitido.`)
        continue
      }

      if (isVideo && file.size > maxVideoSize) {
        notices.push(`${file.name} pesa ${formatFileSize(file.size)}. El limite para videos es 100 MB.`)
        continue
      }

      let processedFile = file

      if (isImage) {
        try {
          processedFile = await compressImage(file)
          if (processedFile.size < file.size) {
            notices.push(`${file.name} fue comprimida de ${formatFileSize(file.size)} a ${formatFileSize(processedFile.size)}.`)
          }
        } catch (error) {
          notices.push(`${file.name} no se pudo comprimir. Se intentara subir el archivo original.`)
        }

        if (processedFile.size > maxPhotoSize) {
          notices.push(`${file.name} pesa ${formatFileSize(processedFile.size)}. El limite para fotos es 10 MB.`)
          continue
        }
      }

      accepted.push({
        id: `${processedFile.name}-${processedFile.lastModified}-${crypto.randomUUID()}`,
        file: processedFile,
        originalName: file.name,
        previewUrl: URL.createObjectURL(processedFile),
        type: isVideo ? 'video' : 'image',
      })
    }

    if (notices.length > 0) setFileNotice(notices.join(' '))
    setSelectedFiles((current) => [...current, ...accepted])
  }

  function removeSelectedFile(id) {
    setSelectedFiles((current) => {
      const removed = current.find((item) => item.id === id)
      if (removed) URL.revokeObjectURL(removed.previewUrl)
      return current.filter((item) => item.id !== id)
    })
  }

  async function submitUpload(event) {
    event.preventDefault()

    if (!form.guestName.trim() || selectedFiles.length === 0 || !form.consent) return

    setUploadState('uploading')
    setUploadError('')
    setProgress(8)

    if (isSupabaseConfigured) {
      try {
        const uploadedMemories = []

        for (const [index, item] of selectedFiles.entries()) {
          const filePath = [
            'uploads',
            new Date().toISOString().slice(0, 10),
            `${crypto.randomUUID()}-${getSafeFileName(item.file.name)}`,
          ].join('/')

          const { error: storageError } = await supabase.storage
            .from(memoriesBucket)
            .upload(filePath, item.file, {
              cacheControl: '3600',
              contentType: item.file.type,
              upsert: false,
            })

          if (storageError) throw storageError

          const { data: publicFile } = supabase.storage
            .from(memoriesBucket)
            .getPublicUrl(filePath)

          const fileType = item.file.type.startsWith('video/') ? 'video' : 'image'
          const { data: inserted, error: insertError } = await supabase
            .from('wedding_memories')
            .insert({
              guest_name: form.guestName.trim(),
              table_name: form.table.trim() || 'Sin mesa',
              relation: form.relation.trim() || 'Invitado',
              moment: form.moment,
              file_name: item.file.name,
              file_path: filePath,
              file_type: fileType,
              mime_type: item.file.type,
              size_bytes: item.file.size,
              public_url: publicFile.publicUrl,
              approved: false,
            })
            .select('*')
            .single()

          if (insertError) throw insertError

          uploadedMemories.push(mapSupabaseMemory(inserted))
          URL.revokeObjectURL(item.previewUrl)
          setProgress(Math.round(((index + 1) / selectedFiles.length) * 92))
        }

        setMemories((current) => [...uploadedMemories, ...current])
        setSelectedFiles([])
        setProgress(100)
        setUploadState('success')
        addToast('Tus recuerdos se subieron correctamente. Gracias.', 'success')
        setForm({ guestName: '', table: '', relation: '', moment: 'Ceremonia', consent: false })
      } catch (error) {
        setUploadState('error')
        setUploadError(`No pudimos subir tus recuerdos. ${error.message}`)
        addToast('Error al subir los archivos.', 'error')
      }

      return
    }

    const timer = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 100) {
          window.clearInterval(timer)
          const uploaded = selectedFiles.map((item) => ({
            id: item.id,
            guestName: form.guestName.trim(),
            table: form.table.trim() || 'Sin mesa',
            relation: form.relation.trim() || 'Invitado',
            moment: form.moment,
            uploadedAt: new Date().toISOString(),
            fileName: item.file.name,
            type: item.type,
            previewUrl: item.previewUrl,
            accent: item.type === 'video' ? 'olive' : 'champagne',
            approved: false,
          }))
          setMemories((current) => [...uploaded, ...current])
          setSelectedFiles([])
          setUploadState('success')
          addToast('Tus recuerdos se subieron correctamente. Gracias.', 'success')
          setForm({ guestName: '', table: '', relation: '', moment: 'Ceremonia', consent: false })
          return 100
        }

        return Math.min(current + 18, 100)
      })
    }, 220)
  }

  async function handleLogin(event) {
    event.preventDefault()

    if (isSupabaseConfigured) {
      setLoginError('')
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      })

      if (error) {
        setLoginError('No pudimos iniciar sesion. Revisa el correo y la contraseña del admin.')
        return
      }

      setLoginPassword('')
      setIsAdmin(true)
      return
    }

    if (loginCode.trim().toLowerCase() === privateCode) {
      setIsAdmin(true)
      setLoginError('')
      return
    }

    setLoginError(`Codigo incorrecto. Prueba con ${privateCode} para esta demo.`)
  }

  async function handleLogout() {
    if (isSupabaseConfigured) await supabase.auth.signOut()
    setIsAdmin(false)
    setLoginCode('')
    setLoginPassword('')
  }

  function downloadMemory(memory) {
    if (!memory.previewUrl) return
    const link = document.createElement('a')
    link.href = memory.previewUrl
    link.download = memory.fileName
    link.click()
  }

  async function deleteMemory(id) {
    const memory = memories.find((item) => item.id === id)

    if (isSupabaseConfigured && memory?.filePath) {
      const { error: storageError } = await supabase.storage
        .from(memoriesBucket)
        .remove([memory.filePath])

      if (storageError) {
        setUploadError(`No se pudo eliminar el archivo: ${storageError.message}`)
        return
      }

      const { error: deleteError } = await supabase
        .from('wedding_memories')
        .delete()
        .eq('id', id)

      if (deleteError) {
        setUploadError(`No se pudo eliminar el registro: ${deleteError.message}`)
        return
      }
    }

    setMemories((current) => current.filter((item) => item.id !== id))
    setActiveMemory(null)
  }

  async function updateMemoryApproval(id, approved) {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('wedding_memories')
        .update({ approved })
        .eq('id', id)

      if (error) {
        setUploadError(`No se pudo actualizar la moderacion: ${error.message}`)
        return
      }
    }

    setMemories((current) => current.map((memory) => (
      memory.id === id ? { ...memory, approved } : memory
    )))
    setActiveMemory((current) => (
      current?.id === id ? { ...current, approved } : current
    ))
  }

  async function downloadAllMemories(list = memories) {
    const downloadable = list.filter((memory) => memory.previewUrl)
    if (downloadable.length === 0) {
      setUploadError('No hay archivos disponibles para descargar.')
      return
    }

    setIsDownloadingZip(true)
    setUploadError('')

    try {
      const zip = new JSZip()

      for (const [index, memory] of downloadable.entries()) {
        const response = await fetch(memory.previewUrl)
        if (!response.ok) throw new Error(`No se pudo descargar ${memory.fileName}.`)
        const blob = await response.blob()
        const safeGuest = getSafeFileName(memory.guestName || 'invitado')
        zip.file(`${String(index + 1).padStart(3, '0')}-${safeGuest}-${getSafeFileName(memory.fileName)}`, blob)
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(zipBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'kevin-karen-recuerdos.zip'
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      setUploadError(`No pudimos crear el ZIP. ${error.message}`)
    } finally {
      setIsDownloadingZip(false)
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" type="button" onClick={() => setView('home')}>
          <span className="brand-mark">K&K</span>
          <span>
            <strong>{coupleName}</strong>
            <small>Recuerdos de boda</small>
          </span>
        </button>

        <nav className="nav-actions" aria-label="Navegacion principal">
          <button className={view === 'upload' ? 'active' : ''} onClick={() => setView('upload')}>
            Subir
          </button>
          <button className={view === 'admin' ? 'active' : ''} onClick={() => setView('admin')}>
            Panel
          </button>
          <button className={view === 'live' ? 'active' : ''} onClick={() => setView('live')}>
            En vivo
          </button>
          <button className={view === 'qr' ? 'active' : ''} onClick={() => setView('qr')}>
            QR
          </button>
          <a href={invitationUrl} target="_blank" rel="noreferrer">
            Invitacion
          </a>
        </nav>
      </header>

      {view === 'home' && (
        <div className="page-section" style={{ '--delay': '0ms' }}>
          <HomeView onStart={() => setView('upload')} />
        </div>
      )}

      {view === 'upload' && (
        <div className="page-section" style={{ '--delay': '50ms' }}>
        <UploadView
          form={form}
          setForm={setForm}
          selectedFiles={selectedFiles}
          handleFiles={handleFiles}
          removeSelectedFile={removeSelectedFile}
          submitUpload={submitUpload}
          uploadState={uploadState}
          uploadError={uploadError}
          fileNotice={fileNotice}
          progress={progress}
        />
      </div>
      )}

      {view === 'admin' && (
        <div className="page-section" style={{ '--delay': '50ms' }}>
        <AdminView
          isAdmin={isAdmin}
          loginCode={loginCode}
          setLoginCode={setLoginCode}
          loginEmail={loginEmail}
          setLoginEmail={setLoginEmail}
          loginPassword={loginPassword}
          setLoginPassword={setLoginPassword}
          loginError={loginError}
          handleLogin={handleLogin}
          handleLogout={handleLogout}
          stats={stats}
          isLoadingMemories={isLoadingMemories}
          uploadError={uploadError}
          isDownloadingZip={isDownloadingZip}
          filters={filters}
          setFilters={setFilters}
          filteredMemories={filteredMemories}
          setActiveMemory={setActiveMemory}
          downloadMemory={downloadMemory}
          downloadAllMemories={downloadAllMemories}
          updateMemoryApproval={updateMemoryApproval}
        />
      </div>
      )}

      {view === 'live' && (
        <div className="page-section" style={{ '--delay': '50ms' }}>
          <LiveView memories={memories} />
        </div>
      )}

      {view === 'qr' && (
        <div className="page-section" style={{ '--delay': '50ms' }}>
          <QrView />
        </div>
      )}

      {activeMemory && (
        <MemoryModal
          memory={activeMemory}
          onClose={() => setActiveMemory(null)}
          onDownload={() => downloadMemory(activeMemory)}
          onDelete={() => deleteMemory(activeMemory.id)}
          onApprove={() => updateMemoryApproval(activeMemory.id, true)}
          onHide={() => updateMemoryApproval(activeMemory.id, false)}
        />
      )}

      {toasts.length > 0 && (
        <div className="toast-container" aria-live="polite">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast ${toast.type}${toast.exiting ? ' toast-exit' : ''}`}>
              {toast.message}
            </div>
          ))}
        </div>
      )}
    </main>
  )
}

function HomeView({ onStart }) {
  return (
    <section className="hero section-grid">
      <div className="hero-copy reveal-card">
        <span className="eyebrow">{weddingDate} · Nos casamos</span>
        <h1>Gracias por guardar nuestra historia desde tus ojos.</h1>
        <p>
          Con la gracia de Dios y el amor que nos une, queremos conservar cada instante de este
          gran dia. Comparte aqui las fotos y videos que tomaste durante nuestra boda.
        </p>
        <blockquote>
          "La fe, la esperanza y el amor permanecen; pero el mayor de ellos es el amor."
          <cite>1 Corintios 13:13</cite>
        </blockquote>
        <div className="hero-actions">
          <button className="primary-button" onClick={onStart}>Subir recuerdos</button>
          <a className="secondary-button" href={invitationUrl} target="_blank" rel="noreferrer">
            Ver invitacion
          </a>
          <span className="secure-note">Invitacion privada por QR</span>
        </div>
        <div className="steps">
          <Step number="01" title="Escanea" text="Ingresa desde el QR preparado para los invitados." />
          <Step number="02" title="Acompanamos" text="Escribe tu nombre y el momento que quieres compartir." />
          <Step number="03" title="Bendice el recuerdo" text="Sube fotos o videos para nuestra galeria privada." />
        </div>
        <div className="invitation-note">
          <img src={`${invitationUrl}assets/fotos/logo.svg`} alt="Logo Kevin y Karen" />
          <div>
            <strong>Una extension de la invitacion oficial</strong>
            <p>Usa este espacio para guardar los recuerdos que no siempre aparecen en las fotos profesionales.</p>
          </div>
        </div>
      </div>

      <div className="hero-visual">
        <div className="photo-frame main-frame">
          <small>Nos casamos</small>
          <span>{coupleName}</span>
          <em>{weddingDate}</em>
        </div>
        <div className="floating-card qr-card">
          <div className="qr-grid" aria-hidden="true">
            {Array.from({ length: 25 }).map((_, index) => (
              <span key={index} className={index % 3 === 0 || index % 7 === 0 ? 'filled' : ''} />
            ))}
          </div>
          <strong>{memoryDomain}</strong>
          <small>Escanea y comparte</small>
        </div>
        <div className="floating-card count-card">
          <strong>+128</strong>
          <small>recuerdos esperados</small>
        </div>
      </div>
    </section>
  )
}

function Step({ number, title, text }) {
  return (
    <article>
      <span>{number}</span>
      <strong>{title}</strong>
      <p>{text}</p>
    </article>
  )
}

function UploadView({
  form,
  setForm,
  selectedFiles,
  handleFiles,
  removeSelectedFile,
  submitUpload,
  uploadState,
  uploadError,
  fileNotice,
  progress,
}) {
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
              onChange={(event) => setForm({ ...form, guestName: event.target.value })}
              placeholder="Ej. Laura Gomez"
            />
          </label>
          <label>
            Mesa o grupo
            <input
              value={form.table}
              onChange={(event) => setForm({ ...form, table: event.target.value })}
              placeholder="Ej. Mesa 4"
            />
          </label>
        </div>

        <label>
          Relacion con los novios
          <input
            value={form.relation}
            onChange={(event) => setForm({ ...form, relation: event.target.value })}
            placeholder="Ej. Familia de Karen, amigos de Kevin"
          />
        </label>

        <label>
          Momento del evento
          <select
            value={form.moment}
            onChange={(event) => setForm({ ...form, moment: event.target.value })}
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
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={(event) => handleFiles(event.target.files)}
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
                  <img src={item.previewUrl} alt={item.file.name} />
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
            Gracias por ser parte de nuestra historia. Tu recuerdo ya fue guardado para Kevin & Karen
            y quedara pendiente de revision antes de mostrarse en la galeria en vivo.
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
            onChange={(event) => setForm({ ...form, consent: event.target.checked })}
          />
          <span>
            Autorizo que Kevin & Karen guarden estas fotos o videos como recuerdo privado de su boda.
          </span>
        </label>

        <p className="privacy-note">
          Este espacio es privado para los novios. Evita subir contenido sensible o que no quieras compartir con ellos.
        </p>

        <button className="primary-button full" disabled={!form.guestName.trim() || selectedFiles.length === 0 || !form.consent}>
          Subir recuerdos
        </button>
      </form>
    </section>
  )
}

function AdminView({
  isAdmin,
  loginCode,
  setLoginCode,
  loginEmail,
  setLoginEmail,
  loginPassword,
  setLoginPassword,
  loginError,
  handleLogin,
  handleLogout,
  stats,
  isLoadingMemories,
  uploadError,
  isDownloadingZip,
  filters,
  setFilters,
  filteredMemories,
  setActiveMemory,
  downloadMemory,
  downloadAllMemories,
  updateMemoryApproval,
}) {
  if (!isAdmin) {
    return (
      <section className="login-screen">
        <form className="login-card" onSubmit={handleLogin}>
          <span className="eyebrow">Acceso privado</span>
          <h2>Panel de los novios</h2>
          <p>
            {isSupabaseConfigured
              ? 'Ingresa con el usuario administrador creado en Supabase Auth.'
              : 'Ingresa el codigo privado para revisar, filtrar y descargar todos los recuerdos de Kevin & Karen.'}
          </p>
          {isSupabaseConfigured ? (
            <>
              <input
                type="email"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                placeholder="Correo administrador"
              />
              <input
                type="password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                placeholder="Contraseña"
              />
            </>
          ) : (
            <input
              type="password"
              value={loginCode}
              onChange={(event) => setLoginCode(event.target.value)}
              placeholder="Codigo privado"
            />
          )}
          {loginError && <span className="field-error">{loginError}</span>}
          <button className="primary-button full">Entrar al panel</button>
          {!isSupabaseConfigured && <small>Demo: {privateCode}</small>}
        </form>
      </section>
    )
  }

  return (
    <section className="admin-layout">
      <div className="section-heading split-heading">
        <div>
          <span className="eyebrow">Galeria privada</span>
          <h2>Panel de recuerdos</h2>
        </div>
        <div className="admin-actions">
          <button className="secondary-button" onClick={() => downloadAllMemories(filteredMemories)} disabled={isDownloadingZip}>
            {isDownloadingZip ? 'Preparando ZIP...' : 'Descargar ZIP'}
          </button>
          <button className="secondary-button" onClick={handleLogout}>Salir</button>
        </div>
      </div>

      <div className="stats-grid">
        <Stat title="Fotos" value={stats.photos} />
        <Stat title="Videos" value={stats.videos} />
        <Stat title="Invitados" value={stats.guests} />
        <Stat title="Pendientes" value={stats.pending} />
        <Stat title="Ultima subida" value={stats.latest ? formatDate(stats.latest.uploadedAt) : 'Sin datos'} />
      </div>

      <div className={`integration-status ${isSupabaseConfigured ? 'connected' : 'demo'}`}>
        {isSupabaseConfigured
          ? 'Panel conectado a Supabase.'
          : 'Panel en modo demo. Los recuerdos no se guardan al recargar.'}
      </div>

      {uploadError && <div className="error-message">{uploadError}</div>}

      <div className="filters-card">
        <input
          value={filters.query}
          onChange={(event) => setFilters({ ...filters, query: event.target.value })}
          placeholder="Buscar invitado, relacion o archivo"
        />
        <select
          value={filters.moment}
          onChange={(event) => setFilters({ ...filters, moment: event.target.value })}
        >
          <option>Todos</option>
          {moments.map((moment) => (
            <option key={moment}>{moment}</option>
          ))}
        </select>
        <input
          value={filters.table}
          onChange={(event) => setFilters({ ...filters, table: event.target.value })}
          placeholder="Filtrar por mesa"
        />
      </div>

      {isLoadingMemories ? (
        <div className="skeleton-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton-card stagger-item" style={{ '--delay': `${i * 60}ms` }}>
              <div className="skeleton-media" />
              <div className="skeleton-body">
                <div className="skeleton-line" />
                <div className="skeleton-line" />
                <div className="skeleton-line" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredMemories.length === 0 ? (
        <div className="empty-state">
          <span>No hay recuerdos compartidos</span>
          <p>Cuando tus invitados suban fotos, apareceran aqui.</p>
        </div>
      ) : (
        <div className="memory-grid masonry">
          {filteredMemories.map((memory, index) => (
            <div key={memory.id} className="stagger-item" style={{ '--delay': `${index * 50}ms` }}>
              <MemoryCard
                memory={memory}
                onOpen={() => onOpen(memory)}
                onDownload={() => onDownload(memory)}
                onApprove={() => onApprove(memory.id)}
                onHide={() => onHide(memory.id)}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function Stat({ title, value }) {
  return (
    <article className="stat-card">
      <span>{title}</span>
      <strong>{value}</strong>
    </article>
  )
}

function MemoryCard({ memory, onOpen, onDownload, onApprove, onHide }) {
  return (
    <article className={`memory-card ${memory.approved ? 'approved' : 'pending'}`}>
      <button className={`memory-media ${memory.accent || ''}`} onClick={onOpen}>
        {memory.previewUrl && memory.type === 'image' && <img src={memory.previewUrl} alt={memory.fileName} />}
        {memory.previewUrl && memory.type === 'video' && <video src={memory.previewUrl} muted />}
        {!memory.previewUrl && <span>{memory.type === 'video' ? 'Video' : 'Foto'}</span>}
      </button>
      <div className="memory-info">
        <span className={`status-pill ${memory.approved ? 'approved' : 'pending'}`}>
          {memory.approved ? 'Aprobado' : 'Pendiente'}
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
          <button onClick={onApprove}>Aprobar</button>
        )}
      </div>
    </article>
  )
}

function MemoryModal({ memory, onClose, onDownload, onDelete, onApprove, onHide }) {
  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <article className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className={`modal-media ${memory.accent || ''}`}>
          {memory.previewUrl && memory.type === 'image' && <img src={memory.previewUrl} alt={memory.fileName} />}
          {memory.previewUrl && memory.type === 'video' && <video src={memory.previewUrl} controls />}
          {!memory.previewUrl && <span>{memory.type === 'video' ? 'Video destacado' : 'Foto destacada'}</span>}
        </div>
        <aside className="modal-details">
          <button className="close-button" onClick={onClose}>Cerrar</button>
          <span className="eyebrow">Detalle del recuerdo</span>
          <h3>{memory.fileName}</h3>
          <dl>
            <div><dt>Subido por</dt><dd>{memory.guestName}</dd></div>
            <div><dt>Mesa</dt><dd>{memory.table}</dd></div>
            <div><dt>Relacion</dt><dd>{memory.relation}</dd></div>
            <div><dt>Momento</dt><dd>{memory.moment}</dd></div>
            <div><dt>Estado</dt><dd>{memory.approved ? 'Aprobado' : 'Pendiente'}</dd></div>
            <div><dt>Fecha y hora</dt><dd>{formatDate(memory.uploadedAt)}</dd></div>
          </dl>
          {memory.approved ? (
            <button className="secondary-button full" onClick={onHide}>Ocultar de galeria en vivo</button>
          ) : (
            <button className="secondary-button full" onClick={onApprove}>Aprobar para galeria en vivo</button>
          )}
          <button className="primary-button full" onClick={onDownload} disabled={!memory.previewUrl}>
            Descargar archivo
          </button>
          <button className="danger-button full" onClick={onDelete}>Eliminar</button>
        </aside>
      </article>
    </div>
  )
}

function LiveView({ memories }) {
  const [slideshow, setSlideshow] = useState(false)
  const [slideIndex, setSlideIndex] = useState(0)
  const latest = memories.filter((memory) => memory.approved).slice(0, 6)

  useEffect(() => {
    if (!slideshow || latest.length === 0) return
    const timer = setInterval(() => {
      setSlideIndex((current) => (current + 1) % latest.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [slideshow, latest.length])

  return (
    <section className="live-screen">
      <div className="live-header">
        <span className="eyebrow">Galeria en vivo</span>
        <h2>Recuerdos apareciendo durante la fiesta</h2>
        <p>Modo ideal para una TV con moderacion previa antes de publicar.</p>
        {latest.length > 1 && (
          <button
            className="secondary-button"
            style={{ marginTop: '12px' }}
            onClick={() => setSlideshow((s) => !s)}
          >
            {slideshow ? 'Detener slideshow' : 'Iniciar slideshow'}
          </button>
        )}
      </div>
      {latest.length === 0 ? (
        <div className="live-empty">Aun no hay recuerdos aprobados para mostrar.</div>
      ) : slideshow ? (
        <div className="live-slideshow">
          {latest.map((memory, index) => (
            <article
              key={memory.id}
              className={`live-slide ${index === slideIndex ? 'active' : ''}`}
            >
              {memory.previewUrl && memory.type === 'image' && <img src={memory.previewUrl} alt={memory.fileName} />}
              {memory.previewUrl && memory.type === 'video' && <video src={memory.previewUrl} muted autoPlay loop />}
              <div className="live-slide-info">
                <strong>{memory.guestName}</strong>
                <span>{memory.moment}</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="live-wall">
          {latest.map((memory, index) => (
            <article key={memory.id} className={`live-tile ${memory.accent || ''} stagger-item`} style={{ '--delay': `${index * 80}ms` }}>
              {memory.previewUrl && memory.type === 'image' && <img src={memory.previewUrl} alt={memory.fileName} />}
              {memory.previewUrl && memory.type === 'video' && <video src={memory.previewUrl} muted autoPlay loop />}
              {!memory.previewUrl && <span>{memory.type === 'video' ? 'Video' : 'Foto'}</span>}
              <strong>{memory.guestName}</strong>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function QrView() {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=420x420&margin=18&data=${encodeURIComponent(publicMemoryUrl)}`

  return (
    <section className="qr-screen">
      <div className="qr-print-card">
        <span className="brand-mark large">K&K</span>
        <span className="eyebrow">Kevin & Karen · {weddingDate}</span>
        <h2>Comparte tus recuerdos</h2>
        <p>Escanea este codigo y sube las fotos o videos que tomaste durante nuestra boda.</p>
        <img className="qr-image" src={qrUrl} alt="QR para subir recuerdos" />
        <strong>{memoryDomain}</strong>
        <div className="qr-actions">
          <a className="primary-button" href={qrUrl} download="qr-kevin-karen.png">Descargar QR</a>
          <button className="secondary-button" onClick={() => window.print()}>Imprimir</button>
        </div>
      </div>
    </section>
  )
}

export default App
