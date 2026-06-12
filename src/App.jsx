import { useState, useEffect, useCallback } from 'react'
import { C } from './utils/colors'
import { weekDates, weekKey, weekFriday, addWeeks, toISO, fmt, fmtDateStr } from './utils/dates'
import {
  DEFAULT_DATA, migrateData, genId,
  getEntries, getDueDates, getMilestones, getBlockers, getFullWeek, getTasks,
  setEntries, setDueDates, setMilestones, setBlockers, setTasks,
} from './utils/data'
import TopBar from './components/TopBar'
import WeekGrid from './components/WeekGrid'
import BottomSections from './components/BottomSections'
import PlanningView from './components/PlanningView'
import FlowView from './components/FlowView'
import AddEntryDialog from './components/dialogs/AddEntryDialog'
import AddDueDateDialog from './components/dialogs/AddDueDateDialog'
import AddMilestoneDialog from './components/dialogs/AddMilestoneDialog'
import SimpleTextDialog from './components/dialogs/SimpleTextDialog'
import AddTaskDialog from './components/dialogs/AddTaskDialog'
import ProjectManagerDialog from './components/dialogs/ProjectManagerDialog'
import SettingsDialog from './components/dialogs/SettingsDialog'
import OutputDialog from './components/dialogs/OutputDialog'

const RECIPIENT = 'jhlee0804@gmail.com'

async function loadStore() {
  if (window.electronAPI) return await window.electronAPI.getData()
  const raw = localStorage.getItem('awrc_data')
  return raw ? JSON.parse(raw) : null
}

async function persistStore(data) {
  if (window.electronAPI) await window.electronAPI.saveData(data)
  else localStorage.setItem('awrc_data', JSON.stringify(data))
}

function ddLabel(x) {
  const p = (x.project || '').trim()
  return `${p ? `[${p}] ` : ''}${x.task} → ${fmtDateStr(x.date)}`
}

