import { weddingDate, coupleName, memoryDomain, invitationUrl } from '../constants'
import { Step } from '../components/Step'
import { Reveal } from '../components/Reveal'

export function HomeView({ onStart, memoryCount, canInstall, onInstall }) {
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
          {canInstall && (
            <button className="secondary-button" onClick={onInstall}>Instalar app</button>
          )}
          <span className="secure-note">Invitacion privada por QR</span>
        </div>
        <div className="steps">
          <Reveal delay={100}><Step number="01" title="Escanea" text="Ingresa desde el QR preparado para los invitados." /></Reveal>
          <Reveal delay={200}><Step number="02" title="Sin formularios" text="No llenas nada: elige tus fotos o videos y subelos al instante." /></Reveal>
          <Reveal delay={300}><Step number="03" title="Bendice el recuerdo" text="Tu recuerdo se publica al momento en la galeria en vivo." /></Reveal>
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
          <strong>{memoryCount > 0 ? `+${memoryCount}` : '+128'}</strong>
          <small>{memoryCount > 0 ? 'recuerdos compartidos' : 'recuerdos esperados'}</small>
        </div>
      </div>
    </section>
  )
}
