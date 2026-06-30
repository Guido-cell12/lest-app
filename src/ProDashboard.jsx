import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient.js'
import './ProDashboard.css'

function ProDashboard({ proName, proCategory, onBack }) {
  const [available, setAvailable] = useState(true)
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [acceptedJob, setAcceptedJob] = useState(null)

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
        <h1 className="form-title">LEST Pro</h1>
        <p className="form-sub">Ciao {proName || 'Professionista'}</p>
      </header>

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
    </div>
  )
}

export default ProDashboard
