import { qrUrl, weddingDate, memoryDomain } from '../constants'
import { Icon } from '../components/Icons'

export function QrView() {
  return (
    <section className="qr-screen">
      <div className="qr-print-card">
        <span className="brand-mark large">K&K</span>
        <span className="eyebrow">Kevin & Karen · {weddingDate}</span>
        <h2>Comparte tus recuerdos</h2>
        <p>Escanea este codigo y sube las fotos o videos que tomaste durante nuestra boda.</p>
        <div className="qr-frame">
          <img className="qr-image" src={qrUrl} alt="QR para subir recuerdos" onError={(e) => { e.target.alt = 'No se pudo generar el codigo QR' }} />
        </div>
        <strong className="qr-domain">
          <Icon name="qr" size={16} />
          <span>{memoryDomain}</span>
        </strong>
        <div className="qr-actions">
          <a className="primary-button" href={qrUrl} download="qr-kevin-karen.png">Descargar QR</a>
          <button className="secondary-button" onClick={() => window.print()}>Imprimir</button>
        </div>
      </div>
    </section>
  )
}
