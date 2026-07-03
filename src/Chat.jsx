import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient.js'
import './Chat.css'

function Chat({ requestId, senderName, onBack }) {
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef(null)

  useEffect(() => {
    fetchMessages()

    const channel = supabase
      .channel(`messages-request-${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `request_id=eq.${requestId}`,
        },
        (payload) => {
          setMessages((current) => [...current, payload.new])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [requestId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function fetchMessages() {
    setLoading(true)
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Errore caricamento messaggi:', error)
    } else {
      setMessages(data)
    }
    setLoading(false)
  }

  async function handleSend(e) {
    e.preventDefault()
    if (!newMessage.trim()) return

    const { error } = await supabase.from('messages').insert({
      request_id: requestId,
      sender_name: senderName,
      content: newMessage.trim(),
    })

    if (error) {
      console.error('Errore invio messaggio:', error)
    } else {
      setNewMessage('')
    }
  }

  function formatTime(timestamp) {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="chat-shell">
      <header className="chat-header">
        <button className="chat-back-btn" onClick={onBack} aria-label="Indietro">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="chat-header-avatar">
          {senderName?.charAt(0).toUpperCase()}
        </div>
        <div className="chat-header-info">
          <h2 className="chat-title">Chat richiesta</h2>
          <span className="chat-subtitle">Online</span>
        </div>
      </header>

      <div className="chat-messages">
        {loading && <p className="chat-loading">Caricamento messaggi...</p>}

        {!loading && messages.length === 0 && (
          <p className="chat-empty">Nessun messaggio ancora. Scrivi il primo!</p>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={
              msg.sender_name === senderName
                ? 'chat-bubble chat-bubble-mine'
                : 'chat-bubble chat-bubble-theirs'
            }
          >
            {msg.sender_name !== senderName && (
              <span className="chat-bubble-sender">{msg.sender_name}</span>
            )}
            <p className="chat-bubble-text">{msg.content}</p>
            <span className="chat-bubble-time">{formatTime(msg.created_at)}</span>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      <form className="chat-input-bar" onSubmit={handleSend}>
        <input
          type="text"
          className="chat-input"
          placeholder="Scrivi un messaggio..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <button type="submit" className="chat-send-btn" aria-label="Invia">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </div>
  )
}

export default Chat