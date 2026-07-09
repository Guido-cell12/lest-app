import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient.js'
import Chat from './Chat.jsx'
import { calculateDistanceKm } from './utils/distance.js'
import './ProDashboard.css'

function ProDashboard({ proId, proName, proCategory, proLatitude, proLongitude, onBack }) {
  const [availableNow, setAvailableNow] = useState(true)
  const [availableTomorrow, setAvailableTomorrow] = useState(true)
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [acceptedJob, setAcceptedJob] = useState(null)
  const [activeTab, setActiveTab] = useState('home')
  const [myJobs, setMyJobs] = useState([])
  const [loadingJobs, setLoadingJobs] = useState(false)
  const [openChatRequest, setOpenChatRequest] = useState(null)
  const [conversations, setConversations] = useState([])
  const [loadingConversations, setLoadingConversations] = useState(false)
  const [radiusKm, setRadiusKm] = useState(20)
  const [radiusInput, setRadiusInput] = useState('20')
  const [savingRadius, setSavingRadius] = useState(false)

  // Profilo: nome e categoria modificabili
  const [displayName, setDisplayName] = useState(proName || '')
  const [nameInput, setNameInput] = useState(proName || '')
  const [displayCategory, setDisplayCategory] = useState(proCategory || '')
  const [categoryInput, setCategoryInput] = useState(proCategory || '')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')

  // Profilo: email e password
  const [emailInput, setEmailInput] = useState('')
  const [newPasswordInput, setNewPasswordInput] = useState('')
  const [savingAccount, setSavingAccount] = useState(false)
  const [accountMsg, setAccountMsg] = useState('')

  // Verifica identità
  const [verificationStatus, setVerificationStatus] = useState('non_verificato')
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [verificationMsg, setVerificationMsg] = useState('')

  // Carica lo stato di disponibilità, il raggio e i dati profilo salvati
  useEffect(() => {
    async function loadProfile() {
      if (!proId) return
      const { data } = await supabase
        .from('users')
        .select('available_now, available_tomorrow, service_radius_km, name, category, email, verification_status')
        .eq('id', proId)
        .single()

      if (data) {
        setAvailableNow(data.available_now ?? true)
        setAvailableTomorrow(data.available_tomorrow ?? true)
        const radius = data.service_radius_km ?? 20
        setRadiusKm(radius)
        setRadiusInput(String(radius))
        setDisplayName(data.name || '')
        setNameInput(data.name || '')
        setDisplayCategory(data.category || '')
        setCategoryInput(data.category || '')
        setEmailInput(data.email || '')
        setVerificationStatus(data.verification_status || 'non_verificato')
      }
    }
    loadProfile()
  }, [proId])

  async function toggleAvailableNow() {
    const newValue = !availableNow
    setAvailableNow(newValue)
    if (proId) {
      const { error } = await supabase.from('users').update({ available_now: newValue }).eq('id', proId)
      if (error) {
        console.error('Errore salvataggio disponibilità subito:', error)
        alert('Non sono riuscito a salvare la disponibilità. Riprova.')
        setAvailableNow(!newValue)
      }
    }
  }

  async function toggleAvailableTomorrow() {
    const newValue = !availableTomorrow
    setAvailableTomorrow(newValue)
    if (proId) {
      const { error } = await supabase.from('users').update({ available_tomorrow: newValue }).eq('id', proId)
      if (error) {
        console.error('Errore salvataggio disponibilità domani:', error)
        alert('Non sono riuscito a salvare la disponibilità. Riprova.')
        setAvailableTomorrow(!newValue)
      }
    }
  }

  async function saveRadius() {
    const parsed = parseInt(radiusInput, 10)
    if (!parsed || parsed < 1) return

    setSavingRadius(true)
    const { error } = await supabase.from('users').update({ service_radius_km: parsed }).eq('id', proId)
    if (error) {
      console.error('Errore salvataggio raggio:', error)
      alert('Non sono riuscito a salvare il raggio d\'azione. Riprova.')
      setSavingRadius(false)
      return
    }
    setRadiusKm(parsed)
    setSavingRadius(false)
  }

  async function saveProfileInfo() {
    if (!nameInput.trim() || !categoryInput.trim()) {
      setProfileMsg('Nome e categoria non possono essere vuoti.')
      return
    }

    setSavingProfile(true)
    setProfileMsg('')

    const { error } = await supabase
      .from('users')
      .update({ name: nameInput.trim(), category: categoryInput.trim() })
      .eq('id', proId)

    if (error) {
      console.error('Errore salvataggio profilo:', error)
      setProfileMsg('Non sono riuscito a salvare le modifiche. Riprova.')
      setSavingProfile(false)
      return
    }

    setDisplayName(nameInput.trim())
    setDisplayCategory(categoryInput.trim())
    setProfileMsg('Salvato!')
    setSavingProfile(false)
  }

  async function saveAccountInfo() {
    setSavingAccount(true)
    setAccountMsg('')

    const updates = {}
    if (emailInput.trim()) updates.email = emailInput.trim()
    if (newPasswordInput.trim()) updates.password = newPasswordInput.trim()

    if (Object.keys(updates).length === 0) {
      setSavingAccount(false)
      return
    }

    const { error } = await supabase.auth.updateUser(updates)

    if (error) {
      console.error('Errore aggiornamento account:', error)
      setAccountMsg('Non sono riuscito a salvare. ' + error.message)
      setSavingAccount(false)
      return
    }

    // Se l'email è cambiata, Supabase manda una mail di conferma al nuovo indirizzo
    if (updates.email) {
      await supabase.from('users').update({ email: updates.email }).eq('id', proId)
      setAccountMsg('Controlla la nuova email per confermare il cambio.')
    } else {
      setAccountMsg('Password aggiornata!')
    }

    setNewPasswordInput('')
    setSavingAccount(false)
  }

  async function handleDocUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingDoc(true)
    setVerificationMsg('')

    const filePath = `${proId}/documento-${Date.now()}.${file.name.split('.').pop()}`

    const { error: uploadError } = await supabase.storage
      .from('verification-docs')
      .upload(filePath, file)

    if (uploadError) {
      console.error('Errore caricamento documento:', uploadError)
      setVerificationMsg('Non sono riuscito a caricare il documento. Riprova.')
      setUploadingDoc(false)
      return
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ verification_status: 'in_attesa', verification_doc_path: filePath })
      .eq('id', proId)

    if (updateError) {
      console.error('Errore salvataggio stato verifica:', updateError)
      setVerificationMsg('Documento caricato ma non sono riuscito ad aggiornare lo stato. Contatta l\'assistenza.')
      setUploadingDoc(false)
      return
    }

    setVerificationStatus('in_attesa')
    setVerificationMsg('Documento caricato! Lo controlleremo al più presto.')
    setUploadingDoc(false)
  }

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
      const withinRange = data.filter((req) => {
        if (!proLatitude || !proLongitude || !req.latitude || !req.longitude) {
          return true
        }
        const distance = calculateDistanceKm(proLatitude, proLongitude, req.latitude, req.longitude)
        return distance !== null && distance <= radiusKm
      })
      setRequests(withinRange)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (availableNow || availableTomorrow) {
      loadRequests()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableNow, availableTomorrow, radiusKm])

  useEffect(() => {
    const channel = supabase
      .channel('requests-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'requests',
        },
        (payload) => {
          const updated = payload.new
          if (updated.status !== 'in_attesa') {
            setRequests((prev) => prev.filter((r) => r.id !== updated.id))
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'requests',
        },
        (payload) => {
          const newReq = payload.new
          if (newReq.status !== 'in_attesa' || (proCategory && newReq.category !== proCategory)) {
            return
          }
          if (proLatitude && proLongitude && newReq.latitude && newReq.longitude) {
            const distance = calculateDistanceKm(proLatitude, proLongitude, newReq.latitude, newReq.longitude)
            if (distance === null || distance > radiusKm) {
              return
            }
          }
          setRequests((prev) => [newReq, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [proCategory, proLatitude, proLongitude, radiusKm])

  useEffect(() => {
    if (activeTab === 'storico') {
      loadMyJobs()
    }
    if (activeTab === 'chat') {
      fetchConversations()
    }
  }, [activeTab])

  async function loadMyJobs() {
    setLoadingJobs(true)
    const { data, error } = await supabase
      .from('requests')
      .select('*')
      .eq('status', 'accettata')
      .eq('accepted_by', proId)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setMyJobs(data)
    }
    setLoadingJobs(false)
  }

  async function fetchConversations() {
    setLoadingConversations(true)

    const { data: acceptedRequests, error } = await supabase
      .from('requests')
      .select('*')
      .eq('status', 'accettata')
      .eq('accepted_by', proId)
      .order('id', { ascending: false })

    if (error || !acceptedRequests) {
      setLoadingConversations(false)
      return
    }

    const withLastMessage = await Promise.all(
      acceptedRequests.map(async (req) => {
        const { data: lastMsg, error: msgError } = await supabase
          .from('messages')
          .select('*')
          .eq('request_id', req.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (msgError) {
          console.error('Errore caricamento ultimo messaggio:', msgError)
        }

        return {
          ...req,
          lastMessage: lastMsg?.content || 'Nessun messaggio ancora',
        }
      })
    )

    setConversations(withLastMessage)
    setLoadingConversations(false)
  }

  async function handleAccept(request) {
    const { data, error } = await supabase
      .from('requests')
      .update({ status: 'accettata', accepted_by: proId })
      .eq('id', request.id)
      .eq('status', 'in_attesa')
      .select()

    if (error) {
      alert('Si è verificato un errore. Riprova.')
      return
    }

    if (!data || data.length === 0) {
      alert('Questa richiesta è stata appena presa da un altro professionista.')
      setRequests((prev) => prev.filter((r) => r.id !== request.id))
      return
    }

    setAcceptedJob(request)
    setRequests((prev) => prev.filter((r) => r.id !== request.id))
  }

  async function handleDecline(request) {
    setRequests((prev) => prev.filter((r) => r.id !== request.id))
  }

  async function handleComplete(job) {
    const { error } = await supabase
      .from('requests')
      .update({ status: 'completata' })
      .eq('id', job.id)

    if (!error) {
      setMyJobs((prev) => prev.filter((j) => j.id !== job.id))
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    onBack()
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

  if (openChatRequest) {
    return (
      <Chat
        requestId={openChatRequest.id}
        senderName={displayName}
        onBack={() => {
          setOpenChatRequest(null)
          fetchConversations()
        }}
      />
    )
  }

  const isAvailable = availableNow || availableTomorrow

  const verificationBadge = {
    non_verificato: { label: 'Non verificato', color: '#6b7280', bg: '#f3f4f6' },
    in_attesa: { label: 'In attesa di controllo', color: '#92400e', bg: '#fef3c7' },
    verificato: { label: '✓ Verificato', color: '#065f46', bg: '#d1fae5' },
    rifiutato: { label: 'Documento rifiutato, riprova', color: '#991b1b', bg: '#fee2e2' },
  }[verificationStatus] || { label: 'Non verificato', color: '#6b7280', bg: '#f3f4f6' }

  return (
    <div className="app-shell">
      <header className="pro-header">
        <div className="pro-header-center">
          <h1 className="form-title">LEST Pro</h1>
          <p className="form-sub">Ciao {displayName || 'Professionista'}!</p>
        </div>
      </header>

      {activeTab === 'home' && (
        <>
          <div className="toggle-row">
            <div>
              <div className="toggle-label">Disponibile subito</div>
              <div className="toggle-sub">Ricevi richieste urgenti</div>
            </div>
            <button
              className={availableNow ? 'toggle on' : 'toggle off'}
              onClick={toggleAvailableNow}
              aria-label="Disponibilità immediata"
            >
              <div className="toggle-dot" />
            </button>
          </div>

          <div className="toggle-row">
            <div>
              <div className="toggle-label">Disponibile domani</div>
              <div className="toggle-sub">Ricevi richieste programmate</div>
            </div>
            <button
              className={availableTomorrow ? 'toggle on' : 'toggle off'}
              onClick={toggleAvailableTomorrow}
              aria-label="Disponibilità domani"
            >
              <div className="toggle-dot" />
            </button>
          </div>

          <div className="pro-stat-row">
            <div className="pro-stat">
              <div className="pro-stat-num">{displayCategory || '—'}</div>
              <div className="pro-stat-label">Categoria</div>
            </div>
            <div className="pro-stat">
              <div className="pro-stat-num">{requests.length}</div>
              <div className="pro-stat-label">In attesa</div>
            </div>
          </div>

          <section className="section">
            <h2 className="section-title">Richieste entro {radiusKm} km</h2>

            {!isAvailable && (
              <p className="empty-text">
                Sei offline. Attiva almeno una disponibilità per vedere le richieste.
              </p>
            )}

            {isAvailable && loading && <p className="empty-text">Caricamento...</p>}

            {isAvailable && !loading && requests.length === 0 && (
              <p className="empty-text">Nessuna richiesta al momento. Torna più tardi.</p>
            )}

            {isAvailable &&
              !loading &&
              requests.map((req) => {
                const distance =
                  proLatitude && proLongitude && req.latitude && req.longitude
                    ? calculateDistanceKm(proLatitude, proLongitude, req.latitude, req.longitude)
                    : null

                return (
                  <div key={req.id} className="request-card">
                    <div className="req-top">
                      <div className="req-title">{req.description}</div>
                      <div className="badge badge-new">Nuova</div>
                    </div>
                    <div className="req-addr">{req.address}</div>
                    <div className="req-bottom">
                      <div className="req-price">Urgenza: {req.urgency}</div>
                      {distance !== null && (
                        <div className="req-price">{distance.toFixed(1)} km</div>
                      )}
                    </div>
                    <button className="btn-primary" onClick={() => handleAccept(req)}>
                      Accetta richiesta
                    </button>
                    <button className="btn-secondary" onClick={() => handleDecline(req)}>
                      Rifiuta
                    </button>
                  </div>
                )
              })}
          </section>
        </>
      )}

      {activeTab === 'storico' && (
        <section className="section">
          <h2 className="section-title">Lavori in corso</h2>

          {loadingJobs && <p className="empty-text">Caricamento...</p>}

          {!loadingJobs && myJobs.length === 0 && (
            <p className="empty-text">Non hai lavori in corso al momento.</p>
          )}

          {!loadingJobs &&
            myJobs.map((job) => (
              <div key={job.id} className="request-card">
                <div className="req-top">
                  <div className="req-title">{job.description}</div>
                </div>
                <div className="req-addr">{job.address}</div>
                <div className="req-bottom">
                  <div className="req-price">Cliente: {job.client_name}</div>
                </div>
                <button
                  className="btn-primary"
                  onClick={() => handleComplete(job)}
                >
                  Segna come completato
                </button>
              </div>
            ))}
        </section>
      )}

      {activeTab === 'chat' && (
        <section className="section">
          <h2 className="section-title">Chat</h2>

          {loadingConversations && <p className="empty-text">Caricamento...</p>}

          {!loadingConversations && conversations.length === 0 && (
            <p className="empty-text">Nessuna conversazione attiva al momento.</p>
          )}

          <div className="conversations-list">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                className="conversation-item"
                onClick={() => setOpenChatRequest(conv)}
              >
                <div className="conversation-avatar">
                  {conv.client_name?.charAt(0).toUpperCase()}
                </div>
                <div className="conversation-text">
                  <p className="conversation-name">{conv.client_name}</p>
                  <p className="conversation-last-msg">{conv.lastMessage}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'profilo' && (
        <section className="section profile-section">
          <div className="profile-banner">
            <div className="profile-avatar">
              {displayName?.charAt(0).toUpperCase()}
            </div>
            <div className="profile-banner-text">
              <p className="profile-banner-name">{displayName}</p>
              {emailInput && <p className="profile-banner-email">{emailInput}</p>}
            </div>
          </div>

          <div
            style={{
              display: 'inline-block',
              padding: '6px 14px',
              borderRadius: '999px',
              fontSize: '13px',
              fontWeight: 600,
              color: verificationBadge.color,
              backgroundColor: verificationBadge.bg,
              marginTop: '10px',
            }}
          >
            {verificationBadge.label}
          </div>

          <h2 className="section-title" style={{ marginTop: '20px' }}>Dati profilo</h2>

          <label className="form-label" style={{ display: 'block', marginBottom: '12px' }}>
            Nome
            <input
              className="form-input"
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
            />
          </label>

          <label className="form-label" style={{ display: 'block', marginBottom: '12px' }}>
            Categoria / lavoro
            <input
              className="form-input"
              type="text"
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value)}
            />
          </label>

          {profileMsg && (
            <p style={profileMsg === 'Salvato!' ? { color: '#065f46' } : undefined} className={profileMsg === 'Salvato!' ? '' : 'error-text'}>
              {profileMsg}
            </p>
          )}

          <button className="btn-primary" onClick={saveProfileInfo} disabled={savingProfile}>
            {savingProfile ? 'Salvo...' : 'Salva dati profilo'}
          </button>

          <label className="form-label" style={{ marginTop: '20px', display: 'block' }}>
            Raggio d'azione (km)
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <input
                className="form-input"
                type="number"
                min="1"
                max="200"
                value={radiusInput}
                onChange={(e) => setRadiusInput(e.target.value)}
              />
              <button className="btn-primary" onClick={saveRadius} disabled={savingRadius}>
                {savingRadius ? 'Salvo...' : 'Salva'}
              </button>
            </div>
          </label>

          <h2 className="section-title" style={{ marginTop: '24px' }}>Email e password</h2>

          <label className="form-label" style={{ display: 'block', marginBottom: '12px' }}>
            Email
            <input
              className="form-input"
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
            />
          </label>

          <label className="form-label" style={{ display: 'block', marginBottom: '12px' }}>
            Nuova password (lascia vuoto per non cambiarla)
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={newPasswordInput}
              onChange={(e) => setNewPasswordInput(e.target.value)}
            />
          </label>

          {accountMsg && <p className="empty-text">{accountMsg}</p>}

          <button className="btn-primary" onClick={saveAccountInfo} disabled={savingAccount}>
            {savingAccount ? 'Salvo...' : 'Salva email/password'}
          </button>

          <h2 className="section-title" style={{ marginTop: '24px' }}>Verifica identità</h2>
          <p className="empty-text" style={{ marginBottom: '10px' }}>
            Carica una foto della tua carta d'identità o patente. La controlleremo manualmente
            e, se tutto è in regola, il tuo profilo avrà il badge "Verificato" visibile ai clienti.
          </p>

          {verificationMsg && <p className="empty-text">{verificationMsg}</p>}

          <label className="btn-secondary" style={{ display: 'inline-block', cursor: 'pointer', textAlign: 'center' }}>
            {uploadingDoc ? 'Carico...' : 'Carica documento'}
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={handleDocUpload}
              disabled={uploadingDoc}
              style={{ display: 'none' }}
            />
          </label>

          <button className="logout-btn" onClick={handleLogout} style={{ marginTop: '28px' }}>
            Esci
          </button>
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
