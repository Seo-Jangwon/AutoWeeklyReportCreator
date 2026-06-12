import { useMemo, useRef, useEffect, useLayoutEffect, useState, useCallback } from 'react'
import {
  Plus, ZoomIn, ZoomOut, Pencil, Trash2, Download, Check,
  ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, LocateFixed,
} from 'lucide-react'
import Modal, { ModalFooter } from './Modal'
import { C, projectColor } from '../utils/colors'
import { toISO, fmtDateStr, parseDate } from '../utils/dates'
import { getTasks, getDueDates, getMilestones, genId } from '../utils/data'
import { renderLines } from '../utils/content'

const LABEL_W    = 200
const HEADER_H   = 30
const SWIM_HDR   = 30
const MS_HDR     = 24
const LOOSE_HDR  = 18
const ROW_H      = 32
const ROW_H_TALL = 46
const ZOOM_PX    = [4, 8, 14, 20, 30, 40]
const UNASSIGNED = '(미지정)'

function getTaskH(t) { return ((t.notes || '').trim() || t.title.includes('\n')) ? ROW_H_TALL : ROW_H }

function addDaysISO(s, n) {
  const d = parseDate(s)
  if (!d) return s
  d.setDate(d.getDate() + n)
  return toISO(d)
}

// Rough text width: CJK glyphs ≈ fontSize, latin ≈ 0.62 × fontSize
function estTextW(s, fs = 10) {
  let w = 0
  for (const ch of s) w += ch.codePointAt(0) >= 0x1100 ? fs : fs * 0.62
  return w
}
function truncToWidth(s, maxW, fs = 10) {
  let w = 0, out = ''
  for (const ch of s) {
    const cw = ch.codePointAt(0) >= 0x1100 ? fs : fs * 0.62
    if (w + cw > maxW) return out + '…'
    w += cw
    out += ch
  }
  return out
}

// ── Import Dialog ──────────────────────────────────────────────────────────────
function ImportDialog({ data, existingTasks, onClose, onImport }) {
  const allEntries = useMemo(() => {
    const result = []
    for (const [, wkData] of Object.entries(data.weeks || {})) {
      for (const [ds, entries] of Object.entries(wkData.entries || {})) {
        for (const e of (entries || [])) {
          result.push({ ds, project: e.project || '', text: e.title ?? e.text ?? '', notes: e.content || '', milestoneId: e.milestoneId || null })
        }
      }
    }
    return result.sort((a, b) => a.ds.localeCompare(b.ds))
  }, [data])

  const existingSet = useMemo(
    () => new Set(existingTasks.map(t => `${t.startDate}|${t.title}`)),
    [existingTasks]
  )

  const allKeys = useMemo(() => allEntries.map(e => `${e.ds}|${e.project}|${e.text}`), [allEntries])
  const [checked, setChecked] = useState(() => new Set())

  const toggle = (key) => setChecked(prev => {
    const next = new Set(prev)
    next.has(key) ? next.delete(key) : next.add(key)
    return next
  })

  const allChecked = allEntries.length > 0 && checked.size === allEntries.length

  const submit = () => {
    const tasks = allEntries
      .filter((_, i) => checked.has(allKeys[i]))
      .map(e => ({
        id: genId(),
        project: e.project,
        title: e.text,
        notes: e.notes || '',
        startDate: e.ds,
        endDate: e.ds,
        predecessors: [],
        dueDateId: null,
        milestoneId: e.milestoneId || null,
        done: true,
        completedAt: e.ds,
      }))
    onImport(tasks)
  }

  const byDate = useMemo(() => {
    const groups = {}
    allEntries.forEach((e, i) => {
      if (!groups[e.ds]) groups[e.ds] = []
      groups[e.ds].push({ ...e, key: allKeys[i] })
    })
    return Object.entries(groups)
  }, [allEntries, allKeys])

  return (
    <Modal title="주간 항목에서 가져오기" onClose={onClose} width={540}>
      <div style={{ padding: '14px 20px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {allEntries.length === 0 ? (
          <p style={{ color: C.fg3, fontSize: 12, textAlign: 'center', padding: '24px 0' }}>가져올 주간 항목이 없습니다</p>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: C.fg3, fontSize: 11 }}>총 {allEntries.length}개 항목</span>
              <button
                onClick={() => setChecked(allChecked ? new Set() : new Set(allKeys))}
                style={{ color: C.accent, fontSize: 11, background: 'transparent', cursor: 'pointer' }}
              >{allChecked ? '전체 해제' : '전체 선택'}</button>
            </div>
            <div style={{ maxHeight: 340, overflowY: 'auto', background: C.bg3, borderRadius: 6, padding: '3px 0' }}>
              {byDate.map(([ds, items]) => (
                <div key={ds}>
                  <div style={{
                    padding: '4px 10px', background: C.bg2,
                    color: C.fg3, fontSize: 10, fontWeight: 600, letterSpacing: 0.5,
                  }}>{ds}</div>
                  {items.map(e => {
                    const col = projectColor(e.project)
                    const isChecked = checked.has(e.key)
                    const isDupe = existingSet.has(`${e.ds}|${e.text}`)
                    return (
                      <label
                        key={e.key}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '5px 10px', cursor: 'pointer',
                          background: isChecked ? `${col}18` : 'transparent',
                          opacity: isDupe ? 0.45 : 1,
                          transition: 'background 0.1s',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggle(e.key)}
                          style={{ accentColor: col, width: 13, height: 13 }}
                        />
                        {e.project && (
                          <span style={{
                            background: `${col}22`, color: col, fontSize: 10, fontWeight: 600,
                            padding: '1px 5px', borderRadius: 3, border: `1px solid ${col}33`,
                            flexShrink: 0,
                          }}>{e.project}</span>
                        )}
                        <span style={{
                          color: C.fg2, fontSize: 11, flex: 1,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{e.text}</span>
                        {isDupe && <span style={{ color: C.fg3, fontSize: 10, flexShrink: 0 }}>중복</span>}
                      </label>
                    )
                  })}
                </div>
              ))}
            </div>
            <span style={{ color: C.fg3, fontSize: 10 }}>
              * 가져온 항목은 시작일 = 종료일로 설정됩니다. 이후 수정 가능합니다.
            </span>
          </>
        )}
      </div>
      <ModalFooter onClose={onClose} onSubmit={submit} submitText={`가져오기 (${checked.size})`} />
    </Modal>
  )
}

