'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ShoppingBag, HandshakeIcon, Briefcase, User, MessageCircle } from 'lucide-react'
import { useState, useEffect } from 'react'

const navItems = [
  { href: '/home',        label: 'Home',    icon: Home },
  { href: '/marketplace', label: 'Market',  icon: ShoppingBag },
  { href: '/borrow',      label: 'Borrow',  icon: HandshakeIcon },
  { href: '/chat',        label: 'Chat',    icon: MessageCircle },
  { href: '/gigs',        label: 'Gigs',    icon: Briefcase },
  { href: '/profile',     label: 'Profile', icon: User },
]

export default function MobileNav() {
  const pathname = usePathname()
  const [unreadMsgs, setUnreadMsgs] = useState(0)

  useEffect(() => {
    const fetchUnread = () => {
      fetch('/api/messages/conversations')
        .then(r => r.json())
        .then(convs => {
          if (Array.isArray(convs)) {
            setUnreadMsgs(convs.reduce((sum: number, c: any) => sum + (c.unread ?? 0), 0))
          }
        }).catch(() => {})
    }
    fetchUnread()
    const iv = setInterval(fetchUnread, 30000)
    return () => clearInterval(iv)
  }, [])

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      backgroundColor: 'var(--card)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      paddingBottom: 'env(safe-area-inset-bottom)',
      boxShadow: '0 -4px 24px rgba(0,0,0,0.08)',
    }}
      className="lg:hidden"
    >
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href === '/marketplace' && pathname.startsWith('/marketplace'))
        return (
          <Link
            key={href}
            href={href}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px 4px',
              textDecoration: 'none',
              gap: '4px',
              color: active ? 'var(--primary)' : 'var(--outline)',
              transition: 'color 0.2s',
            }}
          >
            <div style={{ position: 'relative' }}>
              <div style={{
                width: active ? '36px' : '24px',
                height: active ? '28px' : '24px',
                borderRadius: active ? '999px' : '0',
                backgroundColor: active ? 'var(--primary-light)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}>
                <Icon size={18} />
              </div>
              {href === '/chat' && unreadMsgs > 0 && (
                <div style={{
                  position: 'absolute', top: -4, right: -4,
                  width: 16, height: 16, borderRadius: '50%',
                  backgroundColor: 'var(--primary)', color: 'white',
                  fontSize: 9, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '2px solid var(--card)',
                }}>
                  {unreadMsgs > 9 ? '9+' : unreadMsgs}
                </div>
              )}
            </div>
            <span style={{
              fontSize: '10px',
              fontWeight: active ? 700 : 500,
              fontFamily: 'var(--font-manrope)',
            }}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
