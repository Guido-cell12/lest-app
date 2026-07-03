import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient.js'
import './ProDashboard.css'

function ProDashboard({ proName, proCategory, onBack }) {
  const [available, setAvailable] = useState(true)
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [acceptedJob, setAcceptedJob] = useState(null)
  const [activeTab, setActiveTab] = useState('home')

  async function loadRequests() {
    setLoading(true)
    let query = supabase
      .from('requests')
      .select('*')
      .eq('status', 'in_attesa')
      .order('created_at', { ascending: false })

    if (proCategory) {
      query = query.eq('category', proCategory)
    }

    const { data, error } = await query

    if (!error && data) {
      setRequests(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (available) {
      loadRequests()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available])

  async function handleAccept(request) {
    const { error } = await supabase
      .from('requests')
      .update({ status: 'accettata' })
      .eq('id', request.id)

    if (!error) {
      setAcceptedJob(request)
      setRequests((prev) => prev.filter((r) => r.id !== request.id))
    }
  }

  async function handleDecline(request) {
    setRequests((prev) => prev.filter((r) => r.id !== request.id))
  }

  if (acceptedJob) {
    return (
      <div className="app-shell">
        <div className="confirm-screen">
          <div className="confirm-icon">✓</div>
          <h2 className="confirm-title">Lavoro accettato</h2>
          <p className="confirm-text">
            <strong>{acceptedJob.description}</strong>
            <br />
            {acceptedJob.address}
          </p>
          <button className="btn-primary" onClick={() => setAcceptedJob(null)}>
            Torna alle richieste
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="pro-header">
  <button className="back-btn" onClick={onBack}>
    ← Esci
  </button>
  <div className="pro-header-center">
    <h1 className="form-title">LEST Pro</h1>
    <p className="form-sub">Ciao {proName || 'Professionista'}!</p>
  </div>
</header>

      {activeTab === 'home' && (
        <>
          <div className="toggle-row">
            <div>
              <div className="toggle-label">Sono disponibile</div>
              <div className="toggle-sub">Ricevi richieste nella tua zona</div>
            </div>
            <button
              className={available ? 'toggle on' : 'toggle off'}
              onClick={() => setAvailable(!available)}
              aria-label="Disponibilità"
            >
              <div className="toggle-dot" />
            </button>
          </div>

          <div className="pro-stat-row">
            <div className="pro-stat">
              <div className="pro-stat-num">{proCategory || '—'}</div>
              <div className="pro-stat-label">Categoria</div>
            </div>
            <div className="pro-stat">
              <div className="pro-stat-num">{requests.length}</div>
              <div className="pro-stat-label">In attesa</div>
            </div>
          </div>

          <section className="section">
            <h2 className="section-title">Richieste vicino a te</h2>

            {!available && (
              <p className="empty-text">
                Sei offline. Attiva la disponibilità per vedere le richieste.
              </p>
            )}

            {available && loading && <p className="empty-text">Caricamento...</p>}

            {available && !loading && requests.length === 0 && (
              <p className="empty-text">Nessuna richiesta al momento. Torna più tardi.</p>
            )}

            {available &&
              !loading &&
              requests.map((req) => (
                <div key={req.id} className="request-card">
                  <div className="req-top">
                    <div className="req-title">{req.description}</div>
                    <div className="badge badge-new">Nuova</div>
                  </div>
                  <div className="req-addr">{req.address}</div>
                  <div className="req-bottom">
                    <div className="req-price">Urgenza: {req.urgency}</div>
                  </div>
                  <button className="btn-primary" onClick={() => handleAccept(req)}>
                    Accetta richiesta
                  </button>
                  <button className="btn-secondary" onClick={() => handleDecline(req)}>
                    Rifiuta
                  </button>
                </div>
              ))}
          </section>
        </>
      )}

      {activeTab === 'storico' && (
        <section className="section">
          <h2 className="section-title">Storico lavori</h2>
          <p className="empty-text">Presto qui vedrai i lavori completati.</p>
        </section>
      )}

      {activeTab === 'chat' && (
        <section className="section">
          <h2 className="section-title">Chat</h2>
          <p className="empty-text">
            Apri una chat da un lavoro accettato per parlare con il cliente.
          </p>
        </section>
      )}

      {activeTab === 'profilo' && (
        <section className="section">
          <h2 className="section-title">Profilo</h2>
          <p className="empty-text">
            {proName} — {proCategory}
          </p>
        </section>
      )}

      <nav className="bottom-nav">
  <button
    className={activeTab === 'home' ? 'nav-item active' : 'nav-item'}
    onClick={() => setActiveTab('home')}
  >
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
    <span>Home</span>
  </button>
  <button
    className={activeTab === 'storico' ? 'nav-item active' : 'nav-item'}
    onClick={() => setActiveTab('storico')}
  >
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" />
      <polyline points="3 3 3 8 8 8" />
      <polyline points="12 7 12 12 15 15" />
    </svg>
    <span>Storico</span>
  </button>
  <button
    className={activeTab === 'chat' ? 'nav-item active' : 'nav-item'}
    onClick={() => setActiveTab('chat')}
  >
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
    </svg>
    <span>Chat</span>
  </button>
  <button
    className={activeTab === 'profilo' ? 'nav-item active' : 'nav-item'}
    onClick={() => setActiveTab('profilo')}
  >
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
    <span>Profilo</span>
  </button>
</nav>
    </div>
  )
}

export default ProDashboard