// ── Flow Controls ──────────────────────────────────────────────────────────────
function FlowControls({ zoomIdx, onZoomIn, onZoomOut, allCollapsed, onToggleAll, onToday, onAdd, onImport }) {
  const btnBase = {
    background: C.bg3, color: C.fg2, borderRadius: 5,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, transition: 'background 0.1s, color 0.1s',
  }
  const hov = (e) => { e.currentTarget.style.background = '#45475a'; e.currentTarget.style.color = C.fg }
  const unv = (e) => { e.currentTarget.style.background = C.bg3; e.currentTarget.style.color = C.fg2 }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
      <span style={{ color: C.accent2, fontWeight: 700, fontSize: 12 }}>플로우</span>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 10 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: C.fg3, fontSize: 10 }}>
          <span style={{ width: 7, height: 7, background: '#94e2d5', transform: 'rotate(45deg)', display: 'inline-block', borderRadius: 1 }} />
          마일스톤
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: C.fg3, fontSize: 10 }}>
          <span style={{ color: '#f9e2af', fontSize: 11, lineHeight: 1 }}>⚑</span>
          마감일
        </span>
        <span style={{ color: C.fg3, fontSize: 10, opacity: 0.7 }}>막대 드래그: 이동 · 가장자리: 기간 조절 · Ctrl+휠: 줌</span>
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
        <button style={btnBase} onClick={onToggleAll} onMouseEnter={hov} onMouseLeave={unv} title={allCollapsed ? '전체 펼치기' : '전체 접기'}>
          {allCollapsed ? <ChevronsUpDown size={13} strokeWidth={2} /> : <ChevronsDownUp size={13} strokeWidth={2} />}
        </button>
        <button style={btnBase} onClick={onToday} onMouseEnter={hov} onMouseLeave={unv} title="오늘로 이동">
          <LocateFixed size={13} strokeWidth={2} />
        </button>
        <button style={btnBase} onClick={onZoomOut} onMouseEnter={hov} onMouseLeave={unv} title="축소">
          <ZoomOut size={13} strokeWidth={2} />
        </button>
        <span style={{ color: C.fg3, fontSize: 11, width: 42, textAlign: 'center' }}>{ZOOM_PX[zoomIdx]}px/일</span>
        <button style={btnBase} onClick={onZoomIn} onMouseEnter={hov} onMouseLeave={unv} title="확대">
          <ZoomIn size={13} strokeWidth={2} />
        </button>
        <button
          onClick={onImport}
          style={{
            background: C.bg3, color: C.fg2, fontSize: 11,
            padding: '5px 12px', borderRadius: 5,
            display: 'flex', alignItems: 'center', gap: 5,
            transition: 'background 0.1s',
          }}
          onMouseEnter={hov} onMouseLeave={unv}
          title="주간 항목에서 가져오기"
        >
          <Download size={12} strokeWidth={2.5} /><span>가져오기</span>
        </button>
        <button
          onClick={onAdd}
          style={{
            background: C.bg3, color: C.fg, fontSize: 11,
            padding: '5px 12px', borderRadius: 5,
            display: 'flex', alignItems: 'center', gap: 5,
            transition: 'background 0.1s, transform 0.1s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#45475a'; e.currentTarget.style.transform = 'translateY(-1px)' }}
          onMouseLeave={e => { e.currentTarget.style.background = C.bg3; e.currentTarget.style.transform = '' }}
        >
          <Plus size={12} strokeWidth={2.5} /><span>작업 추가</span>
        </button>
      </div>
    </div>
  )
}

