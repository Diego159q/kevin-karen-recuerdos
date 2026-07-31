import { isSupabaseConfigured } from '../supabaseClient'
import { moments } from '../constants'
import { Stat } from '../components/Stat'
import { MemoryCard } from '../components/MemoryCard'

export function AdminView({
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
        <Stat title="En vivo" value={stats.approved} />
        <Stat title="Ocultos" value={stats.hidden} />
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
          onChange={(event) => setFilters((prev) => ({ ...prev, query: event.target.value }))}
          placeholder="Buscar invitado, relacion o archivo"
        />
        <select
          value={filters.moment}
          onChange={(event) => setFilters((prev) => ({ ...prev, moment: event.target.value }))}
        >
          <option>Todos</option>
          {moments.map((moment) => (
            <option key={moment}>{moment}</option>
          ))}
        </select>
        <input
          value={filters.table}
          onChange={(event) => setFilters((prev) => ({ ...prev, table: event.target.value }))}
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
                onOpen={() => setActiveMemory(memory)}
                onDownload={() => downloadMemory(memory)}
                onApprove={() => updateMemoryApproval(memory.id, true)}
                onHide={() => updateMemoryApproval(memory.id, false)}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
