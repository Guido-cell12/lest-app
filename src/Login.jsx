import { useState } from 'react'
import { supabase } from './supabaseClient.js'
import './Login.css'

const commonCategories = ['Idraulico', 'Elettricista', 'Imbianchino', 'Muratore', 'Falegname', 'Giardiniere']

function Login({ onLoginClient, onLoginPro }) {
  const [mode, setMode] = useState(null) // null | 'client' | 'pro'
  const [isRegistering, setIsRegistering] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [customCategory, setCustomCategory] = useState('')
  const [city, setCity] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErrorMsg('')
    setLoading(true)

    if (isRegistering) {
      // Registrazione nuova
      const { data, error } = await supabase.auth.signUp({ email, password })

      if (error) {
        setErrorMsg(error.message)
        setLoading(false)
        return
      }

      const userId = data.user?.id
      const category = selectedCategory === 'Altro' ? customCategory : selectedCategory

      // Salva i dati extra nella tabella users
      await supabase.from('users').insert({
        id: userId,
        type: mode,
        name,
        email,
        category: mode === 'pro' ? category : null,
        city: mode === 'pro' ? city : null,
      })

      setLoading(false)
      if (mode === 'client') {
        onLoginClient({ name, email })
      } else {
        onLoginPro({ name, email, category, city })
      }

    } else {
      // Login esistente
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        setErrorMsg('Email o password non corretti.')
        setLoading(false)
        return
      }

      const userId = data.user?.id

      // Recupera i dati extra dalla tabella users
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      setLoading(false)

      if (!userData) {
        setErrorMsg('Utente non trovato.')
        return
      }

      if (userData.type === 'client') {
        onLoginClient({ name: userData.name, email: userData.email })
      } else {
        onLoginPro({ name: userData.name, email: userData.email, category: userData.category, city: userData.city })
      }
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
        <button className="back-btn" onClick={() => { setMode(null); setErrorMsg('') }}>
          ← Indietro
        </button>
        <h1 className="form-title">
          {mode === 'client' ? 'Cliente' : 'Professionista'}
        </h1>
        <div className="auth-tabs">
          <button
            className={isRegistering ? 'auth-tab active' : 'auth-tab'}
            onClick={() => { setIsRegistering(true); setErrorMsg('') }}
          >
            Registrati
          </button>
          <button
            className={!isRegistering ? 'auth-tab active' : 'auth-tab'}
            onClick={() => { setIsRegistering(false); setErrorMsg('') }}
          >
            Accedi
          </button>
        </div>
      </header>

      <form className="request-form" onSubmit={handleSubmit}>
        {isRegistering && (
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
        )}

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

        {isRegistering && mode === 'pro' && (
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

        {errorMsg && <p className="error-text">{errorMsg}</p>}

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading
            ? 'Caricamento...'
            : isRegistering
            ? mode === 'client' ? 'Registrati' : 'Crea profilo professionista'
            : 'Accedi'}
        </button>
      </form>
    </div>
  )
}

export default Login
