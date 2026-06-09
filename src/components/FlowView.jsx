import { useMemo, useRef, useEffect, useState } from 'react'
import { Plus, ZoomIn, ZoomOut, Pencil, Trash2, Download } from 'lucide-react'
import Modal, { ModalFooter } from './Modal'
import { C, projectColor } from '../utils/colors'
import { toISO, fmtDateStr } from '../utils/dates'
import { getTasks, getDueDates, getMilestones, genId } from '../utils/data'

const LABEL_W  = 185
const HEADER_H = 30
const SWIM_HDR = 27
const ROW_H    = 32
const ZOOM_PX  = [4, 8, 14, 20, 30, 40]

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
          result.push({ ds, project: e.project || '', text: e.text })
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
        startDate: e.ds,
        endDate: e.ds,
        predecessors: [],
        dueDateId: null,
        milestoneId: null,
        done: false,
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

// ── Task Label Row ─────────────────────────────────────────────────────────────
function TaskLabelRow({ task, dueDates, milestones, onEdit, onDelete }) {
  const [hov, setHov] = useState(false)
  const col    = projectColor(task.project)
  const linkedDD = task.dueDateId ? dueDates.find(d => d.id === task.dueDateId) : null
  const linkedMS = task.milestoneId ? milestones.find(m => m.id === task.milestoneId) : null
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        height: ROW_H, display: 'flex', alignItems: 'center',
        padding: '0 8px', gap: 5,
        background: hov ? `${C.bg3}66` : 'transparent',
        cursor: 'pointer', transition: 'background 0.1s',
        borderBottom: `1px solid ${C.bg3}33`,
      }}
    >
      <div style={{ width: 3, height: 14, borderRadius: 2, background: col, flexShrink: 0 }} />
      <span style={{
        flex: 1, color: task.done ? C.fg3 : C.fg2, fontSize: 11,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        textDecoration: task.done ? 'line-through' : 'none',
      }}>{task.title}</span>
      {linkedDD && (
        <span
          title={`마감: ${linkedDD.task} → ${linkedDD.date}`}
          style={{
            fontSize: 9, color: '#f9e2af', background: '#f9e2af22',
            borderRadius: 2, padding: '1px 4px', flexShrink: 0, fontWeight: 700,
          }}
        >D</span>
      )}
      {linkedMS && (
        <span
          title={`마일스톤: ${linkedMS.detail} → ${linkedMS.target}`}
          style={{
            fontSize: 9, color: '#94e2d5', background: '#94e2d522',
            borderRadius: 2, padding: '1px 4px', flexShrink: 0, fontWeight: 700,
          }}
        >M</span>
      )}
      {hov && (
        <>
          <button
            onClick={() => onEdit(task)}
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
  )
}

