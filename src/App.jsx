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

const categoryKeywords = {
  idraulico: ['acqua', 'perdita', 'perde', 'rubinetto', 'tubo', 'tubi', 'scarico', 'lavandino', 'wc', 'water', 'doccia', 'bagno', 'sifone', 'caldaia', 'scaldabagno', 'allagamento', 'gocciola', 'rubinetteria', 'sciacquone', 'vasca', 'boiler', 'autoclave', 'tubatura', 'tubature', 'fognatura', 'scarichi otturati', 'lavatrice non scarica'],
  elettricista: ['corrente', 'luce', 'luci', 'presa', 'prese', 'interruttore', 'quadro', 'elettrico', 'scintille', 'corto', 'cortocircuito', 'lampadina', 'salvavita', 'contatore', 'cavo', 'cavi', 'impianto elettrico', 'blackout', 'fusibile', 'differenziale', 'plafoniera', 'lampadario', 'presa non funziona', 'manca la corrente'],
  imbianchino: ['pittura', 'vernice', 'muro', 'muri', 'parete', 'pareti', 'imbiancare', 'colore', 'macchia', 'umidita', 'umidità', 'crepe', 'intonaco', 'soffitto', 'tinteggiatura', 'ridipingere', 'muffa'],
  muratore: ['crepa', 'crepe', 'cemento', 'mattoni', 'muratura', 'costruzione', 'ristrutturazione', 'pavimento', 'piastrelle', 'demolizione', 'fondamenta', 'intonaco', 'massetto', 'parete crollata', 'lavori edili'],
  falegname: ['legno', 'porta', 'porte', 'finestra', 'finestre', 'mobile', 'mobili', 'armadio', 'cassetto', 'serratura', 'cerniera', 'parquet', 'infisso', 'infissi', 'anta', 'ante', 'scaffale', 'libreria in legno'],
  giardiniere: ['giardino', 'erba', 'prato', 'siepe', 'siepi', 'albero', 'alberi', 'piante', 'potatura', 'irrigazione', 'erbaccia', 'foglie', 'tosaerba', 'potare', 'taglio erba', 'giardinaggio'],
  fabbro: ['serratura', 'chiave', 'chiavi', 'porta blindata', 'cancello', 'grata', 'inferriata', 'lucchetto', 'chiuso fuori', 'porta bloccata', 'serranda', 'zanzariera in ferro', 'ringhiera'],
  'tecnico climatizzatori': ['condizionatore', 'clima', 'climatizzatore', 'aria condizionata', 'split', 'non raffredda', 'non riscalda', 'pompa di calore', 'gas refrigerante', 'filtro condizionatore'],
  'tecnico elettrodomestici': ['lavatrice', 'lavastoviglie', 'frigorifero', 'frigo', 'forno', 'asciugatrice', 'piano cottura', 'elettrodomestico', 'non si accende', 'non funziona il forno', 'congelatore'],
  antennista: ['antenna', 'tv', 'televisione', 'segnale', 'digitale terrestre', 'parabola', 'decoder', 'nessun segnale'],
  vetraio: ['vetro', 'vetri', 'finestra rotta', 'specchio', 'doppio vetro', 'vetro rotto', 'vetrata'],
  tappezziere: ['divano', 'poltrona', 'tappezzeria', 'imbottitura', 'fodera', 'materasso', 'rivestimento'],
  piastrellista: ['piastrelle', 'pavimento rotto', 'rivestimento bagno', 'mattonelle', 'fughe', 'ceramica'],
  disinfestatore: ['insetti', 'blatte', 'scarafaggi', 'topi', 'ratti', 'zanzare', 'formiche', 'tarli', 'vespe', 'calabroni', 'disinfestazione', 'derattizzazione', 'nido di vespe'],
  traslocatore: ['trasloco', 'traslochi', 'trasporto mobili', 'spostamento casa', 'imballaggio'],
  'tecnico allarmi': ['allarme', 'antifurto', 'telecamera', 'telecamere', 'videosorveglianza', 'sensore', 'sistema di sicurezza'],
  tendaggi: ['tenda', 'tende', 'tapparella', 'tapparelle', 'avvolgibile', 'zanzariera', 'zanzariere', 'veneziana', 'persiana', 'persiane'],
  spurghista: ['spurgo', 'pozzo nero', 'fossa biologica', 'tubature intasate', 'disotturazione', 'autospurgo'],
}

