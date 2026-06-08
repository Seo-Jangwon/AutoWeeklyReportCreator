import { useState, useEffect, useCallback } from 'react'
import { C } from './utils/colors'
import { weekDates, weekKey, weekFriday, addWeeks, toISO, fmt, fmtDateStr } from './utils/dates'
import {
  DEFAULT_DATA, migrateData,
  getEntries, getDueDates, getMilestones, getBlockers, getFullWeek,
  setEntries, setDueDates, setMilestones, setBlockers,
} from './utils/data'
import TopBar from './components/TopBar'
import WeekGrid from './components/WeekGrid'
import BottomSections from './components/BottomSections'
import PlanningView from './components/PlanningView'
import AddEntryDialog from './components/dialogs/AddEntryDialog'
import AddDueDateDialog from './components/dialogs/AddDueDateDialog'
import AddMilestoneDialog from './components/dialogs/AddMilestoneDialog'
import SimpleTextDialog from './components/dialogs/SimpleTextDialog'
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
    loadStore().then(d => setData(migrateData(d || { ...DEFAULT_DATA })))
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
  const onDeleteEntry = (ds, idx) =>
    mutate(setEntries(data, wk, ds, getEntries(data, wk, ds).filter((_, i) => i !== idx)))

  // ── Due date handlers ─────────────────────────────────────────────────────
  const onAddDD        = () => setDialog({ t: 'addDD' })
  const onEditDD       = (idx) => setDialog({ t: 'editDD', idx })
  const onDeleteDD     = (idx) => mutate(setDueDates(data, getDueDates(data).filter((_, i) => i !== idx)))
  const onToggleDoneDD = (idx) => mutate(setDueDates(data, getDueDates(data).map((x, i) => i === idx ? { ...x, done: !x.done } : x)))

  // ── Milestone handlers ────────────────────────────────────────────────────
  const onAddMS        = () => setDialog({ t: 'addMS' })
  const onEditMS       = (idx) => setDialog({ t: 'editMS', idx })
  const onDeleteMS     = (idx) => mutate(setMilestones(data, getMilestones(data).filter((_, i) => i !== idx)))
  const onToggleDoneMS = (idx) => mutate(setMilestones(data, getMilestones(data).map((x, i) => i === idx ? { ...x, done: !x.done } : x)))

  // ── Blocker handlers ──────────────────────────────────────────────────────
  const onAddBL    = () => setDialog({ t: 'addBL' })
  const onEditBL   = (idx) => setDialog({ t: 'editBL', idx })
  const onDeleteBL = (idx) => mutate(setBlockers(data, wk, getBlockers(data, wk).filter((_, i) => i !== idx)))

  // ── Generate ──────────────────────────────────────────────────────────────
  const onGenerate = () => {
    const wkData = getFullWeek(data, wk)
    const projMap = {}
    for (const d of dates) {
      const ds = toISO(d)
      for (const e of (wkData.entries[ds] || [])) {
        if (!projMap[e.project]) projMap[e.project] = []
        projMap[e.project].push([fmt(d), e.text])
      }
    }
    const friday  = weekFriday(dates[0])
    const yy      = String(friday.getFullYear()).slice(2)
    const mm      = String(friday.getMonth() + 1).padStart(2, '0')
    const dd      = String(friday.getDate()).padStart(2, '0')
    const subject = `[weekly]${data.user_name} ${yy}${mm}${dd}`

    const lines = [`[제목] ${subject}`, `[받는 사람] ${RECIPIENT}`, '', '== 이번 주 작업 ==']

    if (Object.keys(projMap).length) {
      for (const [proj, items] of Object.entries(projMap))
        for (const [tag, txt] of items)
          lines.push(`- [${proj}] ${txt} (${tag})`)
    } else {
      lines.push('(항목 없음)')
    }

    lines.push('', '== 다음 1~2주 마감일 (Due dates) ==')
    const due = getDueDates(data)
    due.length ? due.forEach(x => lines.push(`- ${ddLabel(x)}`)) : lines.push('(항목 없음)')

    lines.push('', '== 마일스톤 (Milestones) ==')
    const ms = getMilestones(data)
    ms.length ? ms.forEach(x => lines.push(`- ${x.project}: ${x.detail} → ${fmtDateStr(x.target)}`)) : lines.push('(항목 없음)')

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

      {/* ── Dialogs ─────────────────────────────────────────────────────── */}
      {dialog?.t === 'addEntry' && (
        <AddEntryDialog projects={data.projects} dayLabel={dialog.dayLabel} onClose={close}
          onSubmit={e => { mutate(setEntries(data, wk, dialog.ds, [...getEntries(data, wk, dialog.ds), e])); close() }} />
      )}
      {dialog?.t === 'editEntry' && (
        <AddEntryDialog projects={data.projects} dayLabel={dialog.dayLabel} initial={dialog.entry} onClose={close}
          onSubmit={e => { mutate(setEntries(data, wk, dialog.ds, getEntries(data, wk, dialog.ds).map((x, i) => i === dialog.idx ? e : x))); close() }} />
      )}
      {dialog?.t === 'addDD' && (
        <AddDueDateDialog projects={data.projects} onClose={close}
          onSubmit={item => { mutate(setDueDates(data, [...getDueDates(data), item])); close() }} />
      )}
      {dialog?.t === 'editDD' && (
        <AddDueDateDialog projects={data.projects} initial={getDueDates(data)[dialog.idx]} onClose={close}
          onSubmit={item => { mutate(setDueDates(data, getDueDates(data).map((x, i) => i === dialog.idx ? item : x))); close() }} />
      )}
      {dialog?.t === 'addMS' && (
        <AddMilestoneDialog projects={data.projects} onClose={close}
          onSubmit={item => { mutate(setMilestones(data, [...getMilestones(data), item])); close() }} />
      )}
      {dialog?.t === 'editMS' && (
        <AddMilestoneDialog projects={data.projects} initial={getMilestones(data)[dialog.idx]} onClose={close}
          onSubmit={item => { mutate(setMilestones(data, getMilestones(data).map((x, i) => i === dialog.idx ? item : x))); close() }} />
      )}
      {dialog?.t === 'addBL' && (
        <SimpleTextDialog title="Blocker 추가" onClose={close}
          onSubmit={t => { mutate(setBlockers(data, wk, [...getBlockers(data, wk), t])); close() }} />
      )}
      {dialog?.t === 'editBL' && (
        <SimpleTextDialog title="Blocker 수정" initial={getBlockers(data, wk)[dialog.idx]} onClose={close}
          onSubmit={t => { mutate(setBlockers(data, wk, getBlockers(data, wk).map((x, i) => i === dialog.idx ? t : x))); close() }} />
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
