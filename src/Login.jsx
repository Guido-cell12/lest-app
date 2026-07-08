import { useState } from 'react'
import { supabase } from './supabaseClient.js'
import './Login.css'

function Login({ onLoginClient, onLoginPro }) {
  const [mode, setMode] = useState(null) // null | 'client' | 'pro'
  const [clientStep, setClientStep] = useState(null) // null | 'form' | 'guest'
  const [isRegistering, setIsRegistering] = useState(true)
  const [name, setName] = useState('')
  const [surname, setSurname] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [category, setCategory] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [locatingNow, setLocatingNow] = useState(false)

  function capitalizeWords(value) {
    return value.replace(/\b\p{L}/gu, (char) => char.toUpperCase())
  }

  function getLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Il tuo browser non supporta la geolocalizzazione.'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
        },
        (error) => {
          reject(new Error('Devi consentire l\'accesso alla posizione per usare LEST.'))
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    })
  }

  async function handleGuestSubmit(e) {
    e.preventDefault()
    if (!name.trim() || !surname.trim() || !phone.trim()) {
      setErrorMsg('Compila tutti i campi per continuare.')
      return
    }

    setLoading(true)
    setErrorMsg('')
    setLocatingNow(true)

    let location
    try {
      location = await getLocation()
    } catch (err) {
      setErrorMsg(err.message)
      setLoading(false)
      setLocatingNow(false)
      return
    }
    setLocatingNow(false)

    const { data, error } = await supabase.auth.signInAnonymously()

    if (error) {
      console.error('Errore login anonimo:', error)
      setErrorMsg('Non siamo riusciti a completare l\'accesso. Riprova.')
      setLoading(false)
      return
    }

    await supabase.from('users').insert({
      id: data.user.id,
      type: 'client',
      name: `${name.trim()} ${surname.trim()}`,
      email: `guest-${data.user.id}@lest.local`,
      latitude: location.latitude,
      longitude: location.longitude,
    })

    const fullName = `${name.trim()} ${surname.trim()}`
    const guestData = {
      id: data.user.id,
      name: fullName,
      phone: phone.trim(),
      email: null,
      isGuest: true,
      latitude: location.latitude,
      longitude: location.longitude,
    }

    localStorage.setItem('lest_guest_user', JSON.stringify(guestData))
    setLoading(false)
    onLoginClient(guestData)
  }

  async function handleGoogleLogin() {
    setErrorMsg('')
    setLocatingNow(true)

    try {
      await getLocation()
    } catch (err) {
      setErrorMsg(err.message)
      setLocatingNow(false)
      return
    }
    setLocatingNow(false)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })

    if (error) {
      setErrorMsg('Errore con Google: ' + error.message)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErrorMsg('')

    if (isRegistering && password !== confirmPassword) {
      setErrorMsg('Le password non coincidono.')
      return
    }

    setLoading(true)

    let location = null
    if (isRegistering) {
      setLocatingNow(true)
      try {
        location = await getLocation()
      } catch (err) {
        setErrorMsg(err.message)
        setLoading(false)
        setLocatingNow(false)
        return
      }
      setLocatingNow(false)
    }

    if (isRegistering) {
      const { data, error } = await supabase.auth.signUp({ email, password })

      if (error) {
        setErrorMsg(error.message)
        setLoading(false)
        return
      }

      const userId = data.user?.id

      await supabase.from('users').insert({
        id: userId,
        type: mode,
        name,
        email,
        category: mode === 'pro' ? category : null,
        latitude: location.latitude,
        longitude: location.longitude,
      })

      setLoading(false)
      if (mode === 'client') {
        onLoginClient({ name, email, id: userId, latitude: location.latitude, longitude: location.longitude })
      } else {
        onLoginPro({ name, email, category, id: userId, latitude: location.latitude, longitude: location.longitude })
      }

    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        setErrorMsg('Email o password non corretti.')
        setLoading(false)
        return
      }

      const userId = data.user?.id

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
        onLoginClient({ name: userData.name, email: userData.email, id: userData.id, latitude: userData.latitude, longitude: userData.longitude })
      } else {
        onLoginPro({ name: userData.name, email: userData.email, category: userData.category, id: userData.id, latitude: userData.latitude, longitude: userData.longitude })
      }
    }
  }

  function resetToStart() {
    setMode(null)
    setClientStep(null)
    setErrorMsg('')
  }

  // Schermata iniziale: scegli cliente o professionista
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

  // Cliente: schermata di scelta con 3 bottoni blu + link ospite
  if (mode === 'client' && clientStep === null) {
    return (
      <div className="app-shell">
        <header className="header header-with-back">
          <button className="icon-back-btn" onClick={resetToStart} aria-label="Indietro">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="logo">LEST</h1>
        </header>

        <div className="welcome-screen">
          <div className="centered-block">
            <p className="welcome-tagline-big">Come vuoi continuare?</p>
            <div className="welcome-buttons-spaced">
              <button
                className="welcome-btn primary"
                onClick={() => { setIsRegistering(true); setClientStep('form') }}
              >
                Registrati
              </button>
              <button
                className="welcome-btn primary"
                onClick={() => { setIsRegistering(false); setClientStep('form') }}
              >
                Accedi
              </button>
              <button className="welcome-btn primary" onClick={handleGoogleLogin} disabled={locatingNow}>
                {locatingNow ? 'Rilevamento posizione...' : 'Accedi con Google'}
              </button>
            </div>

            {errorMsg && <p className="error-text">{errorMsg}</p>}

            <button className="guest-btn guest-btn-spaced" onClick={() => { setErrorMsg(''); setClientStep('guest') }}>
              Continua come ospite
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Cliente: form ospite (solo nome, cognome, telefono)
  if (mode === 'client' && clientStep === 'guest') {
    return (
      <div className="app-shell">
        <header className="form-header">
          <button className="back-btn" onClick={() => { setClientStep(null); setErrorMsg('') }}>
            ← Indietro
          </button>
          <h1 className="form-title">Continua come ospite</h1>
        </header>

        <form className="request-form" onSubmit={handleGuestSubmit}>
          <label className="form-label">
            Nome
            <input
              className="form-input"
              type="text"
              placeholder="Il tuo nome"
              value={name}
              onChange={(e) => setName(capitalizeWords(e.target.value))}
              required
            />
          </label>

          <label className="form-label">
            Cognome
            <input
              className="form-input"
              type="text"
              placeholder="Il tuo cognome"
              value={surname}
              onChange={(e) => setSurname(capitalizeWords(e.target.value))}
              required
            />
          </label>

          <label className="form-label">
            Numero di telefono
            <input
              className="form-input"
              type="tel"
              placeholder="Es. 333 1234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </label>

          <p className="location-note">
            LEST ha bisogno della tua posizione per trovare i professionisti vicino a te.
          </p>

          {errorMsg && <p className="error-text">{errorMsg}</p>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {locatingNow ? 'Rilevamento posizione...' : loading ? 'Caricamento...' : 'Continua'}
          </button>
        </form>
      </div>
    )
  }

  // Form vero e proprio (cliente in modalità Registrati/Accedi, oppure professionista sempre qui)
  return (
    <div className="app-shell">
      <header className="form-header">
        <button
          className="back-btn"
          onClick={() => {
            if (mode === 'client') {
              setClientStep(null)
              setErrorMsg('')
            } else {
              resetToStart()
            }
          }}
        >
          ← Indietro
        </button>
        <h1 className="form-title">
          {mode === 'client' ? 'Cliente' : 'Professionista'}
        </h1>

        {mode === 'pro' && (
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
        )}
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
              onChange={(e) => setName(capitalizeWords(e.target.value))}
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
          <div className="password-field">
            <input
              className="form-input"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
            >
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </label>

        {isRegistering && (
          <label className="form-label">
            Conferma password
            <div className="password-field">
              <input
                className="form-input"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Nascondi password' : 'Mostra password'}
              >
                {showConfirmPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </label>
        )}

        {isRegistering && mode === 'pro' && (
          <label className="form-label">
            Che lavoro fai?
            <input
              className="form-input"
              type="text"
              placeholder="Es. Idraulico, Elettricista, Tecnico climatizzatori..."
              value={category}
              onChange={(e) => setCategory(capitalizeWords(e.target.value))}
              required
            />
          </label>
        )}

        {isRegistering && (
          <p className="location-note">
            LEST ha bisogno della tua posizione per {mode === 'pro' ? 'mostrarti le richieste vicine' : 'trovare i professionisti vicino a te'}.
          </p>
        )}

        {errorMsg && <p className="error-text">{errorMsg}</p>}

        <button type="submit" className="btn-primary" disabled={loading}>
          {locatingNow
            ? 'Rilevamento posizione...'
            : loading
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