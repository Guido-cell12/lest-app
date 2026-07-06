import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient.js'
import './Chat.css'

const blockedWords = [
  'whatsapp', 'telegram', 'instagram', 'facebook', 'sms',
  'chiamami', 'chiamami al', 'numero di telefono', 'il mio numero',
  'fuori dall\'app', 'contattami su', 'scrivimi su',
]

function containsPhoneNumber(text) {
  // Rileva sequenze di almeno 6 cifre consecutive (anche con spazi, punti o trattini in mezzo)
  const digitsOnly = text.replace(/[\s.\-]/g, '')
  const numberPattern = /\d{6,}/
  return numberPattern.test(digitsOnly)
}

function containsBlockedContent(text) {
  const lowerText = text.toLowerCase()

  if (containsPhoneNumber(text)) {
    return true
  }

  return blockedWords.some((word) => lowerText.includes(word))
}

function Chat({ requestId, senderName, onBack }) {
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [loadError, setLoadError] = useState('')
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
    setLoadError('')
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Errore caricamento messaggi:', error)
        setLoadError('Non riusciamo a caricare i messaggi. Riprova.')
      } else {
        setMessages(data)
      }
    } catch (err) {
      console.error('Errore di rete:', err)
      setLoadError('Problema di connessione. Controlla la rete.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSend(e) {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    const textToSend = newMessage.trim()

    if (containsBlockedContent(textToSend)) {
      setSendError('Per la tua sicurezza, non è possibile condividere contatti o numeri di telefono in chat. Tutta la comunicazione deve avvenire tramite LEST.')
      return
    }

    setSending(true)
    setSendError('')

    try {
      const { error } = await supabase.from('messages').insert({
        request_id: requestId,
        sender_name: senderName,
        content: textToSend,
      })

      if (error) {
        console.error('Errore invio messaggio:', error)
        setSendError('Messaggio non inviato. Riprova.')
      } else {
        setNewMessage('')
      }
    } catch (err) {
      console.error('Errore di rete:', err)
      setSendError('Problema di connessione. Il messaggio non è stato inviato.')
    } finally {
      setSending(false)
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

        {loadError && (
          <div className="chat-error-banner">
            {loadError}
            <button onClick={fetchMessages} className="chat-retry-btn">Riprova</button>
          </div>
        )}

        {!loading && !loadError && messages.length === 0 && (
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

      {sendError && (
        <div className="chat-send-error">
          {sendError}
        </div>
      )}

      <form className="chat-input-bar" onSubmit={handleSend}>
        <input
          type="text"
          className="chat-input"
          placeholder="Scrivi un messaggio..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          disabled={sending}
        />
        <button type="submit" className="chat-send-btn" aria-label="Invia" disabled={sending}>
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