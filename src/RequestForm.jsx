import { useState } from 'react'
import { supabase } from './supabaseClient.js'
import './RequestForm.css'

function RequestForm({ category, clientName, clientId, clientLatitude, clientLongitude, urgencyMode, onBack }) {
  const [description, setDescription] = useState('')
  const [address, setAddress] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const urgency = urgencyMode === 'tomorrow' ? 'domani' : 'immediato'

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    try {
      const { error } = await supabase.from('requests').insert({
        client_name: clientName || 'Cliente',
        client_id: clientId || null,
        category: category.name,
        description,
        address,
        urgency,
        status: 'in_attesa',
        latitude: clientLatitude || null,
        longitude: clientLongitude || null,
      })

      if (error) {
        console.error('Errore Supabase:', error)
        setErrorMsg('Non siamo riusciti a inviare la richiesta. Riprova tra poco.')
        setLoading(false)
        return
      }

      setSubmitted(true)
    } catch (err) {
      console.error('Errore di rete:', err)
      setErrorMsg('Problema di connessione. Controlla la rete e riprova.')
    } finally {
      setLoading(false)
    }
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
        <div className="urgency-badge">
          {urgencyMode === 'tomorrow' ? 'Intervento programmato per domani' : 'Intervento immediato'}
        </div>

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

        {errorMsg && <p className="error-text">{errorMsg}</p>}

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Invio in corso...' : 'Invia richiesta'}
        </button>
      </form>
    </div>
  )
}

export default RequestForm