import { useState } from 'react'
import { Plus, Pencil, Trash2, Check, CalendarClock, Milestone as MilestoneIcon, ChevronDown, ChevronRight } from 'lucide-react'
import { C, projectColor } from '../utils/colors'
import { dday, ddayBadge, fmtDateStr } from '../utils/dates'
import { getDueDates, getMilestones } from '../utils/data'
import ContribGraph from './ContribGraph'

function DdayBadge({ dateStr }) {
  const badge = ddayBadge(dday(dateStr))
  if (!badge) return null
  return (
    <span style={{
      background: badge.bg, color: badge.color,
      fontSize: 10, fontWeight: 700,
      padding: '2px 6px', borderRadius: 4,
      border: `1px solid ${badge.color}33`,
      flexShrink: 0, letterSpacing: 0.2,
    }}>{badge.label}</span>
  )
}

function PlanCard({ item, type, onEdit, onDelete, onToggleDone }) {
  const [hov, setHov] = useState(false)
  const dateStr = type === 'dd' ? item.date : item.target
  const title   = type === 'dd' ? item.task  : item.detail
  const color   = projectColor(item.project)
  const isDone  = !!item.done

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'stretch',
        background: hov ? C.cardHi : C.card,
        borderRadius: 7, overflow: 'hidden', marginBottom: 4,
        transition: 'all 0.1s',
        transform: hov ? 'translateY(-1px)' : 'none',
        boxShadow: hov ? '0 3px 10px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,0,0,0.15)',
        opacity: isDone ? 0.5 : 1,
      }}
    >
      <div style={{ width: 3, background: color, flexShrink: 0 }} />
      <div style={{ flex: 1, padding: '7px 10px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {item.project && (
            <span style={{
              background: `${color}1a`, color, fontSize: 10, fontWeight: 600,
              padding: '1px 6px', borderRadius: 3, border: `1px solid ${color}33`,
              flexShrink: 0,
            }}>{item.project}</span>
          )}
          <span style={{
            color: isDone ? C.fg3 : C.fg, fontSize: 12, lineHeight: 1.4,
            textDecoration: isDone ? 'line-through' : 'none',
            wordBreak: 'break-word',
          }}>{title}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          {!isDone && <DdayBadge dateStr={dateStr} />}
          <span style={{ color: C.fg3, fontSize: 10 }}>{fmtDateStr(dateStr)}</span>
        </div>
      </div>

      {hov && (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button
            onClick={onToggleDone}
            title={isDone ? '미완료로 변경' : '완료로 표시'}
            style={{
              background: isDone ? 'rgba(166,227,161,0.15)' : 'transparent',
              color: isDone ? C.success : C.fg3,
              padding: '0 8px', height: '100%', display: 'flex', alignItems: 'center',
              transition: 'color 0.1s, background 0.1s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = C.success; e.currentTarget.style.background = 'rgba(166,227,161,0.15)' }}
            onMouseLeave={e => { e.currentTarget.style.color = isDone ? C.success : C.fg3; e.currentTarget.style.background = isDone ? 'rgba(166,227,161,0.15)' : 'transparent' }}
          >
            <Check size={13} strokeWidth={2.5} />
          </button>
          <button
            onClick={onEdit}
            style={{ background: 'transparent', color: C.fg3, padding: '0 6px', height: '100%', display: 'flex', alignItems: 'center', transition: 'color 0.1s' }}
            onMouseEnter={e => e.currentTarget.style.color = C.accent}
            onMouseLeave={e => e.currentTarget.style.color = C.fg3}
          >
            <Pencil size={12} strokeWidth={2} />
          </button>
          <button
            onClick={onDelete}
            style={{ background: 'transparent', color: C.fg3, padding: '0 8px', height: '100%', display: 'flex', alignItems: 'center', transition: 'color 0.1s, background 0.1s' }}
            onMouseEnter={e => { e.currentTarget.style.color = C.warn; e.currentTarget.style.background = 'rgba(243,139,168,0.12)' }}
            onMouseLeave={e => { e.currentTarget.style.color = C.fg3; e.currentTarget.style.background = 'transparent' }}
          >
            <Trash2 size={12} strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  )
}

function GroupHeader({ label, count, color, open, onToggle, fixed }) {
  return (
    <button
      onClick={fixed ? undefined : onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '3px 2px 5px', marginBottom: 4,
        color: color || C.fg3, fontSize: 11, fontWeight: 700,
        background: 'transparent', width: '100%', textAlign: 'left',
        borderBottom: `1px solid ${C.bg3}`,
        cursor: fixed ? 'default' : 'pointer',
        letterSpacing: 0.3,
      }}
    >
      {!fixed && (open ? <ChevronDown size={12} strokeWidth={2.5} /> : <ChevronRight size={12} strokeWidth={2.5} />)}
      <span>{label}</span>
      <span style={{
        background: C.bg3, color: C.fg3,
        fontSize: 10, padding: '0px 6px', borderRadius: 10,
      }}>{count}</span>
    </button>
  )
}

function PlanSection({ icon: Icon, title, items, type, onAdd, onEdit, onDelete, onToggleDone }) {
  const [doneOpen, setDoneOpen] = useState(false)

  const dateOf = x => type === 'dd' ? x.date : x.target

  // pair each item with its original index so delete/edit always use the correct index
  const indexed = items.map((x, i) => [x, i])
  const done   = indexed.filter(([x]) => x.done)
  const active = indexed.filter(([x]) => !x.done)

  const overdue  = active.filter(([x]) => { const n = dday(dateOf(x)); return n !== null && n < 0  }).sort(([a], [b]) => dateOf(a) > dateOf(b) ? 1 : -1)
  const today    = active.filter(([x]) => dday(dateOf(x)) === 0)
  const imminent = active.filter(([x]) => { const n = dday(dateOf(x)); return n !== null && n > 0 && n <= 7 }).sort(([a], [b]) => dateOf(a) > dateOf(b) ? 1 : -1)
  const upcoming = active.filter(([x]) => { const n = dday(dateOf(x)); return n !== null && n > 7  }).sort(([a], [b]) => dateOf(a) > dateOf(b) ? 1 : -1)
  const noDate   = active.filter(([x]) => dday(dateOf(x)) === null)

  const renderCards = (list) => list.map(([item, idx]) => (
    <PlanCard
      key={idx} item={item} type={type}
      onEdit={() => onEdit(idx)}
      onDelete={() => onDelete(idx)}
      onToggleDone={() => onToggleDone(idx)}
    />
  ))

  return (
    <div style={{
      flex: 1, background: C.bg2, borderRadius: 9,
      border: `1px solid ${C.bg3}`,
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden', minWidth: 0,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '8px 12px 7px',
        borderBottom: `1px solid ${C.bg3}`, flexShrink: 0, gap: 6,
      }}>
        {Icon && <Icon size={13} strokeWidth={2} style={{ color: C.accent2 }} />}
        <span style={{ color: C.accent2, fontWeight: 700, fontSize: 12, flex: 1 }}>{title}</span>
        <span style={{ color: C.fg3, fontSize: 11 }}>미완료 {active.length}</span>
        <button
          onClick={onAdd}
          style={{
            background: C.bg3, color: C.fg, fontSize: 11,
            padding: '3px 9px', borderRadius: 5,
            display: 'flex', alignItems: 'center', gap: 4,
            transition: 'background 0.1s, transform 0.1s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#45475a'; e.currentTarget.style.transform = 'translateY(-1px)' }}
          onMouseLeave={e => { e.currentTarget.style.background = C.bg3; e.currentTarget.style.transform = '' }}
        >
          <Plus size={11} strokeWidth={2.5} /><span>추가</span>
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
        {overdue.length > 0 && (
          <><GroupHeader label="지남" count={overdue.length} color={C.warn} open fixed />
          {renderCards(overdue)}</>
        )}
        {today.length > 0 && (
          <><GroupHeader label="D-day" count={today.length} color="#f38ba8" open fixed />
          {renderCards(today)}</>
        )}
        {imminent.length > 0 && (
          <><GroupHeader label="임박 (7일 이내)" count={imminent.length} color="#fab387" open fixed />
          {renderCards(imminent)}</>
        )}
        {upcoming.length > 0 && (
          <><GroupHeader label="예정" count={upcoming.length} color={C.accent} open fixed />
          {renderCards(upcoming)}</>
        )}
        {noDate.length > 0 && (
          <><GroupHeader label="날짜 미정" count={noDate.length} color={C.fg3} open fixed />
          {renderCards(noDate)}</>
        )}

        {active.length === 0 && done.length === 0 && (
          <div style={{ color: C.fg3, fontSize: 11, padding: '4px 2px', opacity: 0.6 }}>항목 없음</div>
        )}

        {done.length > 0 && (
          <>
            <GroupHeader label="완료" count={done.length} color={C.success} open={doneOpen} onToggle={() => setDoneOpen(v => !v)} />
            {doneOpen && renderCards(done)}
          </>
        )}
      </div>
    </div>
  )
}

export default function PlanningView({ data, onAddDD, onEditDD, onDeleteDD, onToggleDoneDD, onAddMS, onEditMS, onDeleteMS, onToggleDoneMS }) {
  const dueDates   = getDueDates(data)
  const milestones = getMilestones(data)

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '10px 18px', gap: 10 }}>
      <ContribGraph data={data} />
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', gap: 8 }}>
        <PlanSection
          icon={CalendarClock} title="Due Dates"
          items={dueDates} type="dd"
          onAdd={onAddDD} onEdit={onEditDD} onDelete={onDeleteDD} onToggleDone={onToggleDoneDD}
        />
        <PlanSection
          icon={MilestoneIcon} title="Milestones"
          items={milestones} type="ms"
          onAdd={onAddMS} onEdit={onEditMS} onDelete={onDeleteMS} onToggleDone={onToggleDoneMS}
        />
      </div>
    </div>
  )
}
