import { useState, useEffect } from 'react'
import Login from './Login.jsx'
import RequestForm from './RequestForm.jsx'
import ProDashboard from './ProDashboard.jsx'
import Chat from './Chat.jsx'
import { supabase } from './supabaseClient.js'
import './App.css'

const categories = [
  { id: 'idraulico', name: 'Idraulico', available: 3 },
  { id: 'elettricista', name: 'Elettricista', available: 5 },
  { id: 'imbianchino', name: 'Imbianchino', available: 2 },
  { id: 'muratore', name: 'Muratore', available: 1 },
]

function App() {
  const [user, setUser] = useState(null) // { type: 'client' | 'pro', ...dati }
  const [activeTab, setActiveTab] = useState('home')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [myRequests, setMyRequests] = useState([])
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [openChatRequest, setOpenChatRequest] = useState(null)

  function handleLoginClient(data) {
    setUser({ type: 'client', ...data })
  }

  function handleLoginPro(data) {
    setUser({ type: 'pro', ...data })
  }

  function handleLogout() {
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

  return (
    <div className="app-shell">
      <header className="header">
        <h1 className="logo">LEST</h1>
        <p className="tagline">Ciao {user.name}, di cosa hai bisogno?</p>
      </header>

      {activeTab === 'home' && (
        <>
          <div className="search-bar">
            <span>Di cosa hai bisogno?</span>
          </div>

          <section className="section">
            <h2 className="section-title">Categorie</h2>
            <div className="cat-grid">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  className="cat-card"
                  onClick={() => setSelectedCategory(cat)}
                >
                  <span className="cat-name">{cat.name}</span>
                  <span className="cat-available">{cat.available} disponibili</span>
                </button>
              ))}
            </div>
          </section>

          <section className="section map-section">
            <span className="map-text">Milano, Lombardia</span>
          </section>

          <button className="pro-mode-link" onClick={handleLogout}>
            Esci
          </button>
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