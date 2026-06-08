import { FolderOpen, Settings, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { C } from '../utils/colors'
import { fmt, weekFriday } from '../utils/dates'

function IconBtn({ icon: Icon, label, onClick, variant = 'ghost' }) {
  const base = {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '6px 13px', fontSize: 12, fontWeight: 500,
    borderRadius: 7, cursor: 'pointer', border: 'none',
    transition: 'background 0.12s, color 0.12s, transform 0.1s',
    flexShrink: 0,
  }
  const styles = {
    ghost:  { background: 'transparent', color: C.fg2,  border: `1px solid ${C.bg3}` },
    accent: { background: C.accent,      color: C.bg2,   border: 'none', fontWeight: 700 },
  }
  return (
    <button
      onClick={onClick}
      style={{ ...base, ...styles[variant] }}
      onMouseEnter={e => {
        if (variant === 'ghost')  { e.currentTarget.style.background = C.bg3; e.currentTarget.style.color = C.fg }
        if (variant === 'accent') { e.currentTarget.style.background = '#a0c4ff'; e.currentTarget.style.transform = 'translateY(-1px)' }
      }}
      onMouseLeave={e => {
        if (variant === 'ghost')  { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.fg2 }
        if (variant === 'accent') { e.currentTarget.style.background = C.accent; e.currentTarget.style.transform = '' }
      }}
    >
      <Icon size={14} strokeWidth={2} />
      {label}
    </button>
  )
}

function NavBtn({ icon: Icon, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: C.bg2, color: C.fg3,
        padding: '6px 10px', borderRadius: 7,
        border: `1px solid ${C.bg3}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.12s, color 0.12s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = C.bg3; e.currentTarget.style.color = C.fg }}
      onMouseLeave={e => { e.currentTarget.style.background = C.bg2; e.currentTarget.style.color = C.fg3 }}
    >
      <Icon size={14} strokeWidth={2.5} />
    </button>
  )
}

export default function TopBar({ wk, dates, onPrev, onNext, onProjects, onSettings, onGenerate }) {
  const start = dates[0], end = dates[6]
  const label = `${wk}   ${fmt(start)} – ${fmt(end)}`

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 18px 9px',
      flexShrink: 0,
      borderBottom: `1px solid ${C.bg3}`,
      background: `linear-gradient(180deg, #1e1e2e 0%, #181825 100%)`,
    }}>
      <IconBtn icon={FolderOpen} label="프로젝트" onClick={onProjects} />
      <IconBtn icon={Settings}   label="설정"     onClick={onSettings} />

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <NavBtn icon={ChevronLeft}  onClick={onPrev} />
        <span style={{
          color: C.fg, fontWeight: 700, fontSize: 13,
          minWidth: 230, textAlign: 'center', letterSpacing: 0.3,
        }}>
          {label}
        </span>
        <NavBtn icon={ChevronRight} onClick={onNext} />
      </div>

      <IconBtn icon={Sparkles} label="Generate" onClick={onGenerate} variant="accent" />
    </div>
  )
}
