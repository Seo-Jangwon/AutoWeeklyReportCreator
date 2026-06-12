import { Plus } from 'lucide-react'
import { C, blend } from '../utils/colors'
import { DAY_NAMES, toISO, fmt, isToday } from '../utils/dates'
import { getEntries, getMilestones } from '../utils/data'
import EntryCard from './EntryCard'

function DeadlineDots({ dots }) {
  if (!dots || dots.length === 0) return null
  const shown = dots.slice(0, 4)
  const rest  = dots.length - shown.length
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginLeft: 6 }}>
      {shown.map((dot, i) => (
        <div
          key={i}
          title={dot.type === 'dd' ? '마감일' : '마일스톤'}
          style={{
            width: dot.type === 'ms' ? 6 : 5,
            height: dot.type === 'ms' ? 6 : 5,
            borderRadius: dot.type === 'ms' ? 2 : '50%',
            background: dot.color,
            boxShadow: `0 0 4px ${dot.color}88`,
            flexShrink: 0,
          }}
        />
      ))}
      {rest > 0 && (
        <span style={{ color: C.fg3, fontSize: 9, lineHeight: 1 }}>+{rest}</span>
      )}
    </div>
  )
}

export default function DayColumn({ date, dayIdx, data, wk, dots, onAdd, onEdit, onDelete }) {
  const ds = toISO(date)
  const entries = getEntries(data, wk, ds)
  const milestones = getMilestones(data)
  const today = isToday(date)
  const dayOfWeek = date.getDay()

  const isSat = dayOfWeek === 6
  const isSun = dayOfWeek === 0
  const weekendColor = isSat ? C.sat : isSun ? C.sun : null

  const colBg    = weekendColor ? blend(C.bg2, weekendColor, 0.05) : C.bg2
  const hdrBg    = today ? C.accent : weekendColor ? blend(C.bg3, weekendColor, 0.2) : C.bg3
  const dayLbl   = today ? C.bg2 : weekendColor ? weekendColor : C.fg
  const dateLbl  = today ? 'rgba(30,30,46,0.7)' : C.fg3
  const border   = today ? C.accent : (dots?.length > 0 ? '#45475a' : C.bg3)

  const dayLabel = `${DAY_NAMES[dayIdx]} ${fmt(date)}`

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      background: colBg, borderRadius: 9,
      border: `${today ? 2 : 1}px solid ${border}`,
      boxShadow: today
        ? '0 0 0 1px rgba(137,180,250,0.15), 0 4px 12px rgba(0,0,0,0.3)'
        : '0 2px 8px rgba(0,0,0,0.2)',
      overflow: 'hidden', minWidth: 0,
    }}>
      <div style={{
        background: hdrBg,
        padding: '7px 8px 6px',
        display: 'flex', alignItems: 'center',
        flexShrink: 0,
      }}>
        <span style={{ color: dayLbl, fontSize: 13, fontWeight: 700 }}>{DAY_NAMES[dayIdx]}</span>
        <span style={{ color: dateLbl, fontSize: 10, fontWeight: 500, marginLeft: 5 }}>{fmt(date)}</span>
        <DeadlineDots dots={dots} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '7px 5px 2px' }}>
        {entries.length === 0 && (
          <div style={{
            color: C.fg3, fontSize: 10, textAlign: 'center',
            padding: '12px 0', letterSpacing: 0.3, opacity: 0.6,
          }}>— 없음 —</div>
        )}
        {entries.map((entry, idx) => (
          <EntryCard
            key={idx}
            entry={entry}
            milestone={entry.milestoneId ? milestones.find(m => m.id === entry.milestoneId) : null}
            onEdit={() => onEdit(ds, idx, entry, dayLabel)}
            onDelete={() => onDelete(ds, idx)}
          />
        ))}
      </div>

      <button
        onClick={() => onAdd(ds, dayLabel)}
        style={{
          background: 'transparent', color: C.fg3,
          padding: '5px', fontSize: 11, width: '100%',
          borderTop: `1px solid ${C.bg3}`, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          transition: 'color 0.1s, background 0.1s',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = C.accent; e.currentTarget.style.background = 'rgba(137,180,250,0.07)' }}
        onMouseLeave={e => { e.currentTarget.style.color = C.fg3; e.currentTarget.style.background = 'transparent' }}
      >
        <Plus size={12} strokeWidth={2.5} />
        <span>추가</span>
      </button>
    </div>
  )
}
