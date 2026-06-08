import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { C } from '../utils/colors'

export default function Modal({ children, onClose, width = 460, title }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 200,
        animation: 'overlayIn 0.15s ease-out',
      }}
    >
      <div style={{
        background: C.bg,
        border: `1px solid ${C.bg3}`,
        borderRadius: 12,
        width,
        maxWidth: '92vw',
        boxShadow: '0 24px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)',
        overflow: 'hidden',
        animation: 'modalIn 0.15s ease-out',
      }}>
        {title && (
          <div style={{
            background: C.bg2,
            padding: '13px 16px 13px 20px',
            borderBottom: `1px solid ${C.bg3}`,
            display: 'flex',
            alignItems: 'center',
          }}>
            <span style={{ flex: 1, fontSize: 13, color: C.fg, fontWeight: 600, letterSpacing: 0.2 }}>
              {title}
            </span>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                color: C.fg3,
                padding: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 5,
                transition: 'color 0.12s, background 0.12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = C.fg; e.currentTarget.style.background = C.bg3 }}
              onMouseLeave={e => { e.currentTarget.style.color = C.fg3; e.currentTarget.style.background = 'transparent' }}
            >
              <X size={15} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body
  )
}

export function ModalFooter({ onClose, onSubmit, submitText = '추가' }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '8px 20px 18px' }}>
      <button
        onClick={onClose}
        style={{
          background: C.bg3,
          color: C.fg2,
          padding: '7px 18px',
          fontSize: 13,
          transition: 'background 0.12s, color 0.12s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#45475a'; e.currentTarget.style.color = C.fg }}
        onMouseLeave={e => { e.currentTarget.style.background = C.bg3; e.currentTarget.style.color = C.fg2 }}
      >
        취소
      </button>
      <button
        onClick={onSubmit}
        style={{
          background: C.accent,
          color: C.bg2,
          padding: '7px 20px',
          fontSize: 13,
          fontWeight: 700,
          transition: 'background 0.12s, transform 0.1s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#a0c4ff'; e.currentTarget.style.transform = 'translateY(-1px)' }}
        onMouseLeave={e => { e.currentTarget.style.background = C.accent; e.currentTarget.style.transform = '' }}
      >
        {submitText}
      </button>
    </div>
  )
}