// ── Main FlowView ──────────────────────────────────────────────────────────────
export default function FlowView({ data, onAdd, onEdit, onDelete, onImport }) {
  const tasks      = getTasks(data)
  const dueDates   = getDueDates(data)
  const milestones = getMilestones(data)
  const [zoomIdx, setZoomIdx]       = useState(3)
  const [showImport, setShowImport] = useState(false)
  const dayW        = ZOOM_PX[zoomIdx]
  const containerRef = useRef(null)
  const todayISO    = toISO(new Date())

  const handleImport = (newTasks) => {
    onImport(newTasks)
    setShowImport(false)
  }

  // Group by project, sorted by startDate within group
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

  // Time range: fit all tasks + padding
  const { rangeStart, totalDays } = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    if (!tasks.length) {
      const s = new Date(today); s.setDate(today.getDate() - 14)
      return { rangeStart: s, totalDays: 70 }
    }
    const allDates = tasks.flatMap(t => [parseDate(t.startDate), parseDate(t.endDate)])
    const minD = new Date(Math.min(...allDates))
    const maxD = new Date(Math.max(...allDates))
    minD.setDate(minD.getDate() - 7)
    maxD.setDate(maxD.getDate() + 21)
    return {
      rangeStart: minD,
      totalDays: Math.max(70, Math.ceil((maxD - minD) / 86400000)),
    }
  }, [tasks])

  const dateToX = (dateStr) => {
    const d = parseDate(dateStr)
    return Math.round((d - rangeStart) / 86400000) * dayW
  }

  // Layout: HEADER_H → swimlane (SWIM_HDR + tasks*ROW_H) → ...
  const layout = useMemo(() => {
    let y = HEADER_H
    const swimlanes = groups.map(([proj, projTasks]) => {
      const headerY   = y
      const firstRowY = y + SWIM_HDR
      const height    = SWIM_HDR + projTasks.length * ROW_H
      y += height + 1
      return { proj, tasks: projTasks, headerY, firstRowY, height }
    })
    return { swimlanes, totalH: y + 8 }
  }, [groups])

  // Task center-y and x positions for arrows + bars
  const posMap = useMemo(() => {
    const map = {}
    for (const sl of layout.swimlanes) {
      sl.tasks.forEach((t, ti) => {
        const x1 = dateToX(t.startDate)
        const x2 = dateToX(t.endDate) + dayW
        const cy = sl.firstRowY + ti * ROW_H + ROW_H / 2
        map[t.id] = { x1, x2, w: Math.max(x2 - x1, dayW), cy }
      })
    }
    return map
  }, [layout, dayW, rangeStart])

  // Month label marks
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

  // Monday lines
  const weekLines = useMemo(() => {
    const lines = []
    const d = new Date(rangeStart)
    const dow = d.getDay()
    d.setDate(d.getDate() + (dow === 1 ? 0 : ((8 - dow) % 7 || 7)))
    for (let i = 0; i <= totalDays / 7 + 1; i++) {
      const x = Math.round((d - rangeStart) / 86400000) * dayW
      if (x >= 0 && x <= totalDays * dayW) lines.push(x)
      d.setDate(d.getDate() + 7)
    }
    return lines
  }, [rangeStart, totalDays, dayW])

  const todayX = dateToX(todayISO)
  const svgW   = totalDays * dayW

  // Center on today when zoom changes
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const viewW = el.clientWidth - LABEL_W
    el.scrollLeft = Math.max(0, todayX - viewW * 0.33)
  }, [zoomIdx])

  const emptyState = !tasks.length

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '10px 18px', gap: 10 }}>
      <FlowControls
        zoomIdx={zoomIdx} setZoomIdx={setZoomIdx}
        onAdd={() => onAdd('')}
        onImport={() => setShowImport(true)}
      />

      {showImport && (
        <ImportDialog
          data={data}
          existingTasks={tasks}
          onClose={() => setShowImport(false)}
          onImport={handleImport}
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
          <div style={{
            height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: C.fg3, fontSize: 13,
          }}>
            작업을 추가하거나 주간 항목에서 가져와서 플로우 차트를 시작하세요
          </div>
        ) : (
          /* Inner: sticky-left label column + SVG */
          <div style={{ display: 'flex', width: LABEL_W + svgW, height: layout.totalH, minHeight: '100%' }}>

            {/* Sticky left label column */}
            <div style={{
              position: 'sticky', left: 0, zIndex: 10,
              width: LABEL_W, flexShrink: 0,
              borderRight: `1px solid ${C.bg3}`,
              background: C.bg2,
              height: layout.totalH,
            }}>
              {/* Header label */}
              <div style={{
                height: HEADER_H, borderBottom: `1px solid ${C.bg3}`,
                display: 'flex', alignItems: 'center', padding: '0 12px',
              }}>
                <span style={{ color: C.fg3, fontSize: 10, fontWeight: 600, letterSpacing: 0.5 }}>프로젝트 / 작업</span>
              </div>

              {/* Swimlane labels */}
              {layout.swimlanes.map(sl => {
                const col = projectColor(sl.proj)
                return (
                  <div key={sl.proj} style={{ height: sl.height + 1, borderBottom: `1px solid ${C.bg3}` }}>
                    {/* Project header row */}
                    <div style={{
                      height: SWIM_HDR, display: 'flex', alignItems: 'center',
                      padding: '0 10px', gap: 5,
                      background: `${col}12`,
                      borderBottom: `1px solid ${C.bg3}44`,
                    }}>
                      <span style={{
                        color: col, fontWeight: 700, fontSize: 11, flex: 1,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{sl.proj}</span>
                      <button
                        onClick={() => onAdd(sl.proj === '(미지정)' ? '' : sl.proj)}
                        style={{ color: C.fg3, background: 'transparent', flexShrink: 0, lineHeight: 1 }}
                        onMouseEnter={e => e.currentTarget.style.color = col}
                        onMouseLeave={e => e.currentTarget.style.color = C.fg3}
                        title="이 프로젝트에 작업 추가"
                      ><Plus size={11} strokeWidth={2.5} /></button>
                    </div>

                    {/* Task label rows */}
                    {sl.tasks.map(t => (
                      <TaskLabelRow
                        key={t.id} task={t}
                        dueDates={dueDates} milestones={milestones}
                        onEdit={onEdit} onDelete={onDelete}
                      />
                    ))}
                  </div>
                )
              })}
            </div>

            {/* SVG timeline */}
            <svg width={svgW} height={layout.totalH} style={{ display: 'block', flexShrink: 0 }}>

              {/* Header bg */}
              <rect x={0} y={0} width={svgW} height={HEADER_H} fill="#252537" />

              {/* Week grid lines */}
              {weekLines.map((x, i) => (
                <line key={i} x1={x} y1={0} x2={x} y2={layout.totalH} stroke={C.bg3} strokeWidth={1} />
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

              {/* Swimlanes */}
              {layout.swimlanes.map(sl => {
                const col = projectColor(sl.proj)
                return (
                  <g key={sl.proj}>
                    {/* Swimlane header band */}
                    <rect x={0} y={sl.headerY} width={svgW} height={SWIM_HDR} fill={`${col}10`} />
                    {/* Bottom separator */}
                    <line x1={0} y1={sl.headerY + sl.height} x2={svgW} y2={sl.headerY + sl.height} stroke={C.bg3} strokeWidth={1} />

                    {/* Task bars */}
                    {sl.tasks.map((t, ti) => {
                      const pos = posMap[t.id]
                      if (!pos) return null
                      const bY = sl.firstRowY + ti * ROW_H + 5
                      const bH = ROW_H - 10
                      const maxChars = Math.floor(pos.w / 7)
                      const label = t.title.length > maxChars ? t.title.slice(0, Math.max(0, maxChars - 1)) + '…' : t.title
                      const hasDD = !!t.dueDateId
                      const hasMS = !!t.milestoneId
                      return (
                        <g key={t.id} onClick={() => onEdit(t)} style={{ cursor: 'pointer' }}>
                          <rect
                            x={pos.x1} y={bY} width={pos.w} height={bH} rx={4}
                            fill={col} fillOpacity={t.done ? 0.2 : 0.82}
                            stroke={col} strokeWidth={t.done ? 1 : 0}
                            strokeDasharray={t.done ? '4,3' : undefined}
                          />
                          {pos.w > 32 && (
                            <text
                              x={pos.x1 + 7} y={bY + bH / 2 + 4}
                              fill="#1e1e2e" fontSize={10} fontWeight={700}
                              style={{ pointerEvents: 'none', userSelect: 'none' }}
                            >{label}</text>
                          )}
                          {/* DD indicator: small yellow notch on right edge */}
                          {hasDD && (
                            <rect x={pos.x1 + pos.w - 4} y={bY} width={4} height={bH} rx={0}
                              fill="#f9e2af" fillOpacity={0.9} />
                          )}
                          {/* MS indicator: small teal notch on right edge (below DD) */}
                          {hasMS && (
                            <rect x={pos.x1 + pos.w - (hasDD ? 8 : 4)} y={bY} width={4} height={bH} rx={0}
                              fill="#94e2d5" fillOpacity={0.9} />
                          )}
                        </g>
                      )
                    })}
                  </g>
                )
              })}

              {/* Dependency arrows — orthogonal H-V-H, no arrowhead */}
              {tasks.map(t =>
                (t.predecessors || []).map(predId => {
                  const from = posMap[predId]
                  const to   = posMap[t.id]
                  if (!from || !to) return null
                  const x1 = from.x2, y1 = from.cy   // right-center of predecessor
                  const x2 = to.x1,   y2 = to.cy     // left-center of successor
                  // midX is always PAST both bars so last segment always goes LEFT (backwards-C)
                  const ext  = Math.max(dayW * 2, 32)
                  const midX = Math.max(x1, x2) + ext
                  return (
                    <path
                      key={`${predId}→${t.id}`}
                      d={`M${x1},${y1} H${midX} V${y2} H${x2}`}
                      stroke={C.fg2} strokeWidth={1.5} fill="none" opacity={0.75}
                    />
                  )
                })
              )}
            </svg>
          </div>
        )}
      </div>
    </div>
  )
}
