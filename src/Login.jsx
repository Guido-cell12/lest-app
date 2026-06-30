import { useState } from 'react'
import './Login.css'

const commonCategories = ['Idraulico', 'Elettricista', 'Imbianchino', 'Muratore', 'Falegname', 'Giardiniere']

function Login({ onLoginClient, onLoginPro }) {
  const [mode, setMode] = useState(null) // null | 'client' | 'pro'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [customCategory, setCustomCategory] = useState('')
  const [city, setCity] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (mode === 'client') {
      onLoginClient({ name, email })
    } else {
      const category = selectedCategory === 'Altro' ? customCategory : selectedCategory
      onLoginPro({ name, email, category, city })
    }
  }

  if (!mode) {
    return (
      <div className="app-shell">
        <div className="welcome-screen">
          <h1 className="welcome-logo">LEST</h1>
          <p className="welcome-tagline">Pronto intervento a domicilio</p>

          <div className="welcome-buttons">
            <button className="welcome-btn primary" onClick={() => setMode('client')}>
              Sono un cliente
            </button>
            <button className="welcome-btn secondary" onClick={() => setMode('pro')}>
              Sono un professionista
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="form-header">
        <button className="back-btn" onClick={() => setMode(null)}>
          ← Indietro
        </button>
        <h1 className="form-title">
          {mode === 'client' ? 'Accedi come cliente' : 'Accedi come professionista'}
        </h1>
        <p className="form-sub">
          {mode === 'client'
            ? 'Trova un professionista in pochi minuti'
            : 'Ricevi richieste di lavoro nella tua zona'}
        </p>
      </header>

      <form className="request-form" onSubmit={handleSubmit}>
        <label className="form-label">
          Nome
          <input
            className="form-input"
            type="text"
            placeholder="Il tuo nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>

        <label className="form-label">
          Email
          <input
            className="form-input"
            type="email"
            placeholder="nome@esempio.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="form-label">
          Password
          <input
            className="form-input"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {mode === 'pro' && (
          <>
            <label className="form-label">
              Che lavoro fai?
              <div className="category-grid">
                {commonCategories.map((cat) => (
                  <button
                    type="button"
                    key={cat}
                    className={selectedCategory === cat ? 'category-pill active' : 'category-pill'}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
                <button
                  type="button"
                  className={selectedCategory === 'Altro' ? 'category-pill active' : 'category-pill'}
                  onClick={() => setSelectedCategory('Altro')}
                >
                  Altro
                </button>
              </div>
            </label>

            {selectedCategory === 'Altro' && (
              <label className="form-label">
                Scrivi il tuo mestiere
                <input
                  className="form-input"
                  type="text"
                  placeholder="Es. Tecnico climatizzatori"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  required
                />
              </label>
            )}

            <label className="form-label">
              Città / zona di lavoro
              <input
                className="form-input"
                type="text"
                placeholder="Es. Milano"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
            </label>
          </>
        )}

        <button type="submit" className="btn-primary">
          {mode === 'client' ? 'Entra' : 'Crea profilo professionista'}
        </button>
      </form>
    </div>
  )
}

export default Login
