import { useState } from 'react'
import { Plus, Pencil, Trash2, RotateCcw, AlertTriangle, CalendarClock, Milestone } from 'lucide-react'
import { C, projectColor } from '../utils/colors'
import { dday, ddayBadge, fmtDateStr } from '../utils/dates'
import { getDueDates, getMilestones, getBlockers } from '../utils/data'

function DdayBadge({ dateStr }) {
  const badge = ddayBadge(dday(dateStr))
  if (!badge) return null
  return (
    <span style={{
      background: badge.bg,
      color: badge.color,
      fontSize: 10, fontWeight: 700,
      padding: '2px 6px', borderRadius: 4,
      marginRight: 4, flexShrink: 0,
      letterSpacing: 0.2,
      border: `1px solid ${badge.color}33`,
    }}>
      {badge.label}
    </span>
  )
}

function SectionItem({ project, text, color, dateStr, onEdit, onDelete }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center',
        background: hov ? C.cardHi : C.card,
        borderRadius: 6, overflow: 'hidden', marginBottom: 3,
        transition: 'background 0.1s, transform 0.1s, box-shadow 0.1s',
        transform: hov ? 'translateY(-1px)' : 'none',
        boxShadow: hov ? '0 3px 8px rgba(0,0,0,0.3)' : 'none',
      }}
    >
      <div style={{ width: 3, background: color || C.fg3, alignSelf: 'stretch', flexShrink: 0 }} />
      <div
        onDoubleClick={onEdit}
        style={{
          flex: 1, padding: '5px 8px', display: 'flex', alignItems: 'center',
          gap: 6, minWidth: 0, flexWrap: 'wrap',
        }}
      >
        {project && (
          <span style={{
            background: `${color}1a`, color, fontSize: 10, fontWeight: 600,
            padding: '1px 6px', borderRadius: 3, border: `1px solid ${color}33`,
            flexShrink: 0, whiteSpace: 'nowrap',
          }}>{project}</span>
        )}
        <span style={{ color: C.fg, fontSize: 12, lineHeight: 1.4, wordBreak: 'break-word' }}>
          {text}
        </span>
      </div>
      {dateStr && <DdayBadge dateStr={dateStr} />}
      {hov && (
        <button
          onClick={onEdit}
          style={{
            background: 'transparent', color: C.fg3,
            padding: '0 6px', height: '100%', display: 'flex', alignItems: 'center',
            transition: 'color 0.1s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = C.accent}
          onMouseLeave={e => e.currentTarget.style.color = C.fg3}
          title="수정"
        >
          <Pencil size={12} strokeWidth={2} />
        </button>
      )}
      <button
        onClick={onDelete}
        style={{
          background: 'transparent',
          color: hov ? C.warn : 'transparent',
          padding: '0 8px', height: '100%', display: 'flex', alignItems: 'center',
          transition: 'color 0.1s, background 0.1s',
        }}
        onMouseEnter={e => { if (hov) e.currentTarget.style.background = 'rgba(243,139,168,0.15)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
      >
        <Trash2 size={12} strokeWidth={2} />
      </button>
    </div>
  )
}

function Section({ icon: Icon, title, items, onAdd, onCarry, children }) {
  return (
    <div style={{
      flex: 1, background: C.bg2, borderRadius: 9,
      border: `1px solid ${C.bg3}`,
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden', minWidth: 0,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', padding: '7px 10px 6px',
        borderBottom: `1px solid ${C.bg3}`, flexShrink: 0, gap: 6,
      }}>
        {Icon && <Icon size={13} strokeWidth={2} style={{ color: C.accent2, flexShrink: 0 }} />}
        <span style={{ color: C.accent2, fontWeight: 700, fontSize: 12, flex: 1 }}>{title}</span>
        {onCarry && (
          <button
            onClick={onCarry}
            style={{
              background: 'transparent', color: C.fg3, fontSize: 11,
              padding: '3px 7px', borderRadius: 5,
              display: 'flex', alignItems: 'center', gap: 4,
              border: '1px solid transparent',
              transition: 'color 0.1s, border-color 0.1s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = C.fg; e.currentTarget.style.borderColor = C.bg3 }}
            onMouseLeave={e => { e.currentTarget.style.color = C.fg3; e.currentTarget.style.borderColor = 'transparent' }}
            title="지난주에서 가져오기"
          >
            <RotateCcw size={11} strokeWidth={2} />
            <span>지난주</span>
          </button>
        )}
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
          <Plus size={11} strokeWidth={2.5} />
          <span>추가</span>
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px 6px' }}>
        {items.length === 0
          ? <div style={{ color: C.fg3, fontSize: 11, padding: '4px 2px', opacity: 0.6 }}>{children}</div>
          : items
        }
      </div>
    </div>
  )
}

export default function BottomSections({
  data, wk,
  onAddDD, onEditDD, onDeleteDD,
  onAddMS, onEditMS, onDeleteMS,
  onAddBL, onEditBL, onDeleteBL,
}) {
  const dueDates   = getDueDates(data)
  const milestones = getMilestones(data)
  const blockers   = getBlockers(data, wk)

  return (
    <div style={{ flexShrink: 0, paddingTop: 8, paddingBottom: 10 }}>
      <div style={{ height: 1, background: C.bg3, marginBottom: 8 }} />

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <Section icon={CalendarClock} title="Due Dates" onAdd={onAddDD} items={
          dueDates.map((x, i) => (
            <SectionItem key={i}
              project={x.project || undefined}
              text={`${x.task} → ${fmtDateStr(x.date)}`}
              color={projectColor(x.project)}
              dateStr={x.date}
              onEdit={() => onEditDD(i)} onDelete={() => onDeleteDD(i)} />
          ))
        }>등록된 마감일 없음</Section>

        <Section icon={Milestone} title="Milestones" onAdd={onAddMS} items={
          milestones.map((x, i) => (
            <SectionItem key={i}
              project={x.project || undefined}
              text={`${x.detail} → ${fmtDateStr(x.target)}`}
              color={projectColor(x.project)}
              dateStr={x.target}
              onEdit={() => onEditMS(i)} onDelete={() => onDeleteMS(i)} />
          ))
        }>등록된 마일스톤 없음</Section>
      </div>

      <Section icon={AlertTriangle} title="Blockers" onAdd={onAddBL} items={
        blockers.map((b, i) => (
          <SectionItem key={i} text={b} color={C.warn}
            onEdit={() => onEditBL(i)} onDelete={() => onDeleteBL(i)} />
        ))
      }>등록된 blocker 없음</Section>
    </div>
  )
}
