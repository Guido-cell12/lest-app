import { useState } from 'react'
import Login from './Login.jsx'
import RequestForm from './RequestForm.jsx'
import ProDashboard from './ProDashboard.jsx'
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

  return (
    <div className="app-shell">
      <header className="header">
        <h1 className="logo">LEST</h1>
        <p className="tagline">Ciao {user.name}, di cosa hai bisogno?</p>
      </header>

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
