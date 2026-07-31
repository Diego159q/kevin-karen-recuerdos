import { useEffect, useState } from 'react'

export function LiveView({ memories }) {
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
              {memory.previewUrl && memory.type === 'image' && <img src={memory.previewUrl} alt={memory.fileName} loading="lazy" onError={(e) => { e.target.style.display = 'none' }} />}
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
              {memory.previewUrl && memory.type === 'image' && <img src={memory.previewUrl} alt={memory.fileName} loading="lazy" onError={(e) => { e.target.style.display = 'none' }} />}
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