// ── Task Detail Panel ─────────────────────────────────────────────────────────
function TaskDetailPanel({ task, tasks, dueDates, milestones, onEdit, onDelete, onClose }) {
  const col      = projectColor(task.project)
  const titleLines = task.title.split('\n')
  const mainTitle  = titleLines[0]
  const allContent = [
    ...titleLines.slice(1),
    ...(task.notes || '').split('\n'),
  ].filter(l => l.trim()).join('\n')
  const hasContent = allContent.length > 0
  const predTasks = (task.predecessors || []).map(id => tasks.find(t => t.id === id)).filter(Boolean)
  const linkedDD  = task.dueDateId   ? dueDates.find(d => d.id === task.dueDateId)   : null
  const linkedMS  = task.milestoneId ? milestones.find(m => m.id === task.milestoneId) : null

  return (
    <Modal title="작업 상세" onClose={onClose} width={420}>
      <div style={{ padding: '16px 20px 4px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          {task.project && (
            <div style={{ color: col, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>{task.project}</div>
          )}
          <div style={{ color: C.fg, fontSize: 15, fontWeight: 700, lineHeight: 1.35 }}>{mainTitle}</div>
        </div>

        {hasContent && (
          <div style={{ background: C.bg3, borderRadius: 6, padding: '9px 12px' }}>
            {renderLines(allContent, { fontSize: 12, lineHeight: 1.6 })}
          </div>
        )}

        <div style={{ color: C.fg3, fontSize: 11 }}>
          {fmtDateStr(task.startDate)} ~ {fmtDateStr(task.endDate)}
        </div>

        {predTasks.length > 0 && (
          <div>
            <div style={{ color: C.fg3, fontSize: 10, fontWeight: 600, marginBottom: 5 }}>선행 작업</div>
            {predTasks.map(pt => {
              const pc = projectColor(pt.project)
              return (
                <div key={pt.id} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                  <div style={{ width: 3, height: 12, borderRadius: 2, background: pc, flexShrink: 0 }} />
                  <span style={{ color: C.fg2, fontSize: 11 }}>{pt.title}</span>
                  <span style={{ color: C.fg3, fontSize: 10, marginLeft: 'auto' }}>{fmtDateStr(pt.startDate)}</span>
                </div>
              )
            })}
          </div>
        )}

        {(linkedDD || linkedMS) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {linkedDD && (
              <span style={{ fontSize: 11, color: '#f9e2af', background: '#f9e2af18', padding: '3px 8px', borderRadius: 4 }}>
                ⚑ {linkedDD.task} → {fmtDateStr(linkedDD.date)}
              </span>
            )}
            {linkedMS && (
              <span style={{ fontSize: 11, color: '#94e2d5', background: '#94e2d518', padding: '3px 8px', borderRadius: 4 }}>
                ◆ {linkedMS.detail} → {fmtDateStr(linkedMS.target)}
              </span>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '10px 20px 16px' }}>
        <button
          onClick={() => { onDelete(task.id); onClose() }}
          style={{
            background: 'rgba(243,139,168,0.12)', color: C.warn,
            padding: '6px 16px', borderRadius: 6, fontSize: 12, transition: 'background 0.1s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(243,139,168,0.22)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(243,139,168,0.12)'}
        >삭제</button>
        <button
          onClick={() => { onEdit(task); onClose() }}
          style={{
            background: C.accent, color: C.bg2,
            padding: '6px 18px', borderRadius: 6, fontSize: 12, fontWeight: 700, transition: 'background 0.1s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#a0c4ff'}
          onMouseLeave={e => e.currentTarget.style.background = C.accent}
        >수정</button>
      </div>
    </Modal>
  )
}

// ── Label column rows ──────────────────────────────────────────────────────────
function ProjectHeaderRow({ lane, color, onToggle, onAdd }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onClick={onToggle}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        height: SWIM_HDR, boxSizing: 'border-box',
        display: 'flex', alignItems: 'center', gap: 5, padding: '0 8px 0 5px',
        background: hov ? `${color}1e` : `${color}12`,
        boxShadow: `inset 0 -1px 0 ${C.bg3}66`,
        cursor: 'pointer', userSelect: 'none',
      }}
      title={lane.isCollapsed ? '펼치기' : '접기'}
    >
      {lane.isCollapsed
        ? <ChevronRight size={12} strokeWidth={2.5} style={{ color: C.fg3, flexShrink: 0 }} />
        : <ChevronDown size={12} strokeWidth={2.5} style={{ color: C.fg3, flexShrink: 0 }} />}
      <span style={{
        color, fontWeight: 700, fontSize: 11, flex: 1,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{lane.name}</span>
      {lane.total > 0 && (
        <span style={{
          color: C.fg3, fontSize: 9, fontWeight: 700, flexShrink: 0,
          background: C.bg3, padding: '1px 6px', borderRadius: 8,
        }}>{lane.total}</span>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); onAdd() }}
        style={{ color: C.fg3, background: 'transparent', flexShrink: 0, lineHeight: 1, padding: 2 }}
        onMouseEnter={e => e.currentTarget.style.color = color}
        onMouseLeave={e => e.currentTarget.style.color = C.fg3}
        title="이 프로젝트에 작업 추가"
      ><Plus size={11} strokeWidth={2.5} /></button>
    </div>
  )
}

function MilestoneHeaderRow({ group, color, todayISO, onEditMilestone, onAddTask }) {
  const [hov, setHov] = useState(false)
  const { ms, tasks } = group
  const overdue = !!ms.target && !ms.done && ms.target < todayISO
  const dispCol = overdue ? C.warn : color
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => onEditMilestone?.(ms.id)}
      style={{
        height: MS_HDR, boxSizing: 'border-box',
        display: 'flex', alignItems: 'center', gap: 6, padding: '0 8px 0 16px',
        background: hov ? `${color}14` : `${color}08`,
        boxShadow: `inset 0 -1px 0 ${C.bg3}44`,
        cursor: 'pointer', userSelect: 'none',
      }}
      title={`마일스톤: ${ms.detail} → ${fmtDateStr(ms.target)}${ms.done ? ' (완료)' : overdue ? ' (지남)' : ''}`}
    >
      <span style={{
        width: 7, height: 7, background: ms.done ? `${dispCol}55` : dispCol,
        transform: 'rotate(45deg)', flexShrink: 0, borderRadius: 1,
      }} />
      <span style={{
        color: ms.done ? C.fg3 : dispCol, fontSize: 10.5, fontWeight: 600, flex: 1,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        textDecoration: ms.done ? 'line-through' : 'none',
      }}>{ms.detail}</span>
      {ms.done && <Check size={10} strokeWidth={3} style={{ color: C.success, flexShrink: 0 }} />}
      {tasks.length > 0 && (
        <span style={{
          color: C.fg3, fontSize: 9, fontWeight: 700, flexShrink: 0,
          background: C.bg3, padding: '1px 5px', borderRadius: 8,
        }}>{tasks.length}</span>
      )}
      {hov && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); onEditMilestone?.(ms.id) }}
            style={{ color: C.fg3, background: 'transparent', padding: 2, flexShrink: 0, lineHeight: 1 }}
            onMouseEnter={e => e.currentTarget.style.color = C.accent}
            onMouseLeave={e => e.currentTarget.style.color = C.fg3}
            title="마일스톤 수정"
          ><Pencil size={10} strokeWidth={2} /></button>
          <button
            onClick={(e) => { e.stopPropagation(); onAddTask() }}
            style={{ color: C.fg3, background: 'transparent', padding: 2, flexShrink: 0, lineHeight: 1 }}
            onMouseEnter={e => e.currentTarget.style.color = color}
            onMouseLeave={e => e.currentTarget.style.color = C.fg3}
            title="이 마일스톤에 작업 추가"
          ><Plus size={11} strokeWidth={2.5} /></button>
        </>
      )}
    </div>
  )
}

function TaskLabelRow({ task, indent, dueDates, milestones, onEdit, onDelete, onDetail, hoveredId, connectedIds, onHover, h }) {
  const [hov, setHov] = useState(false)
  const col      = projectColor(task.project)
  const linkedDD = task.dueDateId   ? dueDates.find(d => d.id === task.dueDateId)     : null
  const linkedMS = task.milestoneId ? milestones.find(m => m.id === task.milestoneId) : null
  const isDimmed = hoveredId && connectedIds && !connectedIds.has(task.id)
  const titleLines = task.title.split('\n')
  const displayTitle = titleLines[0]
  const contentLines = [...titleLines.slice(1), ...(task.notes || '').split('\n')].filter(l => l.trim())
  const contentPreview = (contentLines[0] || '').replace(/^[-•]\s*/, '')
  const hasContent = contentPreview.length > 0

  return (
    <div
      onClick={() => onDetail(task)}
      onMouseEnter={() => { setHov(true); onHover(task.id) }}
      onMouseLeave={() => { setHov(false); onHover(null) }}
      style={{
        height: h, boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: hasContent ? `4px 8px 4px ${indent}px` : `0 8px 0 ${indent}px`, gap: 2,
        background: hov ? `${C.bg3}66` : 'transparent',
        cursor: 'pointer', transition: 'background 0.1s, opacity 0.12s',
        boxShadow: `inset 0 -1px 0 ${C.bg3}33`,
        opacity: isDimmed ? 0.22 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <div style={{ width: 3, height: 14, borderRadius: 2, background: col, flexShrink: 0 }} />
        <span style={{
          flex: 1, color: C.fg2, fontSize: 11,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{displayTitle}</span>
        {linkedDD && (
          <span
            title={`마감: ${linkedDD.task} → ${fmtDateStr(linkedDD.date)}`}
            style={{ fontSize: 9, color: '#f9e2af', background: '#f9e2af22', borderRadius: 2, padding: '1px 4px', flexShrink: 0, fontWeight: 700 }}
          >⚑</span>
        )}
        {linkedMS && (
          <span
            title={`마일스톤: ${linkedMS.detail} → ${fmtDateStr(linkedMS.target)}`}
            style={{ fontSize: 9, color: '#94e2d5', background: '#94e2d522', borderRadius: 2, padding: '1px 4px', flexShrink: 0, fontWeight: 700 }}
          >◆</span>
        )}
        {hov && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(task) }}
              style={{ color: C.fg3, background: 'transparent', padding: '2px 3px', flexShrink: 0, lineHeight: 1 }}
              onMouseEnter={e => e.currentTarget.style.color = C.accent}
              onMouseLeave={e => e.currentTarget.style.color = C.fg3}
            ><Pencil size={11} strokeWidth={2} /></button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(task.id) }}
              style={{ color: C.fg3, background: 'transparent', padding: '2px 3px', flexShrink: 0, lineHeight: 1 }}
              onMouseEnter={e => e.currentTarget.style.color = C.warn}
              onMouseLeave={e => e.currentTarget.style.color = C.fg3}
            ><Trash2 size={11} strokeWidth={2} /></button>
          </>
        )}
      </div>
      {hasContent && (
        <div style={{
          marginLeft: 8, color: C.fg3, fontSize: 9, lineHeight: 1.3,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          opacity: 0.7,
        }}>{contentPreview}</div>
      )}
    </div>
  )
}

