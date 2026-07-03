import { useState, useEffect } from 'react'
import Login from './Login.jsx'
import RequestForm from './RequestForm.jsx'
import ProDashboard from './ProDashboard.jsx'
import Chat from './Chat.jsx'
import { supabase } from './supabaseClient.js'
import './App.css'

// Categorie di riserva se il database è vuoto
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !user) {
        const googleUser = session.user
        setUser({
          type: 'client',
          name: googleUser.user_metadata?.full_name || googleUser.email,
          email: googleUser.email,
        })
      }
    })
  }, [])

  // Carica le categorie reali dal database (professionisti registrati)
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

      // Conta quanti professionisti per categoria
      const counts = {}
      data.forEach((row) => {
        const cat = row.category.trim()
        if (cat) {
          counts[cat] = (counts[cat] || 0) + 1
        }
      })

      // Trasforma in lista ordinata per numero di professionisti (decrescente)
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

  // Carica lo storico richieste del cliente quando apre la tab "Storico"
  useEffect(() => {
    if (user && user.type === 'client' && activeTab === 'storico') {
      fetchMyRequests()
    }
  }, [activeTab, user])

  async function fetchMyRequests() {
    setLoadingRequests(true)
    const { data, error } = await supabase
      .from('requests')
      .select('*')
      .eq('client_name', user.name)
      .order('id', { ascending: false })

    if (error) {
      console.error('Errore caricamento richieste:', error)
    } else {
      setMyRequests(data)
    }
    setLoadingRequests(false)
  }

  if (!user) {
    return <Login onLoginClient={handleLoginClient} onLoginPro={handleLoginPro} />
  }

  if (user.type === 'pro') {
    return <ProDashboard proName={user.name} proCategory={user.category} onBack={handleLogout} />
  }

  if (selectedCategory) {
    return (
      <RequestForm
        category={selectedCategory}
        clientName={user.name}
        onBack={() => setSelectedCategory(null)}
      />
    )
  }

  // Se il cliente ha aperto una chat da una richiesta nello storico
  if (openChatRequest) {
    return (
      <Chat
        requestId={openChatRequest.id}
        senderName={user.name}
        onBack={() => setOpenChatRequest(null)}
      />
    )
  }

  // Le categorie da mostrare: prime 8, o tutte se espanso
  const visibleCategories = showAllCategories ? categories : categories.slice(0, 8)

  return (
    <div className="app-shell">
      <header className="header">
        <h1 className="logo">LEST</h1>
        <p className="tagline">Ciao {user.name}!</p>
      </header>

      {activeTab === 'home' && (
        <>
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
            <h2 className="section-title">Categorie</h2>
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

            {categories.length > 8 && (
              <button
                className="see-all-btn"
                onClick={() => setShowAllCategories(!showAllCategories)}
              >
                {showAllCategories ? 'Mostra meno' : 'Vedi tutte le categorie'}
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
            {myRequests.map((req) => (
              <div key={req.id} className="request-card">
                <div className="request-info">
                  <strong>{req.category}</strong>
                  <p>{req.description}</p>
                  <span className="request-status">Stato: {req.status}</span>
                </div>

                {req.status === 'accettata' && (
                  <button
                    className="open-chat-btn"
                    onClick={() => setOpenChatRequest(req)}
                  >
                    Apri chat con il professionista
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'profilo' && (
        <section className="section">
          <h2 className="section-title">Profilo</h2>
          <div className="profile-info">
            <p className="profile-name">{user.name}</p>
            {user.email && <p className="profile-email">{user.email}</p>}
            {user.isGuest && <p className="profile-guest">Stai usando LEST come ospite</p>}
          </div>
          <button className="pro-mode-link" onClick={handleLogout}>
            Esci
          </button>
        </section>
      )}

      <nav className="bottom-nav">
        <button
          className={activeTab === 'home' ? 'nav-item active' : 'nav-item'}
          onClick={() => setActiveTab('home')}
        >
          Home
        </button>
        <button
          className={activeTab === 'storico' ? 'nav-item active' : 'nav-item'}
          onClick={() => setActiveTab('storico')}
        >
          Storico
        </button>
        <button
          className={activeTab === 'chat' ? 'nav-item active' : 'nav-item'}
          onClick={() => setActiveTab('chat')}
        >
          Chat
        </button>
        <button
          className={activeTab === 'profilo' ? 'nav-item active' : 'nav-item'}
          onClick={() => setActiveTab('profilo')}
        >
          Profilo
        </button>
      </nav>
    </div>
  )
}

export default App