import { useMemo, useRef, useEffect, useState, useCallback } from 'react'
import { Plus, ZoomIn, ZoomOut, Pencil, Trash2, Download, CheckCircle2, Circle } from 'lucide-react'
import Modal, { ModalFooter } from './Modal'
import { C, projectColor } from '../utils/colors'
import { toISO, fmtDateStr } from '../utils/dates'
import { getTasks, getDueDates, getMilestones, genId } from '../utils/data'
import { renderLines } from '../utils/content'

const LABEL_W    = 185
const HEADER_H   = 30
const MS_STRIP_H = 24
const BODY_Y     = HEADER_H + MS_STRIP_H
const SWIM_HDR   = 27
const ROW_H      = 32
const ROW_H_TALL = 46
const ZOOM_PX    = [4, 8, 14, 20, 30, 40]

function getTaskH(t) { return ((t.notes || '').trim() || t.title.includes('\n')) ? ROW_H_TALL : ROW_H }

function parseDate(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// ── Import Dialog ──────────────────────────────────────────────────────────────
function ImportDialog({ data, existingTasks, onClose, onImport }) {
  const allEntries = useMemo(() => {
    const result = []
    for (const [, wkData] of Object.entries(data.weeks || {})) {
      for (const [ds, entries] of Object.entries(wkData.entries || {})) {
        for (const e of (entries || [])) {
          result.push({ ds, project: e.project || '', text: e.title ?? e.text ?? '', notes: e.content || '' })
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
        milestoneId: null,
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
function FlowControls({ zoomIdx, setZoomIdx, onAdd, onImport }) {
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
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
        <button style={btnBase} onClick={() => setZoomIdx(i => Math.max(0, i - 1))} onMouseEnter={hov} onMouseLeave={unv} title="축소">
          <ZoomOut size={13} strokeWidth={2} />
        </button>
        <span style={{ color: C.fg3, fontSize: 11, width: 42, textAlign: 'center' }}>{ZOOM_PX[zoomIdx]}px/일</span>
        <button style={btnBase} onClick={() => setZoomIdx(i => Math.min(ZOOM_PX.length - 1, i + 1))} onMouseEnter={hov} onMouseLeave={unv} title="확대">
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
function TaskDetailPanel({ task, tasks, dueDates, milestones, onEdit, onDelete, onToggleDone, onClose }) {
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
          {task.done && <span style={{ marginLeft: 8, color: C.success, fontWeight: 600 }}>완료</span>}
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
                D {linkedDD.task} → {linkedDD.date}
              </span>
            )}
            {linkedMS && (
              <span style={{ fontSize: 11, color: '#94e2d5', background: '#94e2d518', padding: '3px 8px', borderRadius: 4 }}>
                M {linkedMS.detail} → {linkedMS.target}
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
          onClick={() => { onToggleDone?.(task.id); onClose() }}
          style={{
            background: task.done ? 'rgba(166,227,161,0.15)' : 'rgba(166,227,161,0.06)',
            color: C.success,
            padding: '6px 16px', borderRadius: 6, fontSize: 12, transition: 'background 0.1s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(166,227,161,0.25)'}
          onMouseLeave={e => e.currentTarget.style.background = task.done ? 'rgba(166,227,161,0.15)' : 'rgba(166,227,161,0.06)'}
        >{task.done ? '미완료로 변경' : '완료 처리'}</button>
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

// ── Task Label Row ─────────────────────────────────────────────────────────────
function TaskLabelRow({ task, dueDates, milestones, onEdit, onDelete, onToggleDone, onDetail, hoveredId, connectedIds, onHover, h }) {
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
        height: h, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: hasContent ? '4px 8px' : '0 8px', gap: 2,
        background: hov ? `${C.bg3}66` : 'transparent',
        cursor: 'pointer', transition: 'background 0.1s, opacity 0.12s',
        borderBottom: `1px solid ${C.bg3}33`,
        opacity: isDimmed ? 0.22 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <div style={{ width: 3, height: 14, borderRadius: 2, background: col, flexShrink: 0 }} />
        <span style={{
          flex: 1, color: task.done ? C.fg3 : C.fg2, fontSize: 11,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          textDecoration: task.done ? 'line-through' : 'none',
        }}>{displayTitle}</span>
        {linkedDD && (
          <span
            title={`마감: ${linkedDD.task} → ${linkedDD.date}`}
            style={{ fontSize: 9, color: '#f9e2af', background: '#f9e2af22', borderRadius: 2, padding: '1px 4px', flexShrink: 0, fontWeight: 700 }}
          >D</span>
        )}
        {linkedMS && (
          <span
            title={`마일스톤: ${linkedMS.detail} → ${linkedMS.target}`}
            style={{ fontSize: 9, color: '#94e2d5', background: '#94e2d522', borderRadius: 2, padding: '1px 4px', flexShrink: 0, fontWeight: 700 }}
          >M</span>
        )}
        {hov && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleDone?.(task.id) }}
              style={{ color: task.done ? C.success : C.fg3, background: 'transparent', padding: '2px 3px', flexShrink: 0, lineHeight: 1 }}
              title={task.done ? '미완료로 변경' : '완료로 변경'}
              onMouseEnter={e => e.currentTarget.style.color = C.success}
              onMouseLeave={e => e.currentTarget.style.color = task.done ? C.success : C.fg3}
            >{task.done ? <CheckCircle2 size={11} strokeWidth={2} /> : <Circle size={11} strokeWidth={2} />}</button>
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
          opacity: task.done ? 0.45 : 0.7,
        }}>{contentPreview}</div>
      )}
    </div>
  )
}

// ── Main FlowView ──────────────────────────────────────────────────────────────
export default function FlowView({ data, onAdd, onEdit, onDelete, onImport, onToggleDone }) {
  const tasks      = getTasks(data)
  const dueDates   = getDueDates(data)
  const milestones = getMilestones(data)
  const [zoomIdx, setZoomIdx]       = useState(3)
  const [showImport, setShowImport] = useState(false)
  const [detailTask, setDetailTask] = useState(null)
  const [hoveredId, setHoveredId]   = useState(null)
  const dayW         = ZOOM_PX[zoomIdx]
  const containerRef = useRef(null)
  const todayISO     = toISO(new Date())

  const handleHover = useCallback((id) => setHoveredId(id), [])

  const handleImport = (newTasks) => { onImport(newTasks); setShowImport(false) }

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

  // Group tasks by project, sorted by startDate
  const groups = useMemo(() => {
    const map = {}
    for (const t of tasks) {
      const key = t.project || '(미지정)'
      if (!map[key]) map[key] = []
      map[key].push(t)
    }
    return Object.entries(map).map(([proj, ts]) => [
      proj,
      [...ts].sort((a, b) => a.startDate.localeCompare(b.startDate)),
    ])
  }, [tasks])

  // Time range: cover tasks + milestone targets + padding
  const { rangeStart, totalDays } = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const allDates = [
      ...tasks.flatMap(t => [parseDate(t.startDate), parseDate(t.endDate)]),
      ...milestones.filter(m => m.target).map(m => parseDate(m.target)),
    ]
    if (!allDates.length) {
      const s = new Date(today); s.setDate(today.getDate() - 14)
      return { rangeStart: s, totalDays: 70 }
    }
    const minD = new Date(Math.min(...allDates))
    const maxD = new Date(Math.max(...allDates))
    minD.setDate(minD.getDate() - 7)
    maxD.setDate(maxD.getDate() + 21)
    return { rangeStart: minD, totalDays: Math.max(70, Math.ceil((maxD - minD) / 86400000)) }
  }, [tasks, milestones])

  function dateToX(dateStr) {
    return Math.round((parseDate(dateStr) - rangeStart) / 86400000) * dayW
  }

  // Swimlane layout — variable row heights based on whether task has notes
  const layout = useMemo(() => {
    let y = BODY_Y
    const swimlanes = groups.map(([proj, projTasks]) => {
      const headerY   = y
      let rowY = y + SWIM_HDR
      const taskRows = projTasks.map(t => {
        const h = getTaskH(t)
        const row = { task: t, rowY, h }
        rowY += h
        return row
      })
      const height = SWIM_HDR + projTasks.reduce((s, t) => s + getTaskH(t), 0)
      y += height + 1
      return { proj, tasks: projTasks, taskRows, headerY, height }
    })
    return { swimlanes, totalH: y + 8 }
  }, [groups])

  // Bar positions (x1, x2, cy) keyed by task id — uses per-task rowY from layout
  const posMap = useMemo(() => {
    const map = {}
    for (const sl of layout.swimlanes) {
      for (const { task: t, rowY, h } of sl.taskRows) {
        const x1 = dateToX(t.startDate)
        const x2 = dateToX(t.endDate) + dayW
        const cy = rowY + h / 2
        map[t.id] = { x1, x2, w: Math.max(x2 - x1, dayW), cy }
      }
    }
    return map
  }, [layout, dayW, rangeStart])

  // Month marks
  const monthMarks = useMemo(() => {
    const marks = []
    const d = new Date(rangeStart); d.setDate(1)
    for (let i = 0; i < 120; i++) {
      const x = Math.round((d - rangeStart) / 86400000) * dayW
      if (x > totalDays * dayW) break
      if (x >= 0) marks.push({ x, label: `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}` })
      d.setMonth(d.getMonth() + 1)
    }
    return marks
  }, [rangeStart, totalDays, dayW])

  // Monday lines — show MM/DD date label when zoom >= 14px/day
  const weekLines = useMemo(() => {
    const lines = []
    const d = new Date(rangeStart)
    const dow = d.getDay()
    d.setDate(d.getDate() + (dow === 1 ? 0 : ((8 - dow) % 7 || 7)))
    for (let i = 0; i <= totalDays / 7 + 1; i++) {
      const x = Math.round((d - rangeStart) / 86400000) * dayW
      if (x >= 0 && x <= totalDays * dayW) {
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
  }, [rangeStart, totalDays, dayW])

  // Pre-compute arrows with fixed routing
  const arrows = useMemo(() => {
    const result = []
    for (const t of tasks) {
      for (const predId of (t.predecessors || [])) {
        const from = posMap[predId]
        const to   = posMap[t.id]
        if (!from || !to) continue
        const x1 = from.x2, y1 = from.cy   // right edge of predecessor
        const x2 = to.x1,   y2 = to.cy     // left edge of successor
        let pathD, arrowDir
        if (x2 >= x1 + 4) {
          // Forward: H-V-H through midpoint between the two bars
          const midX = (x1 + x2) / 2
          pathD = `M${x1},${y1} H${midX} V${y2} H${x2}`
          arrowDir = 'right'
        } else {
          // Backward / overlap: elbow extends right then wraps back left
          const elbowX = Math.max(x1, x2) + Math.max(dayW * 2, 24)
          pathD = `M${x1},${y1} H${elbowX} V${y2} H${x2}`
          arrowDir = 'left'
        }
        result.push({ predId, succId: t.id, pathD, x2, y2, arrowDir, col: projectColor(t.project) })
      }
    }
    return result
  }, [tasks, posMap, dayW])

  const todayX   = dateToX(todayISO)
  const svgW     = totalDays * dayW
  const emptyState = !tasks.length

  // Scroll to show today when zoom changes
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const viewW = el.clientWidth - LABEL_W
    el.scrollLeft = Math.max(0, todayX - viewW * 0.33)
  }, [zoomIdx])

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '10px 18px', gap: 10 }}>
      <FlowControls
        zoomIdx={zoomIdx} setZoomIdx={setZoomIdx}
        onAdd={() => onAdd('')}
        onImport={() => setShowImport(true)}
      />

      {showImport && (
        <ImportDialog data={data} existingTasks={tasks} onClose={() => setShowImport(false)} onImport={handleImport} />
      )}

      {detailTask && (
        <TaskDetailPanel
          task={detailTask} tasks={tasks} dueDates={dueDates} milestones={milestones}
          onEdit={onEdit} onDelete={onDelete} onToggleDone={onToggleDone}
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
          <div style={{ display: 'flex', width: LABEL_W + svgW, height: layout.totalH, minHeight: '100%' }}>

            {/* ── Sticky label column ── */}
            <div style={{
              position: 'sticky', left: 0, zIndex: 10,
              width: LABEL_W, flexShrink: 0,
              borderRight: `1px solid ${C.bg3}`,
              background: C.bg2,
              height: layout.totalH,
            }}>
              {/* Header */}
              <div style={{
                height: HEADER_H, borderBottom: `1px solid ${C.bg3}44`,
                display: 'flex', alignItems: 'center', padding: '0 12px',
              }}>
                <span style={{ color: C.fg3, fontSize: 10, fontWeight: 600, letterSpacing: 0.5 }}>프로젝트 / 작업</span>
              </div>

              {/* Milestone strip label */}
              <div style={{
                height: MS_STRIP_H, borderBottom: `1px solid ${C.bg3}`,
                display: 'flex', alignItems: 'center', padding: '0 12px', gap: 6,
                background: '#94e2d508',
              }}>
                <span style={{ color: '#94e2d5', fontSize: 10, fontWeight: 700 }}>마일스톤</span>
                {milestones.filter(m => !m.done).length > 0 && (
                  <span style={{
                    background: '#94e2d522', color: '#94e2d5',
                    fontSize: 9, padding: '0 5px', borderRadius: 8, fontWeight: 700,
                  }}>{milestones.filter(m => !m.done).length}</span>
                )}
              </div>

              {/* Swimlane labels */}
              {layout.swimlanes.map(sl => {
                const col = projectColor(sl.proj)
                return (
                  <div key={sl.proj} style={{ height: sl.height + 1, borderBottom: `1px solid ${C.bg3}` }}>
                    <div style={{
                      height: SWIM_HDR, display: 'flex', alignItems: 'center',
                      padding: '0 10px', gap: 5,
                      background: `${col}12`, borderBottom: `1px solid ${C.bg3}44`,
                    }}>
                      <span style={{ color: col, fontWeight: 700, fontSize: 11, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sl.proj}</span>
                      <button
                        onClick={() => onAdd(sl.proj === '(미지정)' ? '' : sl.proj)}
                        style={{ color: C.fg3, background: 'transparent', flexShrink: 0, lineHeight: 1 }}
                        onMouseEnter={e => e.currentTarget.style.color = col}
                        onMouseLeave={e => e.currentTarget.style.color = C.fg3}
                        title="이 프로젝트에 작업 추가"
                      ><Plus size={11} strokeWidth={2.5} /></button>
                    </div>

                    {sl.taskRows.map(({ task: t, h }) => (
                      <TaskLabelRow
                        key={t.id} task={t} h={h}
                        dueDates={dueDates} milestones={milestones}
                        onEdit={onEdit} onDelete={onDelete} onToggleDone={onToggleDone}
                        onDetail={setDetailTask}
                        hoveredId={hoveredId} connectedIds={connectedIds}
                        onHover={handleHover}
                      />
                    ))}
                  </div>
                )
              })}
            </div>

            {/* ── SVG timeline ── */}
            <svg
              width={svgW} height={layout.totalH}
              style={{ display: 'block', flexShrink: 0 }}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Header bg */}
              <rect x={0} y={0} width={svgW} height={HEADER_H} fill="#252537" />
              {/* Milestone strip bg */}
              <rect x={0} y={HEADER_H} width={svgW} height={MS_STRIP_H} fill="#94e2d508" />
              <line x1={0} y1={BODY_Y} x2={svgW} y2={BODY_Y} stroke={C.bg3} strokeWidth={1} />

              {/* Week grid lines + date labels */}
              {weekLines.map((wl, i) => (
                <g key={i}>
                  <line x1={wl.x} y1={0} x2={wl.x} y2={layout.totalH} stroke={C.bg3} strokeWidth={1} />
                  {wl.dateLabel && (
                    <text x={wl.x + 3} y={HEADER_H - 5} fill={C.fg3} fontSize={9}>{wl.dateLabel}</text>
                  )}
                </g>
              ))}

              {/* Month marks + labels */}
              {monthMarks.map((m, i) => (
                <g key={i}>
                  <line x1={m.x} y1={0} x2={m.x} y2={layout.totalH} stroke={C.fg3} strokeWidth={0.5} opacity={0.25} />
                  <text x={m.x + 5} y={HEADER_H / 2 + 4} fill={C.fg2} fontSize={11} fontWeight={700}>{m.label}</text>
                </g>
              ))}

              {/* Today line */}
              {todayX >= 0 && todayX <= svgW && (
                <g>
                  <line x1={todayX} y1={0} x2={todayX} y2={layout.totalH} stroke={C.accent} strokeWidth={1.5} opacity={0.55} />
                  <text x={todayX + 4} y={HEADER_H - 7} fill={C.accent} fontSize={10} fontWeight={600}>오늘</text>
                </g>
              )}

              {/* ── Milestone strip: diamonds at target dates ── */}
              {milestones.map(ms => {
                if (!ms.target) return null
                const x = dateToX(ms.target)
                if (x < -30 || x > svgW + 30) return null
                const col = projectColor(ms.project)
                const cy  = HEADER_H + MS_STRIP_H / 2
                const sz  = 5
                const maxLen = dayW >= 8 ? 15 : 0
                const label  = maxLen > 0 && ms.detail
                  ? (ms.detail.length > maxLen ? ms.detail.slice(0, maxLen - 1) + '…' : ms.detail)
                  : null
                return (
                  <g key={ms.id}>
                    {/* Dashed vertical guide through swimlanes */}
                    <line
                      x1={x} y1={BODY_Y} x2={x} y2={layout.totalH}
                      stroke={col} strokeWidth={0.5} opacity={0.15} strokeDasharray="4,4"
                    />
                    {/* Diamond */}
                    <polygon
                      points={`${x},${cy - sz} ${x + sz},${cy} ${x},${cy + sz} ${x - sz},${cy}`}
                      fill={col} opacity={ms.done ? 0.25 : 0.85}
                    >
                      <title>{ms.project ? `[${ms.project}] ` : ''}{ms.detail} → {fmtDateStr(ms.target)}{ms.done ? ' ✓' : ''}</title>
                    </polygon>
                    {label && (
                      <text
                        x={x + sz + 3} y={cy + 4}
                        fill={col} fontSize={9} fontWeight={600} opacity={ms.done ? 0.35 : 0.85}
                        style={{ pointerEvents: 'none', userSelect: 'none' }}
                      >{label}</text>
                    )}
                  </g>
                )
              })}

              {/* ── Swimlane bands + task bars ── */}
              {layout.swimlanes.map(sl => {
                const col = projectColor(sl.proj)
                return (
                  <g key={sl.proj}>
                    <rect x={0} y={sl.headerY} width={svgW} height={SWIM_HDR} fill={`${col}10`} />
                    <line x1={0} y1={sl.headerY + sl.height} x2={svgW} y2={sl.headerY + sl.height} stroke={C.bg3} strokeWidth={1} />

                    {sl.taskRows.map(({ task: t, rowY, h }) => {
                      const pos = posMap[t.id]
                      if (!pos) return null
                      const bH      = ROW_H - 10
                      const bY      = rowY + (h - bH) / 2
                      const maxChars = Math.floor(pos.w / 7)
                      const label   = t.title.length > maxChars ? t.title.slice(0, Math.max(0, maxChars - 1)) + '…' : t.title
                      const hasDD   = !!t.dueDateId
                      const hasMS   = !!t.milestoneId
                      const isHov   = hoveredId === t.id
                      const isDim   = hoveredId && connectedIds && !connectedIds.has(t.id)

                      return (
                        <g
                          key={t.id}
                          onClick={() => setDetailTask(t)}
                          onMouseEnter={() => setHoveredId(t.id)}
                          onMouseLeave={() => setHoveredId(null)}
                          style={{ cursor: 'pointer' }}
                        >
                          <rect
                            x={pos.x1} y={bY} width={pos.w} height={bH} rx={4}
                            fill={col}
                            fillOpacity={t.done ? 0.15 : (isDim ? 0.18 : 0.82)}
                            stroke={isHov ? col : (t.done ? col : 'none')}
                            strokeWidth={isHov ? 2 : 1}
                            strokeDasharray={t.done ? '4,3' : undefined}
                          />
                          {pos.w > 32 && !isDim && (
                            <text
                              x={pos.x1 + 7} y={bY + bH / 2 + 4}
                              fill={t.done ? col : '#1e1e2e'} fontSize={10} fontWeight={700}
                              style={{ pointerEvents: 'none', userSelect: 'none' }}
                            >{label}</text>
                          )}
                          {hasDD && <rect x={pos.x1 + pos.w - 4} y={bY} width={4} height={bH} fill="#f9e2af" fillOpacity={isDim ? 0.3 : 0.9} />}
                          {hasMS && <rect x={pos.x1 + pos.w - (hasDD ? 8 : 4)} y={bY} width={4} height={bH} fill="#94e2d5" fillOpacity={isDim ? 0.3 : 0.9} />}
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
                // Small arrowhead triangle at destination
                const ah = 5, aw = 3
                const arrowPts = arrowDir === 'right'
                  ? `${x2},${y2} ${x2 - ah},${y2 - aw} ${x2 - ah},${y2 + aw}`
                  : `${x2},${y2} ${x2 + ah},${y2 - aw} ${x2 + ah},${y2 + aw}`
                return (
                  <g key={`${predId}→${succId}`} opacity={opacity} style={{ transition: 'opacity 0.12s' }}>
                    <path d={pathD} stroke={stroke} strokeWidth={sw} fill="none" />
                    <polygon points={arrowPts} fill={stroke} />
                  </g>
                )
              })}
            </svg>
          </div>
        )}
      </div>
    </div>
  )
}
