import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { C, projectColor } from '../utils/colors'
import { renderLines } from '../utils/content'

export default function EntryCard({ entry, milestone, onEdit, onDelete }) {
  const [hovered, setHovered] = useState(false)
  const col = projectColor(entry.project)
  const title = entry.title ?? entry.text ?? ''
  const hasContent = (entry.content || '').trim().length > 0

  return (
    <div
      onClick={onEdit}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', borderRadius: 7, overflow: 'hidden',
        background: hovered ? C.cardHi : C.card,
        cursor: 'pointer', position: 'relative',
        transition: 'background 0.12s, transform 0.12s, box-shadow 0.12s',
        transform: hovered ? 'translateY(-1px)' : 'none',
        boxShadow: hovered ? '0 3px 10px rgba(0,0,0,0.35)' : '0 1px 4px rgba(0,0,0,0.2)',
        marginBottom: 4,
      }}
    >
      <div style={{ width: 3, background: col, flexShrink: 0 }} />
      <div style={{ padding: '6px 28px 6px 8px', flex: 1, minWidth: 0 }}>
        {entry.project && (
          <div style={{ color: col, fontSize: 10, fontWeight: 700, marginBottom: 2, lineHeight: 1.2, letterSpacing: 0.2 }}>
            {entry.project}
          </div>
        )}
        <div style={{ color: C.fg, fontSize: 12, fontWeight: 600, lineHeight: 1.4, wordBreak: 'break-word' }}>
          {title}
        </div>
        {hasContent && (
          <div style={{ marginTop: 3 }}>
            {renderLines(entry.content)}
          </div>
        )}
        {milestone && (
          <div style={{ marginTop: 4 }}>
            <span
              title={`마일스톤: ${milestone.detail}`}
              style={{
                display: 'inline-block', maxWidth: '100%',
                color: '#94e2d5', background: '#94e2d51a',
                fontSize: 9, fontWeight: 600, lineHeight: 1.4,
                padding: '1px 5px', borderRadius: 3,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                verticalAlign: 'bottom',
              }}
            >◆ {milestone.detail}</span>
          </div>
        )}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        style={{
          position: 'absolute', top: 4, right: 4,
          background: hovered ? 'rgba(243,139,168,0.15)' : 'transparent',
          color: hovered ? C.warn : 'transparent',
          padding: '3px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 4,
          transition: 'color 0.1s, background 0.1s',
        }}
        onMouseEnter={e => { e.stopPropagation(); e.currentTarget.style.background = 'rgba(243,139,168,0.25)' }}
        onMouseLeave={e => { e.currentTarget.style.background = hovered ? 'rgba(243,139,168,0.15)' : 'transparent' }}
      >
        <Trash2 size={11} strokeWidth={2} />
      </button>
    </div>
  )
}
