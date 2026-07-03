import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient.js'
import './Chat.css'

function Chat({ requestId, senderName, onBack }) {
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef(null)

  // Carica i messaggi esistenti e si iscrive agli aggiornamenti in tempo reale
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

  return (
    <div className="chat-shell">
      <header className="chat-header">
        <button className="chat-back-btn" onClick={onBack}>
          ← Indietro
        </button>
        <h2 className="chat-title">Chat</h2>
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
            <span className="chat-bubble-sender">{msg.sender_name}</span>
            <p className="chat-bubble-text">{msg.content}</p>
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
        <button type="submit" className="chat-send-btn">
          Invia
        </button>
      </form>
    </div>
  )
}

export default Chat