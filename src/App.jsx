import { useEffect, useMemo, useRef, useState } from 'react'
import { isSupabaseConfigured, memoriesBucket, supabase } from './supabaseClient'
import { coupleName, weddingDate, maxFilesPerUpload, maxPhotoSize, maxVideoSize, privateCode, invitationUrl, seedMemories } from './constants'
import { mapSupabaseMemory } from './utils/mapSupabaseMemory'
import { compressImage, createThumbnail } from './utils/compressImage'
import { formatFileSize } from './utils/formatFileSize'
import { getSafeFileName } from './utils/getSafeFileName'
import { useBeforeInstallPrompt } from './hooks/useBeforeInstallPrompt'
import { HomeView } from './views/HomeView'
import { UploadView } from './views/UploadView'
import { AdminView } from './views/AdminView'
import { LiveView } from './views/LiveView'
import { QrView } from './views/QrView'
import { MemoryModal } from './components/MemoryModal'
import { ToastContainer } from './components/ToastContainer'
import { SplashScreen } from './components/SplashScreen'
import { Icon } from './components/Icons'

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
  const demoUploadTimerRef = useRef(null)
  const selfInsertedIdsRef = useRef(new Set())
  const { canInstall, promptInstall } = useBeforeInstallPrompt()

  useEffect(() => {
    const viewTitles = {
      home: 'Kevin & Karen | Recuerdos de Boda',
      upload: 'Subir recuerdos | Kevin & Karen',
      admin: 'Panel | Kevin & Karen',
      live: 'Galeria en vivo | Kevin & Karen',
      qr: 'Codigo QR | Kevin & Karen',
    }
    document.title = viewTitles[view] || viewTitles.home
  }, [view])

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

  useEffect(() => {
    if (!isSupabaseConfigured) return

    const channel = supabase
      .channel('wedding-memories-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'wedding_memories' },
        (payload) => {
          const incoming = mapSupabaseMemory(payload.new)
          const isOwnUpload = selfInsertedIdsRef.current.has(incoming.id)
          if (isOwnUpload) selfInsertedIdsRef.current.delete(incoming.id)
          setMemories((current) => {
            if (current.some((memory) => memory.id === incoming.id)) return current
            return [incoming, ...current]
          })
          if (!isOwnUpload) {
            addToast('Nuevo recuerdo publicado en la galeria en vivo.', 'info')
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'wedding_memories' },
        (payload) => {
          const updated = mapSupabaseMemory(payload.new)
          setMemories((current) => current.map((memory) => (
            memory.id === updated.id ? updated : memory
          )))
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'wedding_memories' },
        (payload) => {
          setMemories((current) => current.filter((memory) => memory.id !== payload.old.id))
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (demoUploadTimerRef.current) {
        window.clearInterval(demoUploadTimerRef.current)
        demoUploadTimerRef.current = null
      }
    }
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
    return {
      photos: memories.filter((memory) => memory.type === 'image').length,
      videos: memories.filter((memory) => memory.type === 'video').length,
      total: memories.length,
      approved: memories.filter((memory) => memory.approved).length,
      hidden: memories.filter((memory) => !memory.approved).length,
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
        } catch {
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

  function resetUpload() {
    setSelectedFiles([])
    setUploadState('idle')
    setUploadError('')
    setFileNotice('')
    setProgress(0)
  }

  function goToMemory(direction) {
    const index = filteredMemories.findIndex((memory) => memory.id === activeMemory?.id)
    if (index === -1) return
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= filteredMemories.length) return
    setActiveMemory(filteredMemories[nextIndex])
  }

  async function submitUpload(event) {
    event.preventDefault()

    if (selectedFiles.length === 0) return

    setUploadState('uploading')
    setUploadError('')
    setProgress(8)

    if (isSupabaseConfigured) {
      const succeededIds = new Set()
      const failed = []
      const uploadedMemories = []

      for (const [index, item] of selectedFiles.entries()) {
        const baseStart = Math.round((index / selectedFiles.length) * 92)
        const perFileShare = 92 / selectedFiles.length

        try {
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
              onUploadProgress: (event) => {
                const loaded = event.total
                  ? Math.round((event.loaded / event.total) * perFileShare)
                  : 0
                setProgress(baseStart + loaded)
              },
            })

          if (storageError) throw storageError

          const { data: publicFile } = supabase.storage
            .from(memoriesBucket)
            .getPublicUrl(filePath)

          let thumbUrl = null

          if (item.type === 'image') {
            try {
              const thumb = await createThumbnail(item.file)
              const thumbPath = filePath.replace(/^uploads\//, 'thumbs/')
              const { error: thumbError } = await supabase.storage
                .from(memoriesBucket)
                .upload(thumbPath, thumb, {
                  cacheControl: '3600',
                  contentType: 'image/jpeg',
                  upsert: false,
                })

              if (!thumbError) {
                const { data: publicThumb } = supabase.storage
                  .from(memoriesBucket)
                  .getPublicUrl(thumbPath)
                thumbUrl = publicThumb.publicUrl
              }
            } catch {
              thumbUrl = null
            }
          }

          const fileType = item.file.type.startsWith('video/') ? 'video' : 'image'
          const { data: inserted, error: insertError } = await supabase
            .from('wedding_memories')
            .insert({
              guest_name: 'Anonimo',
              table_name: 'Sin mesa',
              relation: 'Invitado',
              moment: 'Otro',
              file_name: item.file.name,
              file_path: filePath,
              file_type: fileType,
              mime_type: item.file.type,
              size_bytes: item.file.size,
              public_url: publicFile.publicUrl,
              thumb_url: thumbUrl,
              approved: true,
            })
            .select('*')
            .single()

          if (insertError) throw insertError

          selfInsertedIdsRef.current.add(inserted.id)
          uploadedMemories.push(mapSupabaseMemory(inserted))
          succeededIds.add(item.id)
          URL.revokeObjectURL(item.previewUrl)
          setProgress(Math.round(((index + 1) / selectedFiles.length) * 92))
        } catch {
          failed.push(item.file.name)
        }
      }

      if (uploadedMemories.length > 0) {
        setMemories((current) => [...uploadedMemories, ...current])
        setSelectedFiles((current) => current.filter((item) => !succeededIds.has(item.id)))
      }

      if (failed.length > 0) {
        setUploadState('error')
        setUploadError(
          `No se pudieron subir ${failed.length} archivo(s): ${failed.join(', ')}. Los que quedaron en la lista estan listos para reintentar.`,
        )
        addToast(`Fallaron ${failed.length} archivo(s) al subir.`, 'error')
      } else {
        setProgress(100)
        setUploadState('success')
        addToast('Tus recuerdos se subieron y ya estan publicados en la galeria en vivo.', 'success')
      }

      return
    }

    const timerRef = demoUploadTimerRef
    if (timerRef.current) window.clearInterval(timerRef.current)
    timerRef.current = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 100) {
          if (timerRef.current) window.clearInterval(timerRef.current)
          timerRef.current = null
          const uploaded = selectedFiles.map((item) => ({
            id: item.id,
            guestName: 'Anonimo',
            table: 'Sin mesa',
            relation: 'Invitado',
            moment: 'Otro',
            uploadedAt: new Date().toISOString(),
            fileName: item.file.name,
            type: item.type,
            previewUrl: item.previewUrl,
            thumbUrl: item.previewUrl,
            accent: item.type === 'video' ? 'olive' : 'champagne',
            approved: true,
          }))
          setMemories((current) => [...uploaded, ...current])
          setSelectedFiles([])
          setUploadState('success')
          addToast('Tus recuerdos se subieron y ya estan publicados en la galeria en vivo.', 'success')
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

    setLoginError('Codigo incorrecto. Revisa el codigo privado e intenta de nuevo.')
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

    if (isSupabaseConfigured && isAdmin && memory?.filePath) {
      const { error: storageError } = await supabase.storage
        .from(memoriesBucket)
        .remove([memory.filePath])

      if (storageError) {
        addToast(`No se pudo eliminar el archivo. ${storageError.message}`, 'error')
        return
      }

      const { error: deleteError } = await supabase
        .from('wedding_memories')
        .delete()
        .eq('id', id)

      if (deleteError) {
        addToast('El archivo se elimino, pero no el registro. Revisa el panel.', 'error')
      }
    }

    setMemories((current) => current.filter((item) => item.id !== id))
    const deletedIndex = filteredMemories.findIndex((item) => item.id === id)
    const remaining = filteredMemories.filter((item) => item.id !== id)
    setActiveMemory(remaining[deletedIndex] || remaining[deletedIndex - 1] || null)
    addToast('El recuerdo fue eliminado.', 'success')
  }

  async function updateMemoryApproval(id, approved) {
    if (isSupabaseConfigured && isAdmin) {
      const { error } = await supabase
        .from('wedding_memories')
        .update({ approved })
        .eq('id', id)

      if (error) {
        addToast(`No se pudo actualizar la moderacion. ${error.message}`, 'error')
        return
      }
    }

    setMemories((current) => current.map((memory) => (
      memory.id === id ? { ...memory, approved } : memory
    )))
    setActiveMemory((current) => (
      current?.id === id ? { ...current, approved } : current
    ))
    addToast(approved ? 'Recuerdo aprobado para la galeria en vivo.' : 'Recuerdo oculto de la galeria en vivo.', 'success')
  }

  async function downloadAllMemories(list = memories) {
    const downloadable = list.filter((memory) => memory.previewUrl)
    if (downloadable.length === 0) {
      addToast('No hay archivos disponibles para descargar.', 'error')
      return
    }

    setIsDownloadingZip(true)

    try {
      const { default: JSZip } = await import('jszip')
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
      addToast(`ZIP generado con ${downloadable.length} archivos.`, 'success')
    } catch (error) {
      addToast(`No pudimos crear el ZIP. ${error.message}`, 'error')
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
            <Icon name="upload" size={16} />
            Subir
          </button>
          <button className={view === 'admin' ? 'active' : ''} onClick={() => setView('admin')}>
            <Icon name="panel" size={16} />
            Panel
          </button>
          <button className={view === 'live' ? 'active' : ''} onClick={() => setView('live')}>
            <Icon name="eye" size={16} />
            En vivo
          </button>
          <button className={view === 'qr' ? 'active' : ''} onClick={() => setView('qr')}>
            <Icon name="qr" size={16} />
            QR
          </button>
          <a href={invitationUrl} target="_blank" rel="noreferrer">
            Invitacion
          </a>
        </nav>
      </header>

      {view === 'home' && (
        <div className="page-section" style={{ '--delay': '0ms' }}>
          <HomeView
            onStart={() => setView('upload')}
            memoryCount={stats.total}
            canInstall={canInstall}
            onInstall={promptInstall}
          />
        </div>
      )}

      {view === 'upload' && (
        <div className="page-section" style={{ '--delay': '50ms' }}>
        <UploadView
          selectedFiles={selectedFiles}
          handleFiles={handleFiles}
          removeSelectedFile={removeSelectedFile}
          submitUpload={submitUpload}
          uploadState={uploadState}
          uploadError={uploadError}
          fileNotice={fileNotice}
          progress={progress}
          resetUpload={resetUpload}
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
          onPrev={() => goToMemory(-1)}
          onNext={() => goToMemory(1)}
          hasPrev={filteredMemories.findIndex((m) => m.id === activeMemory.id) > 0}
          hasNext={filteredMemories.findIndex((m) => m.id === activeMemory.id) < filteredMemories.length - 1}
          position={filteredMemories.findIndex((m) => m.id === activeMemory.id) + 1}
          total={filteredMemories.length}
        />
      )}

      <ToastContainer toasts={toasts} />

      <SplashScreen coupleName={coupleName} weddingDate={weddingDate} />
    </main>
  )
}

export default App
