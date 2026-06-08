import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { C, projectColor, blend } from '../utils/colors'

const COLS = 4

export default function TagPicker({ projects, value, onChange, error }) {
  const [customInput, setCustomInput] = useState(
    value && !projects.includes(value) ? value : ''
  )
  const col = projectColor(value)

  useEffect(() => {
    if (projects.includes(value)) setCustomInput('')
  }, [value, projects])

  const selectProject = (p, isSelected) => {
    setCustomInput('')
    onChange(isSelected ? '' : p)
  }

  const onCustomChange = (e) => {
    const v = e.target.value
    setCustomInput(v)
    onChange(v || '')
  }

  return (
    <div style={{
      background: C.bg2, borderRadius: 7,
      border: `1px solid ${error ? C.warn : C.bg3}`,
      transition: 'border-color 0.2s, box-shadow 0.2s',
      boxShadow: error ? `0 0 0 3px rgba(243,139,168,0.12)` : 'none',
      overflow: 'hidden',
    }}>
      <div style={{ padding: '7px 10px', minHeight: 40, display: 'flex', alignItems: 'center' }}>
        {value ? (
          <div style={{
            display: 'inline-flex', alignItems: 'center',
            background: col, borderRadius: 5,
            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
          }}>
            <span style={{ color: '#1e1e2e', fontSize: 12, fontWeight: 700, padding: '3px 10px' }}>{value}</span>
            <button
              onClick={() => { setCustomInput(''); onChange('') }}
              style={{
                background: 'rgba(0,0,0,0.15)', color: '#1e1e2e',
                padding: '0 7px', height: '100%',
                display: 'flex', alignItems: 'center',
                borderRadius: '0 5px 5px 0', transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.28)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.15)'}
            >
              <X size={12} strokeWidth={2.5} />
            </button>
          </div>
        ) : (
          <span style={{ color: C.fg3, fontSize: 12 }}>프로젝트 선택</span>
        )}
      </div>

      <div style={{ height: 1, background: C.bg3 }} />

      <div style={{
        padding: '7px 10px 9px',
        display: 'grid',
        gridTemplateColumns: `repeat(${COLS}, auto)`,
        gap: 5,
        justifyContent: 'start',
      }}>
        {projects.length === 0 ? (
          <span style={{ color: C.fg3, fontSize: 12, padding: '4px 0', gridColumn: `1 / -1` }}>프로젝트를 먼저 등록하세요</span>
        ) : projects.map(p => {
          const c = projectColor(p)
          const sel = p === value
          return (
            <button
              key={p}
              onClick={() => selectProject(p, sel)}
              style={{
                background: sel ? blend(c, C.bg2, 0.5) : C.bg3,
                color: sel ? c : C.fg2,
                fontSize: 11, fontWeight: sel ? 700 : 400,
                padding: '4px 11px', borderRadius: 5,
                border: `1px solid ${sel ? c + '55' : 'transparent'}`,
                cursor: 'pointer',
                transition: 'background 0.12s, color 0.12s, border-color 0.12s, transform 0.1s',
                boxShadow: sel ? `0 0 8px ${c}33` : 'none',
              }}
              onMouseEnter={e => { if (!sel) { e.currentTarget.style.background = '#45475a'; e.currentTarget.style.color = C.fg } }}
              onMouseLeave={e => { if (!sel) { e.currentTarget.style.background = C.bg3; e.currentTarget.style.color = C.fg2 } }}
            >
              {p}
            </button>
          )
        })}
      </div>

      <div style={{ height: 1, background: C.bg3 }} />

      <div style={{ padding: '6px 10px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: C.fg3, fontSize: 11, flexShrink: 0 }}>일회성 태그</span>
        <input
          value={customInput}
          onChange={onCustomChange}
          placeholder="직접 입력..."
          style={{
            flex: 1, background: C.bg3,
            color: customInput ? C.fg : C.fg3,
            fontSize: 11, padding: '3px 8px', borderRadius: 4,
            border: `1px solid ${customInput ? C.accent + '55' : 'transparent'}`,
            outline: 'none', transition: 'border-color 0.15s',
          }}
          onFocus={e => e.currentTarget.style.borderColor = C.accent + '88'}
          onBlur={e => e.currentTarget.style.borderColor = customInput ? C.accent + '55' : 'transparent'}
        />
      </div>
    </div>
  )
}
