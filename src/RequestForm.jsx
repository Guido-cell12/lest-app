import { useState } from 'react'
import './RequestForm.css'

function RequestForm({ category, onBack }) {
  const [description, setDescription] = useState('')
  const [address, setAddress] = useState('')
  const [urgency, setUrgency] = useState('oggi')
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="app-shell">
        <div className="confirm-screen">
          <div className="confirm-icon">✓</div>
          <h2 className="confirm-title">Richiesta inviata</h2>
          <p className="confirm-text">
            Stiamo avvisando i professionisti disponibili per{' '}
            <strong>{category.name}</strong> vicino a te. Ti avviseremo non appena
            qualcuno accetta.
          </p>
          <button className="btn-primary" onClick={onBack}>
            Torna alla home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="form-header">
        <button className="back-btn" onClick={onBack}>
          ← Indietro
        </button>
        <h1 className="form-title">{category.name}</h1>
        <p className="form-sub">{category.available} disponibili vicino a te</p>
      </header>

      <form className="request-form" onSubmit={handleSubmit}>
        <label className="form-label">
          Descrivi il problema
          <textarea
            className="form-textarea"
            placeholder="Es. Perdita d'acqua sotto il lavandino del bagno"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </label>

        <label className="form-label">
          Indirizzo
          <input
            className="form-input"
            type="text"
            placeholder="Via, numero, città"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />
        </label>

        <label className="form-label">
          Quando ti serve?
          <div className="urgency-options">
            <button
              type="button"
              className={urgency === 'subito' ? 'urgency-btn active' : 'urgency-btn'}
              onClick={() => setUrgency('subito')}
            >
              Subito
            </button>
            <button
              type="button"
              className={urgency === 'oggi' ? 'urgency-btn active' : 'urgency-btn'}
              onClick={() => setUrgency('oggi')}
            >
              Oggi
            </button>
            <button
              type="button"
              className={urgency === 'settimana' ? 'urgency-btn active' : 'urgency-btn'}
              onClick={() => setUrgency('settimana')}
            >
              Questa settimana
            </button>
          </div>
        </label>

        <button type="submit" className="btn-primary">
          Invia richiesta
        </button>
      </form>
    </div>
  )
}

export default RequestForm
