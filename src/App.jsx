import { useState, useEffect } from 'react'
import Login from './Login.jsx'
import RequestForm from './RequestForm.jsx'
import ProDashboard from './ProDashboard.jsx'
import Chat from './Chat.jsx'
import { supabase } from './supabaseClient.js'
import './App.css'

const fallbackCategories = [
  { id: 'idraulico', name: 'Idraulico', available: 0 },
  { id: 'elettricista', name: 'Elettricista', available: 0 },
  { id: 'imbianchino', name: 'Imbianchino', available: 0 },
  { id: 'muratore', name: 'Muratore', available: 0 },
]

function App() {
  const [user, setUser] = useState(() => {
    const savedGuest = localStorage.getItem('lest_guest_user')
    if (savedGuest) {
      return { type: 'client', ...JSON.parse(savedGuest) }
    }
    return null
  })
  const [activeTab, setActiveTab] = useState('home')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [myRequests, setMyRequests] = useState([])
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [openChatRequest, setOpenChatRequest] = useState(null)
  const [categories, setCategories] = useState([])
  const [showAllCategories, setShowAllCategories] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [conversations, setConversations] = useState([])
  const [loadingConversations, setLoadingConversations] = useState(false)
  const [urgencyMode, setUrgencyMode] = useState('immediate')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !user) {
        const googleUser = session.user
        setUser({
          type: 'client',
          id: googleUser.id,
          name: googleUser.user_metadata?.full_name || googleUser.email,
          email: googleUser.email,
        })
      }
    })
  }, [])

  useEffect(() => {
    async function fetchCategories() {
      const { data, error } = await supabase
        .from('users')
        .select('category')
        .eq('type', 'pro')
        .not('category', 'is', null)

      if (error || !data || data.length === 0) {
        setCategories(fallbackCategories)
        return
      }

      const counts = {}
      data.forEach((row) => {
        const cat = row.category.trim()
        if (cat) {
          counts[cat] = (counts[cat] || 0) + 1
        }
      })

      const list = Object.entries(counts)
        .map(([name, count]) => ({
          id: name.toLowerCase(),
          name,
          available: count,
        }))
        .sort((a, b) => b.available - a.available)

      setCategories(list)
    }

    fetchCategories()
  }, [])

  function handleVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      alert('La dettatura vocale non è supportata su questo browser. Prova con Chrome.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'it-IT'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      const spokenText = event.results[0][0].transcript
      setSearchText(spokenText)
    }

    recognition.onerror = () => {
      alert('Non sono riuscito a sentirti bene, riprova.')
    }

    recognition.start()
  }

  function handleLoginClient(data) {
    setUser({ type: 'client', ...data })
  }

  function handleLoginPro(data) {
    setUser({ type: 'pro', ...data })
  }

  async function handleLogout() {
    localStorage.removeItem('lest_guest_user')
    await supabase.auth.signOut()
    setUser(null)
    setSelectedCategory(null)
    setActiveTab('home')
    setMyRequests([])
    setOpenChatRequest(null)
  }

  useEffect(() => {
    if (user && user.type === 'client' && activeTab === 'storico') {
      fetchMyRequests()
    }
  }, [activeTab, user])

  useEffect(() => {
    if (user && user.type === 'client' && activeTab === 'chat') {
      fetchConversations()
    }
  }, [activeTab, user])

  async function fetchMyRequests() {
    setLoadingRequests(true)
    const { data, error } = await supabase
      .from('requests')
      .select('*')
      .eq('client_id', user.id)
      .order('id', { ascending: false })

    if (error) {
      console.error('Errore caricamento richieste:', error)
    } else {
      setMyRequests(data)
    }
    setLoadingRequests(false)
  }

  async function fetchConversations() {
    setLoadingConversations(true)

    const { data: acceptedRequests, error } = await supabase
      .from('requests')
      .select('*')
      .eq('client_id', user.id)
      .eq('status', 'accettata')
      .order('id', { ascending: false })

    if (error || !acceptedRequests) {
      setLoadingConversations(false)
      return
    }

    const withDetails = await Promise.all(
      acceptedRequests.map(async (req) => {
        const { data: lastMsg } = await supabase
          .from('messages')
          .select('*')
          .eq('request_id', req.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        let proName = req.category

        if (req.accepted_by) {
          const { data: proData } = await supabase
            .from('users')
            .select('name')
            .eq('id', req.accepted_by)
            .maybeSingle()

          if (proData?.name) {
            proName = proData.name
          }
        }

        return {
          ...req,
          proName,
          lastMessage: lastMsg?.content || 'Nessun messaggio ancora',
        }
      })
    )

    setConversations(withDetails)
    setLoadingConversations(false)
  }

  if (!user) {
    return <Login onLoginClient={handleLoginClient} onLoginPro={handleLoginPro} />
  }

  if (user.type === 'pro') {
    return (
      <ProDashboard
        proId={user.id}
        proName={user.name}
        proCategory={user.category}
        onBack={handleLogout}
      />
    )
  }

  if (selectedCategory) {
    return (
      <RequestForm
        category={selectedCategory}
        clientName={user.name}
        clientId={user.id}
        urgencyMode={urgencyMode}
        onBack={() => setSelectedCategory(null)}
      />
    )
  }

  if (openChatRequest) {
    return (
      <Chat
        requestId={openChatRequest.id}
        senderName={user.name}
        onBack={() => setOpenChatRequest(null)}
      />
    )
  }

  const filteredCategories = searchText.trim()
    ? categories.filter((cat) =>
        cat.name.toLowerCase().includes(searchText.trim().toLowerCase())
      )
    : categories

  const visibleCategories = showAllCategories ? filteredCategories : filteredCategories.slice(0, 8)

  return (
    <div className="app-shell">
      <header className="header">
        <h1 className="logo">LEST</h1>
        <p className="tagline">Ciao {user.name}!</p>
      </header>

      {activeTab === 'home' && (
        <>
          <div className="urgency-toggle">
            <button
              className={urgencyMode === 'immediate' ? 'urgency-option active-immediate' : 'urgency-option'}
              onClick={() => setUrgencyMode('immediate')}
            >
              Immediato
            </button>
            <button
              className={urgencyMode === 'tomorrow' ? 'urgency-option active-tomorrow' : 'urgency-option'}
              onClick={() => setUrgencyMode('tomorrow')}
            >
              Domani
            </button>
          </div>

          {urgencyMode === 'immediate' ? (
            <p className="urgency-note urgency-note-immediate">
              Intervento immediato
            </p>
          ) : (
            <p className="urgency-note urgency-note-tomorrow">
              Intervento programmato per domani
            </p>
          )}

          <div className="search-bar">
            <input
              type="text"
              className="search-input"
              placeholder="Descrivi il tuo problema"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <button
              type="button"
              className="mic-btn"
              onClick={handleVoiceInput}
              aria-label="Detta il problema a voce"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                <path d="M19 10v2a7 7 0 01-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </button>
          </div>

          <section className="section">
            <h2 className="section-title">
              {searchText.trim() ? `Risultati per "${searchText}"` : 'Categorie'}
            </h2>

            {searchText.trim() && visibleCategories.length === 0 && (
              <p className="empty-text">Nessuna categoria trovata. Prova un altro termine.</p>
            )}

            <div className="cat-grid">
              {visibleCategories.map((cat) => (
                <button
                  key={cat.id}
                  className="cat-card"
                  onClick={() => setSelectedCategory(cat)}
                >
                  <span className="cat-name">{cat.name}</span>
                  <span className="cat-available">
                    {cat.available} {cat.available === 1 ? 'disponibile' : 'disponibili'}
                  </span>
                </button>
              ))}
            </div>

            {!searchText.trim() && categories.length > 8 && (
              <button
                className="see-all-btn"
                onClick={() => setShowAllCategories(!showAllCategories)}
              >
                {showAllCategories ? 'Mostra meno' : 'Vedi tutte le categorie'}
              </button>
            )}

            {searchText.trim() && (
              <button
                className="see-all-btn"
                onClick={() => setSearchText('')}
              >
                Cancella ricerca
              </button>
            )}
          </section>
        </>
      )}

      {activeTab === 'storico' && (
        <section className="section">
          <h2 className="section-title">Le tue richieste</h2>

          {loadingRequests && <p>Caricamento...</p>}

          {!loadingRequests && myRequests.length === 0 && (
            <p>Non hai ancora nessuna richiesta.</p>
          )}

          <div className="requests-list">
            {myRequests.map((req) => {
              const statusLabel =
                req.status === 'in_attesa' ? 'In attesa' :
                req.status === 'accettata' ? 'In corso' :
                req.status === 'completata' ? 'Completata' :
                req.status

              const statusClass =
                req.status === 'in_attesa' ? 'status-pending' :
                req.status === 'accettata' ? 'status-progress' :
                req.status === 'completata' ? 'status-done' :
                ''

              return (
                <div key={req.id} className="request-card">
                  <div className="request-info">
                    <strong>{req.category}</strong>
                    <p>{req.description}</p>
                    <span className={`request-status ${statusClass}`}>{statusLabel}</span>
                  </div>
                </div>
              )
            })}
          </div>
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
                  {conv.proName?.charAt(0).toUpperCase()}
                </div>
                <div className="conversation-text">
                  <p className="conversation-name">{conv.proName}</p>
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
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="profile-banner-text">
              <p className="profile-banner-name">{user.name}</p>
              {user.email && <p className="profile-banner-email">{user.email}</p>}
            </div>
          </div>

          <div className="profile-menu">
            <button className="profile-menu-item" onClick={() => setActiveTab('storico')}>
              Le mie richieste
            </button>
            <button className="profile-menu-item">
              I miei dati
            </button>
            <button className="profile-menu-item">
              Assistenza
            </button>
            <button className="profile-menu-item">
              Info su LEST
            </button>
          </div>

          <button className="logout-btn" onClick={handleLogout}>
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

export default App