import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient.js'
import Chat from './Chat.jsx'
import './ProDashboard.css'

function ProDashboard({ proId, proName, proCategory, onBack }) {
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

  // Carica lo stato di disponibilità salvato del professionista
  useEffect(() => {
    async function loadAvailability() {
      if (!proId) return
      const { data } = await supabase
        .from('users')
        .select('available_now, available_tomorrow')
        .eq('id', proId)
        .single()

      if (data) {
        setAvailableNow(data.available_now ?? true)
        setAvailableTomorrow(data.available_tomorrow ?? true)
      }
    }
    loadAvailability()
  }, [proId])

  async function toggleAvailableNow() {
    const newValue = !availableNow
    setAvailableNow(newValue)
    if (proId) {
      await supabase.from('users').update({ available_now: newValue }).eq('id', proId)
    }
  }

  async function toggleAvailableTomorrow() {
    const newValue = !availableTomorrow
    setAvailableTomorrow(newValue)
    if (proId) {
      await supabase.from('users').update({ available_tomorrow: newValue }).eq('id', proId)
    }
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
      setRequests(data)
    }
    setLoading(false)
  }

  useEffect(() => {
  if (availableNow || availableTomorrow) {
    loadRequests()
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [availableNow, availableTomorrow])

// Ascolta in tempo reale gli aggiornamenti sulle richieste
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
        // Se una richiesta è stata accettata (da chiunque), toglila dalla lista in attesa
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
        // Se arriva una nuova richiesta in attesa della categoria giusta, aggiungila
        if (newReq.status === 'in_attesa' && (!proCategory || newReq.category === proCategory)) {
          setRequests((prev) => [newReq, ...prev])
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [proCategory])
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
  const { error } = await supabase
    .from('requests')
    .update({ status: 'accettata', accepted_by: proId })
    .eq('id', request.id)

  if (!error) {
    setAcceptedJob(request)
    setRequests((prev) => prev.filter((r) => r.id !== request.id))
  }
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
        senderName={proName}
        onBack={() => setOpenChatRequest(null)}
      />
    )
  }

  const isAvailable = availableNow || availableTomorrow

  return (
    <div className="app-shell">
      <header className="pro-header">
  <div className="pro-header-center">
    <h1 className="form-title">LEST Pro</h1>
    <p className="form-sub">Ciao {proName || 'Professionista'}!</p>
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