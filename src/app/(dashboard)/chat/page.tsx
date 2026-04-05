'use client'
// @ts-nocheck

import { useState, useEffect, useRef, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'
import { Send, MessageCircle, Search, ArrowLeft } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { createClient } from '@supabase/supabase-js'

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

const card = { backgroundColor: 'var(--card)', border: '1px solid var(--border)' }

function Avatar({ user, size = 40 }: { user: any; size?: number }) {
  if (user?.avatar_url) {
    return <img src={user.avatar_url} alt={user.full_name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'linear-gradient(135deg,#3525cd,#712ae2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: size * 0.35, flexShrink: 0 }}>
      {(user?.full_name ?? 'U')[0].toUpperCase()}
    </div>
  )
}

export default function ChatPage() {
  const { user } = useUser()
  const searchParams = useSearchParams()
  const initialUser = searchParams.get('user')

  const [conversations, setConversations] = useState<any[]>([])
  const [activeConv, setActiveConv] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingConvs, setLoadingConvs] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list')
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabaseRef = useRef<any>(null)

  const fetchConversations = useCallback(async () => {
    const res = await fetch('/api/messages/conversations')
    const data = await res.json()
    if (Array.isArray(data)) setConversations(data)
    setLoadingConvs(false)
  }, [])

  const fetchMessages = useCallback(async (otherId: string) => {
    setLoadingMsgs(true)
    const res = await fetch(`/api/messages?other_user_id=${otherId}`)
    const data = await res.json()
    if (Array.isArray(data)) setMessages(data)
    setLoadingMsgs(false)
  }, [])

  // Load conversations on mount
  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // If ?user= param provided, open that conversation
  useEffect(() => {
    if (initialUser && conversations.length > 0) {
      const conv = conversations.find(c => c.other_user_id === initialUser)
      if (conv) {
        setActiveConv(conv)
        setMobileView('chat')
      } else {
        // Start new conversation with that user
        fetch(`/api/profile?user_id=${initialUser}`)
          .then(r => r.json())
          .then(data => {
            if (data?.user) {
              const newConv = { other_user_id: initialUser, other_user: data.user, last_message: '', unread: 0 }
              setActiveConv(newConv)
              setMobileView('chat')
            }
          }).catch(() => {})
      }
    }
  }, [initialUser, conversations])

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeConv) return
    fetchMessages(activeConv.other_user_id)
  }, [activeConv, fetchMessages])

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Supabase Realtime subscription
  useEffect(() => {
    if (!user?.id || !activeConv) return

    const supabase = getSupabaseClient()
    supabaseRef.current = supabase

    const channel = supabase
      .channel(`messages_${user.id}_${activeConv.other_user_id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${user.id}`,
      }, (payload: any) => {
        const msg = payload.new as any
        if (msg.sender_id === activeConv.other_user_id) {
          setMessages(prev => [...prev, { ...msg, sender: activeConv.other_user }])
          fetchConversations()
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, activeConv, fetchConversations])

  const handleSend = async () => {
    if (!input.trim() || !activeConv || sending) return
    setSending(true)
    const tempMsg = {
      id: 'temp_' + Date.now(),
      sender_id: user?.id,
      receiver_id: activeConv.other_user_id,
      content: input.trim(),
      created_at: new Date().toISOString(),
      sender: { id: user?.id, full_name: user?.fullName, avatar_url: user?.imageUrl },
    }
    setMessages(prev => [...prev, tempMsg])
    setInput('')

    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiver_id: activeConv.other_user_id, content: tempMsg.content }),
    })
    setSending(false)

    if (res.ok) {
      const saved = await res.json()
      setMessages(prev => prev.map(m => m.id === tempMsg.id ? { ...saved, sender: tempMsg.sender } : m))
      fetchConversations()
    }
  }

  const filteredConvs = conversations.filter(c =>
    c.other_user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const ConversationList = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 12px', borderBottom: '1px solid var(--border)' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--on-surface)', fontFamily: 'var(--font-manrope)', marginBottom: '12px' }}>Messages</h1>
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--outline)' }} />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            style={{ width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 9, paddingBottom: 9, borderRadius: 12, border: '1px solid var(--border)', backgroundColor: 'var(--surface-container)', color: 'var(--on-surface)', fontSize: 13, outline: 'none' }}
          />
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loadingConvs ? (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...Array(4)].map((_: any, i: number) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 16px', alignItems: 'center' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: 'var(--surface-container)' }} className="animate-pulse" />
                <div style={{ flex: 1 }}>
                  <div style={{ height: 14, backgroundColor: 'var(--surface-container)', borderRadius: 6, width: '60%', marginBottom: 8 }} className="animate-pulse" />
                  <div style={{ height: 12, backgroundColor: 'var(--surface-container)', borderRadius: 6, width: '80%' }} className="animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConvs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
            <p style={{ fontWeight: 700, color: 'var(--on-surface)', fontSize: 16, fontFamily: 'var(--font-manrope)' }}>No conversations yet</p>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: 13, marginTop: 6 }}>Message a seller or lender to get started</p>
          </div>
        ) : (
          filteredConvs.map(conv => {
            const isActive = activeConv?.other_user_id === conv.other_user_id
            return (
              <button
                key={conv.other_user_id}
                onClick={() => { setActiveConv(conv); setMobileView('chat') }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', textAlign: 'left', border: 'none', cursor: 'pointer', backgroundColor: isActive ? 'var(--primary-light)' : 'transparent', borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent', transition: 'all 0.15s' }}
                onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--surface-container)' }}
                onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <Avatar user={conv.other_user} size={44} />
                  {conv.unread > 0 && (
                    <div style={{ position: 'absolute', top: -2, right: -2, width: 18, height: 18, borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--card)' }}>
                      {conv.unread > 9 ? '9+' : conv.unread}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <span style={{ fontWeight: conv.unread > 0 ? 700 : 600, fontSize: 14, color: 'var(--on-surface)', fontFamily: 'var(--font-manrope)' }}>
                      {conv.other_user?.full_name ?? 'Unknown'}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--outline)' }}>
                      {conv.last_time ? formatDistanceToNow(new Date(conv.last_time), { addSuffix: false }) : ''}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: conv.unread > 0 ? 'var(--on-surface)' : 'var(--on-surface-variant)', fontWeight: conv.unread > 0 ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {conv.last_message || 'Start a conversation'}
                  </p>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )

  const ChatWindow = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Chat header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => setMobileView('list')}
          style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface)', padding: 4 }}
          className="mobile-back-btn"
        >
          <ArrowLeft size={20} />
        </button>
        <Avatar user={activeConv?.other_user} size={40} />
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--on-surface)', fontFamily: 'var(--font-manrope)' }}>
            {activeConv?.other_user?.full_name ?? 'Chat'}
          </p>
          <p style={{ fontSize: 11, color: 'var(--on-surface-variant)' }}>
            Trust Score: {activeConv?.other_user?.trust_score ?? '—'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 8px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loadingMsgs ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...Array(4)].map((_: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: i % 2 === 0 ? 'flex-start' : 'flex-end' }}>
                <div style={{ height: 36, width: 160 + i * 20, borderRadius: 16, backgroundColor: 'var(--surface-container)' }} className="animate-pulse" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <div style={{ fontSize: 48 }}>👋</div>
            <p style={{ fontWeight: 600, color: 'var(--on-surface)', fontSize: 15 }}>Say hello!</p>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: 13, textAlign: 'center' }}>
              This is the start of your conversation with {activeConv?.other_user?.full_name}
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg: any, i: number) => {
              const isMine = msg.sender_id === user?.id
              const showAvatar = !isMine && (i === 0 || messages[i - 1]?.sender_id !== msg.sender_id)
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 8 }}
                >
                  {!isMine && (
                    <div style={{ width: 28, flexShrink: 0 }}>
                      {showAvatar && <Avatar user={msg.sender ?? activeConv?.other_user} size={28} />}
                    </div>
                  )}
                  <div style={{ maxWidth: '70%' }}>
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      backgroundColor: isMine ? 'var(--primary)' : 'var(--surface-container)',
                      color: isMine ? 'white' : 'var(--on-surface)',
                      fontSize: 14,
                      lineHeight: 1.5,
                      wordBreak: 'break-word',
                    }}>
                      {msg.content}
                    </div>
                    <p style={{ fontSize: 10, color: 'var(--outline)', marginTop: 3, textAlign: isMine ? 'right' : 'left', paddingLeft: isMine ? 0 : 4, paddingRight: isMine ? 4 : 0 }}>
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder="Type a message..."
          style={{ flex: 1, padding: '12px 16px', borderRadius: 999, border: '1px solid var(--border)', backgroundColor: 'var(--surface-container)', color: 'var(--on-surface)', fontSize: 14, outline: 'none' }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: input.trim() ? 'var(--primary)' : 'var(--surface-container-high)', border: 'none', cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}
        >
          <Send size={16} color={input.trim() ? 'white' : 'var(--outline)'} />
        </button>
      </div>
    </div>
  )

  const EmptyState = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <MessageCircle size={36} color="var(--outline)" />
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontWeight: 700, fontSize: 18, color: 'var(--on-surface)', fontFamily: 'var(--font-manrope)' }}>Select a conversation</p>
        <p style={{ color: 'var(--on-surface-variant)', fontSize: 14, marginTop: 6 }}>Choose from your conversations on the left</p>
      </div>
    </div>
  )

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .chat-layout { flex-direction: column !important; }
          .chat-sidebar { display: ${mobileView === 'list' ? 'flex' : 'none'} !important; width: 100% !important; height: 100% !important; }
          .chat-main { display: ${mobileView === 'chat' ? 'flex' : 'none'} !important; }
          .mobile-back-btn { display: flex !important; }
        }
      `}</style>
      <div
        className="chat-layout"
        style={{ display: 'flex', height: 'calc(100vh - 140px)', minHeight: 400, borderRadius: 20, overflow: 'hidden', ...card }}
      >
        {/* Sidebar */}
        <div
          className="chat-sidebar"
          style={{ width: 320, borderRight: '1px solid var(--border)', flexShrink: 0, display: 'flex', flexDirection: 'column', overflowY: 'hidden' }}
        >
          <ConversationList />
        </div>

        {/* Chat area */}
        <div
          className="chat-main"
          style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}
        >
          {activeConv ? <ChatWindow /> : <EmptyState />}
        </div>
      </div>
    </>
  )
}