export default function App() {
  const [data, setData]     = useState(null)
  const [dates, setDates]   = useState(() => weekDates(new Date()))
  const [dialog, setDialog] = useState(null)
  const [tab, setTab]       = useState('week')

  useEffect(() => {
    loadStore().then(d => {
      const migrated = migrateData(d || { ...DEFAULT_DATA })
      setData(migrated)
      // persist immediately so any newly-generated DD/MS IDs are saved
      persistStore(migrated)
    })
  }, [])

  const mutate = useCallback((newData) => {
    setData(newData)
    persistStore(newData)
  }, [])

  if (!data) {
    return (
      <div style={{ height: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: C.fg3, fontSize: 13 }}>로딩 중...</span>
      </div>
    )
  }

  const wk = weekKey(dates[0])
  const close = () => setDialog(null)

  // ── Entry handlers ────────────────────────────────────────────────────────
  const onAddEntry    = (ds, dayLabel) => setDialog({ t: 'addEntry', ds, dayLabel })
  const onEditEntry   = (ds, idx, entry, dayLabel) => setDialog({ t: 'editEntry', ds, idx, entry, dayLabel })
  const onDeleteEntry = (ds, idx) => {
    const entries = getEntries(data, wk, ds)
    const entry   = entries[idx]
    let nd = setEntries(data, wk, ds, entries.filter((_, i) => i !== idx))
    // remove the mirrored flow task together with the entry
    if (entry?.taskId) nd = setTasks(nd, getTasks(nd).filter(t => t.id !== entry.taskId))
    mutate(nd)
  }

  // ── Due date handlers ─────────────────────────────────────────────────────
  const onAddDD        = () => setDialog({ t: 'addDD' })
  const onEditDD       = (idx) => setDialog({ t: 'editDD', idx })
  const onDeleteDD     = (idx) => mutate(setDueDates(data, getDueDates(data).filter((_, i) => i !== idx)))

  const onToggleDoneDD = (idx) => mutate(setDueDates(data, getDueDates(data).map((x, i) => {
    if (i !== idx) return x
    const done = !x.done
    if (done) return { ...x, done, completedAt: toISO(new Date()) }
    const { completedAt: _, ...rest } = x
    return { ...rest, done }
  })))

  // ── Milestone handlers ────────────────────────────────────────────────────
  const onAddMS        = () => setDialog({ t: 'addMS' })
  const onEditMS       = (idx) => setDialog({ t: 'editMS', idx })
  const onDeleteMS     = (idx) => mutate(setMilestones(data, getMilestones(data).filter((_, i) => i !== idx)))
  const onToggleDoneMS = (idx) => mutate(setMilestones(data, getMilestones(data).map((x, i) => {
    if (i !== idx) return x
    const done = !x.done
    if (done) return { ...x, done, completedAt: toISO(new Date()) }
    const { completedAt: _, ...rest } = x
    return { ...rest, done }
  })))

  // ── Task (Flow) handlers ─────────────────────────────────────────────────
  const onAddTask    = (project, milestoneId) => setDialog({ t: 'addTask', project: project || '', milestoneId: milestoneId || '' })
  const onEditTask   = (task)    => setDialog({ t: 'editTask', task })
  const onUpdateTask = (task)    => mutate(setTasks(data, getTasks(data).map(t => t.id === task.id ? task : t)))
  const onDeleteTask = (id)      => mutate(setTasks(data, getTasks(data).filter(t => t.id !== id)))
  const onEditMSById = (id) => {
    const idx = getMilestones(data).findIndex(m => m.id === id)
    if (idx >= 0) setDialog({ t: 'editMS', idx })
  }
  const onEditDDById = (id) => {
    const idx = getDueDates(data).findIndex(d => d.id === id)
    if (idx >= 0) setDialog({ t: 'editDD', idx })
  }
  const onImportTasks = (newTasks) => {
    const existing = new Set(getTasks(data).map(t => `${t.startDate}|${t.title}`))
    const toAdd = newTasks.filter(t => !existing.has(`${t.startDate}|${t.title}`))
    if (toAdd.length) mutate(setTasks(data, [...getTasks(data), ...toAdd]))
  }

  // ── Blocker handlers ──────────────────────────────────────────────────────
  const onAddBL    = () => setDialog({ t: 'addBL' })
  const onEditBL   = (idx) => setDialog({ t: 'editBL', idx })
  const onDeleteBL = (idx) => mutate(setBlockers(data, wk, getBlockers(data, wk).filter((_, i) => i !== idx)))

  // ── Generate ──────────────────────────────────────────────────────────────
  const onGenerate = () => {
    const wkData = getFullWeek(data, wk)
    // projMap: { project -> { dateLabel -> [txt, ...] } }  (insertion order = chronological)
    const projMap = {}
    for (const d of dates) {
      const ds  = toISO(d)
      const tag = fmt(d)
      for (const e of (wkData.entries[ds] || [])) {
        if (!projMap[e.project])       projMap[e.project] = {}
        if (!projMap[e.project][tag])  projMap[e.project][tag] = []
        projMap[e.project][tag].push(e)
      }
    }
    const friday  = weekFriday(dates[0])
    const yy      = String(friday.getFullYear()).slice(2)
    const mm      = String(friday.getMonth() + 1).padStart(2, '0')
    const dd      = String(friday.getDate()).padStart(2, '0')
    const subject = `[weekly]${data.user_name} ${yy}${mm}${dd}`

    const lines = [`[제목] ${subject}`, `[받는 사람] ${RECIPIENT}`, '', '== 이번 주 작업 ==']

    if (Object.keys(projMap).length) {
      Object.entries(projMap).forEach(([proj, dateMap], gi) => {
        if (gi > 0) lines.push('')
        lines.push(`[${proj || '기타'}]`)
        for (const [tag, items] of Object.entries(dateMap)) {
          lines.push(`(${tag})`)
          items.forEach(e => {
            const entryTitle = e.title ?? e.text ?? ''
            lines.push(`- ${entryTitle}`)
            const contentStr = e.content ?? ''
            contentStr.split('\n').map(l => l.trim()).filter(Boolean).forEach(l => {
              lines.push(`  - ${l.startsWith('- ') ? l.slice(2) : l}`)
            })
          })
        }
      })
    } else {
      lines.push('(항목 없음)')
    }

    lines.push('', '== 다음 1~2주 마감일 (Due dates) ==')
    const due = getDueDates(data)
    due.length ? due.forEach(x => lines.push(`- ${ddLabel(x)}`)) : lines.push('(항목 없음)')

    lines.push('', '== 마일스톤 (Milestones) ==')
    const weekStart = toISO(dates[0])
    const weekEnd   = toISO(dates[6])
    const msList = getMilestones(data).filter(x =>
      !x.done || (x.completedAt && x.completedAt >= weekStart && x.completedAt <= weekEnd)
    )
    msList.length
      ? msList.forEach(x => lines.push(`- ${x.done ? '[완료] ' : ''}${x.project}: ${x.detail} → ${fmtDateStr(x.target)}`))
      : lines.push('(항목 없음)')

    const bl = wkData.blockers || []
    if (bl.length) { lines.push('', '== Blockers =='); bl.forEach(b => lines.push(`- ${b}`)) }

    setDialog({ t: 'output', text: lines.join('\n'), subject })
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: C.bg, overflow: 'hidden' }}>
      <TopBar
        tab={tab} onTabChange={setTab}
        wk={wk} dates={dates}
        onPrev={() => setDates(ds => ds.map(d => addWeeks(d, -1)))}
        onNext={() => setDates(ds => ds.map(d => addWeeks(d, 1)))}
        onProjects={() => setDialog({ t: 'projects' })}
        onSettings={() => setDialog({ t: 'settings' })}
        onGenerate={onGenerate}
      />

      {tab === 'week' && (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '0 18px 0' }}>
          <WeekGrid dates={dates} data={data} wk={wk}
            onAdd={onAddEntry} onEdit={onEditEntry} onDelete={onDeleteEntry} />
          <BottomSections
            data={data} wk={wk}
            onAddDD={onAddDD} onEditDD={onEditDD} onDeleteDD={onDeleteDD}
            onAddMS={onAddMS} onEditMS={onEditMS} onDeleteMS={onDeleteMS}
            onAddBL={onAddBL} onEditBL={onEditBL} onDeleteBL={onDeleteBL}
          />
        </div>
      )}

      {tab === 'planning' && (
        <PlanningView
          data={data}
          onAddDD={onAddDD} onEditDD={onEditDD} onDeleteDD={onDeleteDD} onToggleDoneDD={onToggleDoneDD}
          onAddMS={onAddMS} onEditMS={onEditMS} onDeleteMS={onDeleteMS} onToggleDoneMS={onToggleDoneMS}
        />
      )}

      {tab === 'flow' && (
        <FlowView
          data={data}
          onAdd={onAddTask} onEdit={onEditTask} onUpdate={onUpdateTask} onDelete={onDeleteTask}
          onImport={onImportTasks}
          onEditMilestone={onEditMSById} onEditDueDate={onEditDDById}
        />
      )}

      {/* ── Dialogs ─────────────────────────────────────────────────────── */}
      {dialog?.t === 'addEntry' && (
        <AddEntryDialog projects={data.projects} tasks={getTasks(data)} milestones={getMilestones(data)} dayLabel={dialog.dayLabel} onClose={close}
          onSubmit={entry => {
            // Every week entry is mirrored as a flow task so it shows on the chart
            // and can be picked as a predecessor later.
            const taskId = genId()
            const nd = setTasks(data, [...getTasks(data), {
              id: taskId, project: entry.project, title: entry.title, notes: entry.content,
              startDate: dialog.ds, endDate: dialog.ds,
              predecessors: entry.predecessorIds || [], dueDateId: null,
              milestoneId: entry.milestoneId || null, done: true, completedAt: dialog.ds,
            }])
            mutate(setEntries(nd, wk, dialog.ds, [...getEntries(nd, wk, dialog.ds), { ...entry, taskId }]))
            close()
          }}
        />
      )}
      {dialog?.t === 'editEntry' && (
        <AddEntryDialog projects={data.projects} tasks={getTasks(data)} milestones={getMilestones(data)} dayLabel={dialog.dayLabel} initial={dialog.entry} onClose={close}
          onSubmit={entry => {
            let nd = data
            let saved = entry
            const hasTask = entry.taskId && getTasks(nd).some(t => t.id === entry.taskId)
            if (hasTask) {
              // keep the mirrored flow task in sync with the entry
              nd = setTasks(nd, getTasks(nd).map(t =>
                t.id === entry.taskId
                  ? {
                      ...t, project: entry.project, title: entry.title, notes: entry.content,
                      predecessors: entry.predecessorIds || [], milestoneId: entry.milestoneId || null,
                    }
                  : t
              ))
            } else {
              // mirror was missing (e.g., deleted in flow) — recreate it
              const taskId = genId()
              nd = setTasks(nd, [...getTasks(nd), {
                id: taskId, project: entry.project, title: entry.title, notes: entry.content,
                startDate: dialog.ds, endDate: dialog.ds,
                predecessors: entry.predecessorIds || [], dueDateId: null,
                milestoneId: entry.milestoneId || null, done: true, completedAt: dialog.ds,
              }])
              saved = { ...saved, taskId }
            }
            mutate(setEntries(nd, wk, dialog.ds, getEntries(nd, wk, dialog.ds).map((x, i) => i === dialog.idx ? saved : x)))
            close()
          }}
        />
      )}
      {dialog?.t === 'addDD' && (
        <AddDueDateDialog projects={data.projects} onClose={close}
          onSubmit={item => { mutate(setDueDates(data, [...getDueDates(data), { ...item, id: item.id ?? genId() }])); close() }} />
      )}
      {dialog?.t === 'editDD' && (
        <AddDueDateDialog projects={data.projects} initial={getDueDates(data)[dialog.idx]} onClose={close}
          onSubmit={item => { mutate(setDueDates(data, getDueDates(data).map((x, i) => i === dialog.idx ? { ...item, id: x.id ?? genId() } : x))); close() }} />
      )}
      {dialog?.t === 'addMS' && (
        <AddMilestoneDialog projects={data.projects} onClose={close}
          onSubmit={item => { mutate(setMilestones(data, [...getMilestones(data), { ...item, id: item.id ?? genId() }])); close() }} />
      )}
      {dialog?.t === 'editMS' && (
        <AddMilestoneDialog projects={data.projects} initial={getMilestones(data)[dialog.idx]} onClose={close}
          onSubmit={item => { mutate(setMilestones(data, getMilestones(data).map((x, i) => i === dialog.idx ? { ...item, id: x.id ?? genId() } : x))); close() }} />
      )}
      {dialog?.t === 'addBL' && (
        <SimpleTextDialog title="Blocker 추가" onClose={close}
          onSubmit={t => { mutate(setBlockers(data, wk, [...getBlockers(data, wk), t])); close() }} />
      )}
      {dialog?.t === 'editBL' && (
        <SimpleTextDialog title="Blocker 수정" initial={getBlockers(data, wk)[dialog.idx]} onClose={close}
          onSubmit={t => { mutate(setBlockers(data, wk, getBlockers(data, wk).map((x, i) => i === dialog.idx ? t : x))); close() }} />
      )}
      {dialog?.t === 'addTask' && (
        <AddTaskDialog
          projects={data.projects} tasks={getTasks(data)}
          dueDates={getDueDates(data)} milestones={getMilestones(data)}
          initialProject={dialog.project}
          initialMilestoneId={dialog.milestoneId}
          onClose={close}
          onSubmit={task => { mutate(setTasks(data, [...getTasks(data), task])); close() }}
        />
      )}
      {dialog?.t === 'editTask' && (
        <AddTaskDialog
          projects={data.projects} tasks={getTasks(data)}
          dueDates={getDueDates(data)} milestones={getMilestones(data)}
          initial={dialog.task}
          onClose={close}
          onSubmit={task => { mutate(setTasks(data, getTasks(data).map(t => t.id === task.id ? task : t))); close() }}
        />
      )}
      {dialog?.t === 'projects' && (
        <ProjectManagerDialog data={data} onClose={close} onChange={mutate} />
      )}
      {dialog?.t === 'settings' && (
        <SettingsDialog data={data} onClose={close} onChange={d => { mutate(d); close() }} />
      )}
      {dialog?.t === 'output' && (
        <OutputDialog text={dialog.text} subject={dialog.subject} onClose={close} />
      )}
    </div>
  )
}