function getCategoryScore(category, searchText) {
  const text = searchText.toLowerCase()
  const catKey = category.id.toLowerCase()
  let score = 0

  if (category.name.toLowerCase().includes(text) || text.includes(category.name.toLowerCase())) {
    score += 10
  }

  const keywords = categoryKeywords[catKey] || []
  keywords.forEach((keyword) => {
    if (text.includes(keyword)) {
      score += 5
    }
  })

  return score
}

const MAX_VISIBLE_CATEGORIES = 5

// Schermata mostrata SOLO al primo accesso con Google, dopo il redirect di
// ritorno, quando ancora non esiste una riga per questo utente nella tabella
// "users". Chiede la posizione qui (il momento giusto, a pagina già caricata)
// e poi crea il profilo su Supabase.
function GoogleLocationSetup({ pendingUser, onComplete }) {
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)

  function handleAllow() {
    setErrorMsg('')
    setLoading(true)

    if (!navigator.geolocation) {
      setErrorMsg('Il tuo browser non supporta la geolocalizzazione.')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude
        const longitude = position.coords.longitude

        const { error } = await supabase.from('users').insert({
          id: pendingUser.id,
          type: 'client',
          name: pendingUser.name,
          email: pendingUser.email,
          latitude,
          longitude,
        })

        if (error) {
          console.error('Errore creazione profilo Google:', error)
          setErrorMsg('Non siamo riusciti a creare il tuo profilo. Riprova.')
          setLoading(false)
          return
        }

        onComplete({
          type: 'client',
          id: pendingUser.id,
          name: pendingUser.name,
          email: pendingUser.email,
          latitude,
          longitude,
        })
      },
      () => {
        setErrorMsg('Devi consentire l\'accesso alla posizione per usare LEST. Controlla le impostazioni del sito nel tuo browser (icona lucchetto nella barra degli indirizzi).')
        setLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return (
    <div className="app-shell">
      <div className="welcome-screen">
        <h1 className="welcome-logo">LEST</h1>
        <p className="welcome-tagline-big">Ultimo passo{pendingUser.name ? `, ${pendingUser.name.split(' ')[0]}` : ''}</p>
        <p className="location-note">
          LEST ha bisogno della tua posizione per trovare i professionisti vicino a te.
        </p>

        {errorMsg && <p className="error-text">{errorMsg}</p>}

        <div className="welcome-buttons">
          <button className="welcome-btn primary" onClick={handleAllow} disabled={loading}>
            {loading ? 'Rilevamento posizione...' : 'Consenti posizione e continua'}
          </button>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [user, setUser] = useState(() => {
    const savedGuest = localStorage.getItem('lest_guest_user')
    if (savedGuest) {
      return { type: 'client', ...JSON.parse(savedGuest) }
    }
    return null
  })
  const [pendingGoogleSetup, setPendingGoogleSetup] = useState(null)
  const [activeTab, setActiveTab] = useState('home')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [myRequests, setMyRequests] = useState([])
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [openChatRequest, setOpenChatRequest] = useState(null)
  const [categories, setCategories] = useState([])
  const [searchText, setSearchText] = useState('')
  const [conversations, setConversations] = useState([])
  const [loadingConversations, setLoadingConversations] = useState(false)
  const [urgencyMode, setUrgencyMode] = useState('immediate')
  const [showAllCategoriesScreen, setShowAllCategoriesScreen] = useState(false)
  const [categorySearchText, setCategorySearchText] = useState('')

  useEffect(() => {
    async function checkGoogleSession() {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session || user) return

      const authUser = session.user

      // Le sessioni ospite (auth anonima) sono già gestite tramite
      // localStorage all'avvio del componente: qui ci occupiamo solo
      // del ritorno da un login Google vero e proprio.
      if (authUser.is_anonymous) return

      const { data: existingUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle()

      if (error) {
        console.error('Errore controllo profilo Google:', error)
        return
      }

      if (existingUser) {
        // Utente Google che rientra: carichiamo tutto quello che avevamo
        // già salvato, posizione inclusa.
        if (existingUser.type === 'pro') {
          setUser({
            type: 'pro',
            id: existingUser.id,
            name: existingUser.name,
            email: existingUser.email,
            category: existingUser.category,
            latitude: existingUser.latitude,
            longitude: existingUser.longitude,
            serviceRadiusKm: existingUser.service_radius_km,
          })
        } else {
          setUser({
            type: 'client',
            id: existingUser.id,
            name: existingUser.name,
            email: existingUser.email,
            latitude: existingUser.latitude,
            longitude: existingUser.longitude,
          })
        }
      } else {
        // Primo accesso con Google: il profilo non esiste ancora.
        // Mostriamo la schermata "ultimo passo" per chiedere la posizione
        // e creare la riga su Supabase.
        setPendingGoogleSetup({
          id: authUser.id,
          name: authUser.user_metadata?.full_name || authUser.email,
          email: authUser.email,
        })
      }
    }

    checkGoogleSession()
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
    setPendingGoogleSetup(null)
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

  if (pendingGoogleSetup) {
    return (
      <GoogleLocationSetup
        pendingUser={pendingGoogleSetup}
        onComplete={(finalUser) => {
          setUser(finalUser)
          setPendingGoogleSetup(null)
        }}
      />
    )
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
        proLatitude={user.latitude}
        proLongitude={user.longitude}
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
        clientLatitude={user.latitude}
        clientLongitude={user.longitude}
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
        onBack={() => {
          setOpenChatRequest(null)
          fetchConversations()
        }}
      />
    )
  }

  if (showAllCategoriesScreen) {
    const filtered = categorySearchText.trim()
      ? categories.filter((cat) =>
          cat.name.toLowerCase().includes(categorySearchText.trim().toLowerCase())
        )
      : categories

    return (
      <div className="app-shell">
        <header className="form-header">
          <button
            className="back-btn"
            onClick={() => {
              setShowAllCategoriesScreen(false)
              setCategorySearchText('')
            }}
          >
            ← Indietro
          </button>
          <h1 className="form-title">Tutte le categorie</h1>
        </header>

        <div className="section" style={{ paddingTop: '12px' }}>
          <div className="search-bar">
            <span className="search-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              className="search-input"
              placeholder="Cerca una categoria"
              value={categorySearchText}
              onChange={(e) => setCategorySearchText(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="section">
          <div className="category-rows">
            {filtered.length === 0 && (
              <p className="empty-text">Nessuna categoria trovata.</p>
            )}
            {filtered.map((cat) => (
              <button
                key={cat.id}
                className="category-row"
                onClick={() => {
                  setSelectedCategory(cat)
                  setShowAllCategoriesScreen(false)
                  setCategorySearchText('')
                }}
              >
                <span className="category-row-name">{cat.name}</span>
                <span className="category-row-count">
                  {cat.available} {cat.available === 1 ? 'disponibile' : 'disponibili'}
                </span>
              </button>
            ))}
          </div>
        </div>

        <nav className="bottom-nav">
          <button
            className={activeTab === 'home' ? 'nav-item active' : 'nav-item'}
            onClick={() => {
              setShowAllCategoriesScreen(false)
              setCategorySearchText('')
              setActiveTab('home')
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span>Home</span>
          </button>
          <button
            className={activeTab === 'storico' ? 'nav-item active' : 'nav-item'}
            onClick={() => {
              setShowAllCategoriesScreen(false)
              setCategorySearchText('')
              setActiveTab('storico')
            }}
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
            onClick={() => {
              setShowAllCategoriesScreen(false)
              setCategorySearchText('')
              setActiveTab('chat')
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
            </svg>
            <span>Chat</span>
          </button>
          <button
            className={activeTab === 'profilo' ? 'nav-item active' : 'nav-item'}
            onClick={() => {
              setShowAllCategoriesScreen(false)
              setCategorySearchText('')
              setActiveTab('profilo')
            }}
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

  const filteredHomeCategories = searchText.trim()
    ? categories
        .map((cat) => ({ ...cat, score: getCategoryScore(cat, searchText.trim()) }))
        .filter((cat) => cat.score > 0)
        .sort((a, b) => b.score - a.score)
    : categories

  const visibleCategories = filteredHomeCategories.slice(0, MAX_VISIBLE_CATEGORIES)

  return (
    <div className="app-shell">
      <header className="header">
        <h1 className="logo">LEST</h1>
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
            <span className="search-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
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
            <p className="section-subtitle">
              {searchText.trim() ? `Categorie che corrispondono a "${searchText}"` : 'Oppure scegli una categoria'}
            </p>

            {searchText.trim() && visibleCategories.length === 0 && (
              <p className="empty-text">Nessuna categoria trovata per questa ricerca.</p>
            )}

            <div className="category-rows">
              {visibleCategories.map((cat) => (
                <button
                  key={cat.id}
                  className="category-row"
                  onClick={() => setSelectedCategory(cat)}
                >
                  <span className="category-row-name">{cat.name}</span>
                  <span className="category-row-count">
                    {cat.available} {cat.available === 1 ? 'disponibile' : 'disponibili'}
                  </span>
                </button>
              ))}
            </div>

            {!searchText.trim() && categories.length > MAX_VISIBLE_CATEGORIES && (
              <button
                className="see-all-btn"
                onClick={() => setShowAllCategoriesScreen(true)}
              >
                Mostra tutte
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