// ── Main FlowView ──────────────────────────────────────────────────────────────
export default function FlowView({ data, onAdd, onEdit, onUpdate, onDelete, onImport, onEditMilestone, onEditDueDate }) {
  const tasks      = getTasks(data)
  const dueDates   = getDueDates(data)
  const milestones = getMilestones(data)
  const [zoomIdx, setZoomIdx]       = useState(3)
  const [showImport, setShowImport] = useState(false)
  const [detailTask, setDetailTask] = useState(null)
  const [hoveredId, setHoveredId]   = useState(null)
  const [collapsed, setCollapsed]   = useState(() => new Set())
  const [drag, setDrag]             = useState(null) // { id, mode: 'move'|'l'|'r', x0, delta, moved }
  const dayW         = ZOOM_PX[zoomIdx]
  const containerRef = useRef(null)
  const zoomAnchor   = useRef(null)
  const todayISO     = toISO(new Date())

  // Viewport size — chart always fills the visible area even when zoomed out
  const [viewSize, setViewSize] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => setViewSize({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const handleHover = useCallback((id) => setHoveredId(id), [])
  const handleImport = (newTasks) => { onImport(newTasks); setShowImport(false) }

  // Zoom keeping the date at the viewport center fixed
  const changeZoom = (dir) => {
    const ni = Math.min(ZOOM_PX.length - 1, Math.max(0, zoomIdx + dir))
    if (ni === zoomIdx) return
    const el = containerRef.current
    if (el) {
      const viewW = el.clientWidth - LABEL_W
      zoomAnchor.current = { days: (el.scrollLeft + viewW / 2) / dayW, viewW }
    }
    setZoomIdx(ni)
  }
  const changeZoomRef = useRef(changeZoom)
  changeZoomRef.current = changeZoom

  // Ctrl + wheel zoom
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      changeZoomRef.current(e.deltaY < 0 ? 1 : -1)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // Apply in-progress drag to a task's dates
  function effTask(t) {
    if (!drag || drag.id !== t.id || !drag.delta) return t
    if (drag.mode === 'move') {
      return { ...t, startDate: addDaysISO(t.startDate, drag.delta), endDate: addDaysISO(t.endDate, drag.delta) }
    }
    if (drag.mode === 'l') {
      const ns = addDaysISO(t.startDate, drag.delta)
      return { ...t, startDate: ns > t.endDate ? t.endDate : ns }
    }
    const ne = addDaysISO(t.endDate, drag.delta)
    return { ...t, endDate: ne < t.startDate ? t.startDate : ne }
  }

  // IDs reachable from hoveredId (self + predecessors + successors)
  const connectedIds = useMemo(() => {
    if (!hoveredId) return null
    const task = tasks.find(t => t.id === hoveredId)
    if (!task) return null
    const ids = new Set([hoveredId])
    ;(task.predecessors || []).forEach(id => ids.add(id))
    tasks.forEach(t => { if ((t.predecessors || []).includes(hoveredId)) ids.add(t.id) })
    return ids
  }, [hoveredId, tasks])

  // ── Lanes: project → { milestone groups, loose tasks, header due-date flags }
  const lanes = useMemo(() => {
    const order = []
    const seen  = new Set()
    const push  = (p) => { const k = (p || '').trim() || UNASSIGNED; if (!seen.has(k)) { seen.add(k); order.push(k) } }
    tasks.forEach(t => push(t.project))
    milestones.forEach(m => push(m.project))
    dueDates.forEach(d => push(d.project))

    const linkedDDIds = new Set(tasks.map(t => t.dueDateId).filter(Boolean))
    const byStart = (a, b) => a.startDate.localeCompare(b.startDate)

    return order.map(name => {
      const laneTasks = tasks.filter(t => ((t.project || '').trim() || UNASSIGNED) === name)
      const laneMs    = milestones
        .filter(m => ((m.project || '').trim() || UNASSIGNED) === name)
        .sort((a, b) => (a.target || '').localeCompare(b.target || ''))
      const groups = laneMs.map(ms => ({
        ms,
        tasks: laneTasks.filter(t => t.milestoneId === ms.id).sort(byStart),
      }))
      const groupedIds = new Set(groups.flatMap(g => g.tasks.map(t => t.id)))
      const loose = laneTasks.filter(t => !groupedIds.has(t.id)).sort(byStart)
      const headerDDs = dueDates.filter(d =>
        ((d.project || '').trim() || UNASSIGNED) === name && !linkedDDIds.has(d.id)
      )
      return {
        name,
        tasks: laneTasks,
        groups,
        loose,
        headerDDs,
        total: laneTasks.length,
      }
    }).filter(l => l.total > 0 || l.groups.length > 0 || l.headerDDs.length > 0)
  }, [tasks, milestones, dueDates])

  const laneNames    = lanes.map(l => l.name)
  const allCollapsed = laneNames.length > 0 && laneNames.every(n => collapsed.has(n))
  const toggleLane   = (name) => setCollapsed(prev => {
    const next = new Set(prev)
    next.has(name) ? next.delete(name) : next.add(name)
    return next
  })
  const toggleAll = () => setCollapsed(allCollapsed ? new Set() : new Set(laneNames))

  // ── Time range: tasks + milestone targets + due dates + padding
  const { rangeStart, totalDays } = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const allDates = [
      ...tasks.flatMap(t => [parseDate(t.startDate), parseDate(t.endDate)]),
      ...milestones.filter(m => m.target).map(m => parseDate(m.target)),
      ...dueDates.filter(d => d.date).map(d => parseDate(d.date)),
    ].filter(Boolean)
    if (!allDates.length) {
      const s = new Date(today); s.setDate(today.getDate() - 14)
      return { rangeStart: s, totalDays: 70 }
    }
    const minD = new Date(Math.min(...allDates, today))
    const maxD = new Date(Math.max(...allDates, today))
    minD.setDate(minD.getDate() - 7)
    maxD.setDate(maxD.getDate() + 21)
    return { rangeStart: minD, totalDays: Math.max(70, Math.ceil((maxD - minD) / 86400000)) }
  }, [tasks, milestones, dueDates])

  function dateToX(dateStr) {
    const d = parseDate(dateStr)
    if (!d) return 0
    return Math.round((d - rangeStart) / 86400000) * dayW
  }

  // Extend the chart so it always fills the viewport (zoomed out or short data)
  const fillDays   = viewSize.w > 0 ? Math.ceil((viewSize.w - LABEL_W) / dayW) + 1 : 0
  const renderDays = Math.max(totalDays, fillDays)

  // ── Row layout (label column and SVG share these y positions)
  const layout = useMemo(() => {
    let y = HEADER_H
    const outLanes = lanes.map(lane => {
      const top = y
      const isCollapsed = collapsed.has(lane.name)
      const rows = []
      y += SWIM_HDR
      if (!isCollapsed) {
        for (const g of lane.groups) {
          const msRow = { kind: 'ms', group: g, y, h: MS_HDR, bottom: 0 }
          rows.push(msRow)
          y += MS_HDR
          for (const t of g.tasks) {
            const h = getTaskH(t)
            rows.push({ kind: 'task', task: t, group: g, y, h })
            y += h
          }
          msRow.bottom = y
        }
        if (lane.groups.length > 0 && lane.loose.length > 0) {
          rows.push({ kind: 'loose', y, h: LOOSE_HDR })
          y += LOOSE_HDR
        }
        for (const t of lane.loose) {
          const h = getTaskH(t)
          rows.push({ kind: 'task', task: t, y, h })
          y += h
        }
      }
      return { ...lane, top, rows, height: y - top, isCollapsed }
    })
    return { lanes: outLanes, totalH: y + 10 }
  }, [lanes, collapsed])

  // ── Bar positions keyed by task id (drag-aware)
  const posMap = useMemo(() => {
    const map = {}
    for (const lane of layout.lanes) {
      for (const r of lane.rows) {
        if (r.kind !== 'task') continue
        const t  = effTask(r.task)
        const x1 = dateToX(t.startDate)
        const x2 = dateToX(t.endDate) + dayW
        map[r.task.id] = { x1, x2, w: Math.max(x2 - x1, dayW), cy: r.y + r.h / 2, rowY: r.y, h: r.h }
      }
    }
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, dayW, rangeStart, drag])

  // ── Month marks
  const monthMarks = useMemo(() => {
    const marks = []
    const d = new Date(rangeStart); d.setDate(1)
    for (let i = 0; i < 120; i++) {
      const x = Math.round((d - rangeStart) / 86400000) * dayW
      if (x > renderDays * dayW) break
      if (x >= 0) marks.push({ x, label: `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}` })
      d.setMonth(d.getMonth() + 1)
    }
    return marks
  }, [rangeStart, renderDays, dayW])

  // ── Monday lines — show MM/DD date label when zoom >= 14px/day
  const weekLines = useMemo(() => {
    const lines = []
    const d = new Date(rangeStart)
    const dow = d.getDay()
    d.setDate(d.getDate() + (dow === 1 ? 0 : ((8 - dow) % 7 || 7)))
    for (let i = 0; i <= renderDays / 7 + 1; i++) {
      const x = Math.round((d - rangeStart) / 86400000) * dayW
      if (x >= 0 && x <= renderDays * dayW) {
        lines.push({
          x,
          dateLabel: dayW >= 14
            ? `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
            : null,
        })
      }
      d.setDate(d.getDate() + 7)
    }
    return lines
  }, [rangeStart, renderDays, dayW])

  // ── Weekend shading (visible at 8px/day and above)
  const weekendBands = useMemo(() => {
    if (dayW < 8) return []
    const bands = []
    const d = new Date(rangeStart)
    // jump to first Saturday
    d.setDate(d.getDate() + ((6 - d.getDay()) % 7))
    while ((d - rangeStart) / 86400000 <= renderDays) {
      const x = Math.round((d - rangeStart) / 86400000) * dayW
      bands.push({ x, w: dayW * 2 })
      d.setDate(d.getDate() + 7)
    }
    return bands
  }, [rangeStart, renderDays, dayW])

  // ── Dependency arrows
  const arrows = useMemo(() => {
    const result = []
    for (const t of tasks) {
      for (const predId of (t.predecessors || [])) {
        const from = posMap[predId]
        const to   = posMap[t.id]
        if (!from || !to) continue
        const x1 = from.x2, y1 = from.cy
        const x2 = to.x1,   y2 = to.cy
        let pathD, arrowDir
        if (x2 >= x1 + 4) {
          const midX = (x1 + x2) / 2
          pathD = `M${x1},${y1} H${midX} V${y2} H${x2}`
          arrowDir = 'right'
        } else {
          const elbowX = Math.max(x1, x2) + Math.max(dayW * 2, 24)
          pathD = `M${x1},${y1} H${elbowX} V${y2} H${x2}`
          arrowDir = 'left'
        }
        result.push({ predId, succId: t.id, pathD, x2, y2, arrowDir, col: projectColor(t.project) })
      }
    }
    return result
  }, [tasks, posMap, dayW])

  const todayX     = dateToX(todayISO)
  const svgW       = renderDays * dayW
  const svgH       = Math.max(layout.totalH, viewSize.h > 0 ? viewSize.h - 2 : 0)
  const emptyState = layout.lanes.length === 0

  const scrollToToday = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const viewW = el.clientWidth - LABEL_W
    el.scrollLeft = Math.max(0, todayX - viewW * 0.33)
  }, [todayX])

  // After a zoom change, restore the anchored center date; on first mount, jump to today
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    if (zoomAnchor.current) {
      const { days, viewW } = zoomAnchor.current
      zoomAnchor.current = null
      el.scrollLeft = Math.max(0, days * dayW - viewW / 2)
    } else {
      scrollToToday()
    }
  }, [zoomIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Drag handlers (move / resize bars, click = detail)
  const startDrag = (e, t, mode) => {
    if (e.button !== 0) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setDrag({ id: t.id, mode, x0: e.clientX, delta: 0, moved: false })
  }
  const moveDrag = (e) => {
    if (!drag) return
    const dx = e.clientX - drag.x0
    const delta = Math.round(dx / dayW)
    const moved = drag.moved || Math.abs(dx) > 3
    if (delta !== drag.delta || moved !== drag.moved) setDrag({ ...drag, delta, moved })
  }
  const endDrag = (e, t) => {
    if (!drag || drag.id !== t.id) return
    if (drag.moved && drag.delta !== 0) onUpdate?.(effTask(t))
    else if (!drag.moved) setDetailTask(t)
    setDrag(null)
  }

  // ── Due-date flag (deadline marker) ─────────────────────────────────────────
  const renderFlag = (key, x, cy, col, { faded = false, title = '', onClick = null } = {}) => (
    <g
      key={key}
      opacity={faded ? 0.35 : 0.95}
      style={onClick ? { cursor: 'pointer' } : undefined}
      onClick={onClick || undefined}
    >
      <line x1={x} y1={cy - 8} x2={x} y2={cy + 7} stroke={col} strokeWidth={1.5} />
      <path d={`M${x},${cy - 8} L${x + 8},${cy - 5} L${x},${cy - 2} Z`} fill={col} />
      <title>{title}</title>
    </g>
  )

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '10px 18px', gap: 10 }}>
      <FlowControls
        zoomIdx={zoomIdx} onZoomIn={() => changeZoom(1)} onZoomOut={() => changeZoom(-1)}
        allCollapsed={allCollapsed} onToggleAll={toggleAll}
        onToday={scrollToToday}
        onAdd={() => onAdd('')}
        onImport={() => setShowImport(true)}
      />

      {showImport && (
        <ImportDialog data={data} existingTasks={tasks} onClose={() => setShowImport(false)} onImport={handleImport} />
      )}

      {detailTask && (
        <TaskDetailPanel
          task={detailTask} tasks={tasks} dueDates={dueDates} milestones={milestones}
          onEdit={onEdit} onDelete={onDelete}
          onClose={() => setDetailTask(null)}
        />
      )}

      <div
        ref={containerRef}
        style={{
          flex: 1, overflow: 'auto',
          borderRadius: 9, border: `1px solid ${C.bg3}`,
          background: C.bg2, boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}
      >
        {emptyState ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.fg3, fontSize: 13 }}>
            작업을 추가하거나 주간 항목에서 가져와서 플로우 차트를 시작하세요
          </div>
        ) : (
          <div style={{ display: 'flex', width: LABEL_W + svgW, height: svgH, minHeight: '100%' }}>

            {/* ── Sticky label column ── */}
            <div style={{
              position: 'sticky', left: 0, zIndex: 10,
              width: LABEL_W, flexShrink: 0,
              borderRight: `1px solid ${C.bg3}`,
              background: C.bg2,
              height: svgH,
            }}>
              {/* Header */}
              <div style={{
                height: HEADER_H, boxSizing: 'border-box',
                boxShadow: `inset 0 -1px 0 ${C.bg3}`,
                display: 'flex', alignItems: 'center', padding: '0 12px',
              }}>
                <span style={{ color: C.fg3, fontSize: 10, fontWeight: 600, letterSpacing: 0.5 }}>프로젝트 / 마일스톤 / 작업</span>
              </div>

              {layout.lanes.map(lane => {
                const col = projectColor(lane.name === UNASSIGNED ? '' : lane.name)
                return (
                  <div key={lane.name} style={{ boxShadow: `inset 0 -1px 0 ${C.bg3}` }}>
                    <ProjectHeaderRow
                      lane={lane} color={col}
                      onToggle={() => toggleLane(lane.name)}
                      onAdd={() => onAdd(lane.name === UNASSIGNED ? '' : lane.name)}
                    />
                    {lane.rows.map((r, i) => {
                      if (r.kind === 'ms') {
                        return (
                          <MilestoneHeaderRow
                            key={`ms-${r.group.ms.id}`}
                            group={r.group} color={col} todayISO={todayISO}
                            onEditMilestone={onEditMilestone}
                            onAddTask={() => onAdd(lane.name === UNASSIGNED ? '' : lane.name, r.group.ms.id)}
                          />
                        )
                      }
                      if (r.kind === 'loose') {
                        return (
                          <div key={`loose-${i}`} style={{
                            height: LOOSE_HDR, boxSizing: 'border-box',
                            display: 'flex', alignItems: 'center', padding: '0 8px 0 16px',
                            boxShadow: `inset 0 -1px 0 ${C.bg3}33`,
                          }}>
                            <span style={{ color: C.fg3, fontSize: 9, fontWeight: 600, letterSpacing: 0.5, opacity: 0.7 }}>기타 작업</span>
                          </div>
                        )
                      }
                      return (
                        <TaskLabelRow
                          key={r.task.id} task={r.task} h={r.h}
                          indent={r.group ? 22 : 10}
                          dueDates={dueDates} milestones={milestones}
                          onEdit={onEdit} onDelete={onDelete}
                          onDetail={setDetailTask}
                          hoveredId={hoveredId} connectedIds={connectedIds}
                          onHover={handleHover}
                        />
                      )
                    })}
                  </div>
                )
              })}
            </div>

            {/* ── SVG timeline ── */}
            <svg
              width={svgW} height={svgH}
              style={{ display: 'block', flexShrink: 0, touchAction: 'none' }}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Header bg */}
              <rect x={0} y={0} width={svgW} height={HEADER_H} fill="#252537" />

              {/* Weekend shading */}
              {weekendBands.map((b, i) => (
                <rect key={i} x={b.x} y={HEADER_H} width={b.w} height={svgH - HEADER_H} fill="rgba(0,0,0,0.16)" />
              ))}

              {/* Week grid lines + date labels */}
              {weekLines.map((wl, i) => (
                <g key={i}>
                  <line x1={wl.x} y1={0} x2={wl.x} y2={svgH} stroke={C.bg3} strokeWidth={1} />
                  {wl.dateLabel && (
                    <text x={wl.x + 3} y={HEADER_H - 5} fill={C.fg3} fontSize={9}>{wl.dateLabel}</text>
                  )}
                </g>
              ))}

              {/* Month marks + labels */}
              {monthMarks.map((m, i) => (
                <g key={i}>
                  <line x1={m.x} y1={0} x2={m.x} y2={svgH} stroke={C.fg3} strokeWidth={0.5} opacity={0.25} />
                  <text x={m.x + 5} y={12} fill={C.fg2} fontSize={10} fontWeight={700}>{m.label}</text>
                </g>
              ))}

              {/* Today line */}
              {todayX >= 0 && todayX <= svgW && (
                <g>
                  <line x1={todayX} y1={0} x2={todayX} y2={svgH} stroke={C.accent} strokeWidth={1.5} opacity={0.55} />
                  <text x={todayX + 4} y={HEADER_H - 7} fill={C.accent} fontSize={10} fontWeight={600}>오늘</text>
                </g>
              )}

              {/* ── Lanes ── */}
              {layout.lanes.map(lane => {
                const col = projectColor(lane.name === UNASSIGNED ? '' : lane.name)
                const hdrCy = lane.top + SWIM_HDR / 2

                // Lane span: min/max over tasks, milestone targets, header due dates
                const spanDates = []
                for (const t of lane.tasks) { const e = effTask(t); spanDates.push(e.startDate, e.endDate) }
                for (const g of lane.groups) if (g.ms.target) spanDates.push(g.ms.target)
                for (const d of lane.headerDDs) if (d.date) spanDates.push(d.date)
                const spanMin = spanDates.length ? spanDates.reduce((a, b) => a < b ? a : b) : null
                const spanMax = spanDates.length ? spanDates.reduce((a, b) => a > b ? a : b) : null

                return (
                  <g key={lane.name}>
                    {/* Header band */}
                    <rect x={0} y={lane.top} width={svgW} height={SWIM_HDR} fill={`${col}10`} />
                    <line x1={0} y1={lane.top + lane.height} x2={svgW} y2={lane.top + lane.height} stroke={C.bg3} strokeWidth={1} />

                    {/* Project span line on header row */}
                    {spanMin && spanMax && (
                      <rect
                        x={dateToX(spanMin)} y={hdrCy - 1.5}
                        width={Math.max(dateToX(spanMax) + dayW - dateToX(spanMin), 2)} height={3} rx={1.5}
                        fill={col} opacity={0.3}
                      />
                    )}

                    {/* Collapsed: condensed task strip + milestone diamonds */}
                    {lane.isCollapsed && lane.tasks.map(t => {
                      const e  = effTask(t)
                      const x1 = dateToX(e.startDate)
                      const w  = Math.max(dateToX(e.endDate) + dayW - x1, 2)
                      return (
                        <rect key={t.id} x={x1} y={hdrCy - 3} width={w} height={6} rx={2}
                          fill={col} opacity={0.65}>
                          <title>{t.title}{'\n'}{fmtDateStr(t.startDate)} ~ {fmtDateStr(t.endDate)}</title>
                        </rect>
                      )
                    })}
                    {lane.isCollapsed && lane.groups.map(({ ms }) => {
                      if (!ms.target) return null
                      const x = dateToX(ms.target)
                      const overdue = !ms.done && ms.target < todayISO
                      const mc = overdue ? C.warn : col
                      const sz = 5
                      return (
                        <polygon
                          key={ms.id}
                          points={`${x},${hdrCy - sz} ${x + sz},${hdrCy} ${x},${hdrCy + sz} ${x - sz},${hdrCy}`}
                          fill={mc} opacity={ms.done ? 0.3 : 0.95}
                          style={{ cursor: 'pointer' }}
                          onClick={() => onEditMilestone?.(ms.id)}
                        >
                          <title>마일스톤: {ms.detail} → {fmtDateStr(ms.target)}{ms.done ? ' (완료)' : overdue ? ' (지남)' : ''}</title>
                        </polygon>
                      )
                    })}

                    {/* Unlinked due-date flags on header row */}
                    {lane.headerDDs.map(dd => {
                      if (!dd.date) return null
                      const x = dateToX(dd.date) + dayW
                      const overdue = !dd.done && dd.date < todayISO
                      const fc = dd.done ? C.fg3 : overdue ? C.warn : '#f9e2af'
                      return renderFlag(`hdd-${dd.id}`, x, hdrCy, fc, {
                        faded: dd.done,
                        title: `마감: ${dd.task} → ${fmtDateStr(dd.date)}${dd.done ? ' (완료)' : overdue ? ' (지남)' : ''}`,
                        onClick: () => onEditDueDate?.(dd.id),
                      })
                    })}

                    {/* ── Rows ── */}
                    {lane.rows.map((r, ri) => {
                      // Milestone group row: span bar + diamond + dashed guide through its tasks
                      if (r.kind === 'ms') {
                        const { ms, tasks: gTasks } = r.group
                        if (!ms.target) return null
                        const x  = dateToX(ms.target)
                        const cy = r.y + r.h / 2
                        const overdue = !ms.done && ms.target < todayISO
                        const mc = overdue ? C.warn : col
                        const starts = gTasks.map(t => effTask(t).startDate)
                        const gMin = starts.length ? starts.reduce((a, b) => a < b ? a : b) : null
                        const sz = 5.5
                        return (
                          <g key={`msr-${ms.id}`}>
                            <rect x={0} y={r.y} width={svgW} height={r.h} fill={`${col}06`} />
                            {gMin && dateToX(gMin) < x && (
                              <line x1={dateToX(gMin)} y1={cy} x2={x - sz} y2={cy} stroke={mc} strokeWidth={2} opacity={0.4} />
                            )}
                            {/* dashed guide through this group's task rows */}
                            {r.bottom > r.y + r.h && (
                              <line x1={x} y1={r.y + r.h} x2={x} y2={r.bottom} stroke={mc} strokeWidth={1} opacity={0.3} strokeDasharray="3,3" />
                            )}
                            <polygon
                              points={`${x},${cy - sz} ${x + sz},${cy} ${x},${cy + sz} ${x - sz},${cy}`}
                              fill={ms.done ? 'none' : mc}
                              stroke={mc} strokeWidth={1.5}
                              opacity={ms.done ? 0.45 : 0.95}
                              style={{ cursor: 'pointer' }}
                              onClick={() => onEditMilestone?.(ms.id)}
                            >
                              <title>마일스톤: {ms.detail} → {fmtDateStr(ms.target)}{ms.done ? ' (완료)' : overdue ? ' (지남)' : ''}</title>
                            </polygon>
                            <text x={x + sz + 4} y={cy + 3.5} fill={mc} fontSize={9} fontWeight={600} opacity={0.85}
                              style={{ pointerEvents: 'none', userSelect: 'none' }}>
                              {fmtDateStr(ms.target)}{overdue ? ' 지남' : ''}
                            </text>
                          </g>
                        )
                      }

                      if (r.kind !== 'task') return null

                      // Task bar
                      const t   = r.task
                      const e   = effTask(t)
                      const pos = posMap[t.id]
                      if (!pos) return null
                      const bH  = ROW_H - 10
                      const bY  = r.y + (r.h - bH) / 2
                      const isHov = hoveredId === t.id
                      const isDim = hoveredId && connectedIds && !connectedIds.has(t.id) && !(drag?.id === t.id)
                      const isDragging = drag?.id === t.id && drag.moved
                      const handleW = Math.min(8, pos.w / 3)

                      // Linked due date → flag on this row
                      const dd = t.dueDateId ? dueDates.find(d => d.id === t.dueDateId) : null
                      let ddFlag = null
                      if (dd?.date) {
                        const fx = dateToX(dd.date) + dayW
                        const over = e.endDate > dd.date
                        const fc = over ? C.warn : '#f9e2af'
                        ddFlag = (
                          <g key={`ddf-${t.id}`}>
                            {Math.abs(fx - pos.x2) > 2 && (
                              <line
                                x1={Math.min(fx, pos.x2)} y1={pos.cy} x2={Math.max(fx, pos.x2)} y2={pos.cy}
                                stroke={fc} strokeWidth={1} strokeDasharray="2,2" opacity={0.5}
                              />
                            )}
                            {renderFlag(`f-${t.id}`, fx, pos.cy, fc, {
                              title: `마감: ${dd.task} → ${fmtDateStr(dd.date)}${over ? ' (초과)' : ''}`,
                              onClick: () => onEditDueDate?.(dd.id),
                            })}
                          </g>
                        )
                      }

                      return (
                        <g key={t.id}
                          onMouseEnter={() => setHoveredId(t.id)}
                          onMouseLeave={() => setHoveredId(null)}
                        >
                          {ddFlag}
                          <rect
                            x={pos.x1} y={bY} width={pos.w} height={bH} rx={4}
                            fill={col}
                            fillOpacity={isDim ? 0.15 : 0.8}
                            stroke={isHov || isDragging ? col : 'none'}
                            strokeWidth={2}
                            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                            onPointerDown={(ev) => startDrag(ev, t, 'move')}
                            onPointerMove={moveDrag}
                            onPointerUp={(ev) => endDrag(ev, t)}
                          />
                          {/* resize handles */}
                          <rect
                            x={pos.x1} y={bY} width={handleW} height={bH} fill="transparent"
                            style={{ cursor: 'ew-resize' }}
                            onPointerDown={(ev) => startDrag(ev, t, 'l')}
                            onPointerMove={moveDrag}
                            onPointerUp={(ev) => endDrag(ev, t)}
                          />
                          <rect
                            x={pos.x2 - handleW} y={bY} width={handleW} height={bH} fill="transparent"
                            style={{ cursor: 'ew-resize' }}
                            onPointerDown={(ev) => startDrag(ev, t, 'r')}
                            onPointerMove={moveDrag}
                            onPointerUp={(ev) => endDrag(ev, t)}
                          />
                          {isDragging && (
                            <text
                              x={pos.x1} y={bY - 3}
                              fill={C.fg} fontSize={9} fontWeight={700}
                              stroke="#181825" strokeWidth={3} paintOrder="stroke"
                              style={{ pointerEvents: 'none', userSelect: 'none' }}
                            >{fmtDateStr(e.startDate)} ~ {fmtDateStr(e.endDate)}</text>
                          )}
                        </g>
                      )
                    })}
                  </g>
                )
              })}

              {/* ── Dependency arrows with hover highlight ── */}
              {arrows.map(({ predId, succId, pathD, x2, y2, arrowDir, col }) => {
                const isActive = connectedIds && (connectedIds.has(predId) || connectedIds.has(succId))
                const opacity  = hoveredId ? (isActive ? 0.95 : 0.04) : 0.38
                const stroke   = isActive ? col : C.fg3
                const sw       = isActive ? 2 : 1
                const ah = 5, aw = 3
                const arrowPts = arrowDir === 'right'
                  ? `${x2},${y2} ${x2 - ah},${y2 - aw} ${x2 - ah},${y2 + aw}`
                  : `${x2},${y2} ${x2 + ah},${y2 - aw} ${x2 + ah},${y2 + aw}`
                return (
                  <g key={`${predId}→${succId}`} opacity={opacity} style={{ transition: 'opacity 0.12s', pointerEvents: 'none' }}>
                    <path d={pathD} stroke={stroke} strokeWidth={sw} fill="none" />
                    <polygon points={arrowPts} fill={stroke} />
                  </g>
                )
              })}

              {/* ── Hover title label (topmost so arrows never cross the text) ── */}
              {(() => {
                const t   = hoveredId ? tasks.find(x => x.id === hoveredId) : null
                const pos = t ? posMap[t.id] : null
                if (!t || !pos) return null
                const firstLine = t.title.split('\n')[0]
                const inside    = estTextW(firstLine) <= pos.w - 13
                const text      = inside ? firstLine : truncToWidth(firstLine, 260)
                const tw        = estTextW(text)
                const tx        = inside ? pos.x1 + 7 : pos.x2 + 8
                return (
                  <g style={{ pointerEvents: 'none' }}>
                    {!inside && (
                      <rect
                        x={tx - 5} y={pos.cy - 9} width={tw + 10} height={18} rx={4}
                        fill={C.bg2} opacity={0.95} stroke={C.bg3} strokeWidth={1}
                      />
                    )}
                    <text
                      x={tx} y={pos.cy + 3.5}
                      fill={inside ? '#1e1e2e' : C.fg} fontSize={10} fontWeight={400}
                      style={{ userSelect: 'none' }}
                    >{text}</text>
                  </g>
                )
              })()}
            </svg>
          </div>
        )}
      </div>
    </div>
  )
}
