import { useState } from 'react'
import './ProDashboard.css'

const initialRequests = [
  {
    id: 1,
    title: 'Perdita acqua bagno',
    address: 'Via Roma 14',
    distance: '1.2 km',
    price: '60 - 120',
    time: '5 min fa',
  },
  {
    id: 2,
    title: 'Scaldabagno non si accende',
    address: 'Corso Buenos Aires 8',
    distance: '2.8 km',
    price: '50 - 90',
    time: '12 min fa',
  },
  {
    id: 3,
    title: 'Rubinetto cucina rotto',
    address: 'Viale Monza 102',
    distance: '4.5 km',
    price: '40 - 70',
    time: '20 min fa',
  },
]

function ProDashboard({ onBack }) {
  const [available, setAvailable] = useState(true)
  const [requests, setRequests] = useState(initialRequests)
  const [acceptedJob, setAcceptedJob] = useState(null)

  function handleAccept(request) {
    setAcceptedJob(request)
    setRequests((prev) => prev.filter((r) => r.id !== request.id))
  }

  function handleDecline(request) {
    setRequests((prev) => prev.filter((r) => r.id !== request.id))
  }

  if (acceptedJob) {
    return (
      <div className="app-shell">
        <div className="confirm-screen">
          <div className="confirm-icon">✓</div>
          <h2 className="confirm-title">Lavoro accettato</h2>
          <p className="confirm-text">
            <strong>{acceptedJob.title}</strong>
            <br />
            {acceptedJob.address} — {acceptedJob.distance}
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
          ← Indietro
        </button>
        <h1 className="form-title">LEST Pro</h1>
        <p className="form-sub">Ciao Marco</p>
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
          <div className="pro-stat-num">12</div>
          <div className="pro-stat-label">Lavori</div>
        </div>
        <div className="pro-stat">
          <div className="pro-stat-num">4.9</div>
          <div className="pro-stat-label">Rating</div>
        </div>
        <div className="pro-stat">
          <div className="pro-stat-num">840€</div>
          <div className="pro-stat-label">Questo mese</div>
        </div>
      </div>

      <section className="section">
        <h2 className="section-title">Richieste vicino a te</h2>

        {!available && (
          <p className="empty-text">
            Sei offline. Attiva la disponibilità per vedere le richieste.
          </p>
        )}

        {available && requests.length === 0 && (
          <p className="empty-text">Nessuna richiesta al momento. Torna più tardi.</p>
        )}

        {available &&
          requests.map((req) => (
            <div key={req.id} className="request-card">
              <div className="req-top">
                <div className="req-title">{req.title}</div>
                <div className="badge badge-new">Nuova</div>
              </div>
              <div className="req-addr">
                {req.address} — {req.distance}
              </div>
              <div className="req-bottom">
                <div className="req-price">€ {req.price}</div>
                <div className="req-time">{req.time}</div>
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
