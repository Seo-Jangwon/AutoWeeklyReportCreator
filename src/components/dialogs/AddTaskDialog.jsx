import { useState, useEffect, useRef } from 'react'
import Modal, { ModalFooter } from '../Modal'
import TagPicker from '../TagPicker'
import { C, projectColor } from '../../utils/colors'
import { toISO, fmtDateStr } from '../../utils/dates'
import { genId } from '../../utils/data'

const selectStyle = {
  width: '100%', boxSizing: 'border-box',
  background: '#313244', color: '#cdd6f4',
  border: '1px solid #45475a', borderRadius: 6,
  padding: '6px 10px', fontSize: 12,
  colorScheme: 'dark',
}

export default function AddTaskDialog({ projects, tasks, dueDates = [], milestones = [], initial, initialProject, onClose, onSubmit }) {
  const [project, setProject]       = useState(initial?.project ?? initialProject ?? '')
  const [title, setTitle]           = useState(initial?.title ?? '')
  const [start, setStart]           = useState(initial?.startDate ?? toISO(new Date()))
  const [end, setEnd]               = useState(initial?.endDate ?? toISO(new Date()))
  const [preds, setPreds]           = useState(initial?.predecessors ?? [])
  const [dueDateId, setDueDateId]   = useState(initial?.dueDateId ?? '')
  const [milestoneId, setMilestoneId] = useState(initial?.milestoneId ?? '')
  const [done, setDone]             = useState(initial?.done ?? false)
  const [errors, setErrors]         = useState({})
  const titleRef = useRef()

  useEffect(() => { titleRef.current?.focus() }, [])

  const otherTasks = tasks.filter(t => t.id !== initial?.id)

  const togglePred = (id) =>
    setPreds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const submit = () => {
    const e = {}
    if (!title.trim())                  e.title = true
    if (!start)                         e.start = true
    if (!end)                           e.end = true
    if (start && end && start > end)    e.end = true
    if (Object.keys(e).length) { setErrors(e); return }
    onSubmit({
      id: initial?.id ?? genId(),
      project,
      title: title.trim(),
      startDate: start,
      endDate: end,
      predecessors: preds,
      dueDateId: dueDateId || null,
      milestoneId: milestoneId || null,
      done,
    })
  }

  const dateErr = start && end && start > end

  return (
    <Modal title={`작업 ${initial ? '수정' : '추가'}`} onClose={onClose} width={490}>
      <div style={{ padding: '14px 20px 0', display: 'flex', flexDirection: 'column', gap: 13 }}>

        {/* Project */}
        <div>
          <label style={{ display: 'block', color: C.fg2, fontSize: 12, marginBottom: 5 }}>프로젝트</label>
          <TagPicker projects={projects} value={project} onChange={setProject} />
        </div>

        {/* Title */}
        <div>
          <label style={{ display: 'block', color: C.fg2, fontSize: 12, marginBottom: 5 }}>작업명</label>
          <input
            ref={titleRef}
            value={title}
            className={errors.title ? 'error' : ''}
            onChange={e => { setTitle(e.target.value); setErrors(r => ({ ...r, title: false })) }}
            onKeyDown={e => { if (e.key === 'Enter') submit() }}
            placeholder="작업명을 입력하세요"
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </div>

        {/* Date range */}
        <div>
          <label style={{ display: 'block', color: C.fg2, fontSize: 12, marginBottom: 5 }}>기간</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="date"
              value={start}
              className={errors.start ? 'error' : ''}
              style={{ colorScheme: 'dark', flex: 1 }}
              onChange={e => { setStart(e.target.value); setErrors(r => ({ ...r, start: false, end: false })) }}
            />
            <span style={{ color: C.fg3, fontSize: 13 }}>~</span>
            <input
              type="date"
              value={end}
              className={errors.end ? 'error' : ''}
              style={{ colorScheme: 'dark', flex: 1 }}
              onChange={e => { setEnd(e.target.value); setErrors(r => ({ ...r, end: false })) }}
            />
          </div>
          {dateErr && (
            <span style={{ color: C.warn, fontSize: 11, marginTop: 4, display: 'block' }}>
              종료일이 시작일보다 빠릅니다
            </span>
          )}
        </div>

        {/* Predecessors */}
        <div>
          <label style={{ display: 'block', color: C.fg2, fontSize: 12, marginBottom: 5 }}>
            선행 작업
            {preds.length > 0 && (
              <span style={{
                marginLeft: 6, background: C.accent, color: C.bg,
                fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10,
              }}>{preds.length}</span>
            )}
          </label>
          {otherTasks.length === 0 ? (
            <span style={{ color: C.fg3, fontSize: 12 }}>등록된 다른 작업이 없습니다</span>
          ) : (
            <div style={{
              background: C.bg3, borderRadius: 6, border: `1px solid ${C.bg3}`,
              maxHeight: 150, overflowY: 'auto', padding: '3px 0',
            }}>
              {otherTasks.map(t => {
                const col = projectColor(t.project)
                const checked = preds.includes(t.id)
                return (
                  <label
                    key={t.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '5px 10px', cursor: 'pointer',
                      background: checked ? `${col}18` : 'transparent',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { if (!checked) e.currentTarget.style.background = `${C.bg2}99` }}
                    onMouseLeave={e => { if (!checked) e.currentTarget.style.background = 'transparent' }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePred(t.id)}
                      style={{ accentColor: col, width: 13, height: 13, flexShrink: 0 }}
                    />
                    {t.project && (
                      <span style={{
                        background: `${col}22`, color: col, fontSize: 10, fontWeight: 600,
                        padding: '1px 5px', borderRadius: 3, border: `1px solid ${col}33`,
                        flexShrink: 0,
                      }}>{t.project}</span>
                    )}
                    <span style={{
                      color: C.fg2, fontSize: 11, flex: 1,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{t.title}</span>
                    <span style={{ color: C.fg3, fontSize: 10, flexShrink: 0 }}>
                      {fmtDateStr(t.startDate)} ~ {fmtDateStr(t.endDate)}
                    </span>
                  </label>
                )
              })}
            </div>
          )}
        </div>

        {/* Due Date link */}
        {dueDates.length > 0 && (
          <div>
            <label style={{ display: 'block', color: C.fg2, fontSize: 12, marginBottom: 5 }}>관련 마감일</label>
            <select value={dueDateId} onChange={e => setDueDateId(e.target.value)} style={selectStyle}>
              <option value="">없음</option>
              {dueDates.map(d => (
                <option key={d.id} value={d.id}>
                  {d.project ? `[${d.project}] ` : ''}{d.task} → {d.date}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Milestone link */}
        {milestones.length > 0 && (
          <div>
            <label style={{ display: 'block', color: C.fg2, fontSize: 12, marginBottom: 5 }}>관련 마일스톤</label>
            <select value={milestoneId} onChange={e => setMilestoneId(e.target.value)} style={selectStyle}>
              <option value="">없음</option>
              {milestones.map(m => (
                <option key={m.id} value={m.id}>
                  {m.project ? `[${m.project}] ` : ''}{m.detail} → {m.target}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Done (edit only) */}
        {initial && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={done}
              onChange={e => setDone(e.target.checked)}
              style={{ accentColor: C.success, width: 14, height: 14 }}
            />
            <span style={{ color: C.fg2, fontSize: 12 }}>완료 처리</span>
          </label>
        )}
      </div>
      <ModalFooter onClose={onClose} onSubmit={submit} submitText={initial ? '저장' : '추가'} />
    </Modal>
  )
}
