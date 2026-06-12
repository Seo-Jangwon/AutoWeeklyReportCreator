import { useState, useEffect, useRef } from 'react'
import Modal, { ModalFooter } from '../Modal'
import TagPicker from '../TagPicker'
import { C, projectColor } from '../../utils/colors'
import { fmtDateStr } from '../../utils/dates'
import { renderLines } from '../../utils/content'

const selectStyle = {
  width: '100%', boxSizing: 'border-box',
  background: '#313244', color: '#cdd6f4',
  border: '1px solid #45475a', borderRadius: 6,
  padding: '6px 10px', fontSize: 12,
  colorScheme: 'dark',
}

export default function AddEntryDialog({ projects, tasks = [], milestones = [], dayLabel, initial, onClose, onSubmit }) {
  const [project, setProject]           = useState(initial?.project ?? (projects[0] ?? ''))
  const [title, setTitle]               = useState(initial?.title ?? initial?.text ?? '')
  const [content, setContent]           = useState(initial?.content ?? '')
  const [predecessorIds, setPredecessorIds] = useState(initial?.predecessorIds ?? [])
  const [milestoneId, setMilestoneId]   = useState(initial?.milestoneId ?? '')
  const [previewId, setPreviewId]       = useState(null)
  const [errors, setErrors]             = useState({})
  const titleRef = useRef()

  // Active milestones first (same project on top, then by target date); keep a done one only if already selected
  const msOptions = milestones
    .filter(m => !m.done || m.id === milestoneId)
    .sort((a, b) =>
      ((b.project === project) - (a.project === project)) ||
      (a.target || '').localeCompare(b.target || '')
    )

  useEffect(() => { titleRef.current?.focus() }, [])

  // Exclude this entry's own mirror task — an activity can't precede itself
  const sortedTasks = tasks
    .filter(t => t.id !== (initial?.taskId ?? ''))
    .sort((a, b) => b.startDate.localeCompare(a.startDate))

  const togglePred = (id) =>
    setPredecessorIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const submit = () => {
    const e = {}
    if (!title.trim()) e.title = true
    if (Object.keys(e).length) { setErrors(e); return }
    onSubmit({
      project,
      title: title.trim(),
      content: content.trim(),
      predecessorIds,
      milestoneId: milestoneId || null,
      taskId: initial?.taskId ?? null,
    })
  }

  return (
    <Modal title={`활동 ${initial ? '수정' : '추가'} — ${dayLabel}`} onClose={onClose} width={500}>
      <div style={{ padding: '14px 20px 0', display: 'flex', flexDirection: 'column', gap: 13 }}>

        {/* Project */}
        <div>
          <label style={{ display: 'block', color: C.fg2, fontSize: 12, marginBottom: 5 }}>프로젝트</label>
          <TagPicker projects={projects} value={project}
            onChange={v => { setProject(v); setErrors(e => ({ ...e, project: false })) }} error={errors.project} />
        </div>

        {/* Title */}
        <div>
          <label style={{ display: 'block', color: C.fg2, fontSize: 12, marginBottom: 5 }}>제목</label>
          <input
            ref={titleRef}
            value={title}
            className={errors.title ? 'error' : ''}
            onChange={e => { setTitle(e.target.value); setErrors(r => ({ ...r, title: false })) }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) submit() }}
            placeholder="작업 제목을 입력하세요"
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </div>

        {/* Content */}
        <div>
          <label style={{ display: 'block', color: C.fg2, fontSize: 12, marginBottom: 5 }}>
            내용&nbsp;<span style={{ color: C.fg3, fontWeight: 400 }}>(선택 · Ctrl+Enter 저장)</span>
          </label>
          <textarea
            value={content}
            rows={3}
            onChange={e => setContent(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) submit() }}
            placeholder={'- 세부 내용 1\n- 세부 내용 2'}
            style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
          />
        </div>

        {/* Milestone link */}
        {msOptions.length > 0 && (
          <div>
            <label style={{ display: 'block', color: C.fg2, fontSize: 12, marginBottom: 5 }}>
              마일스톤&nbsp;<span style={{ color: C.fg3, fontWeight: 400 }}>(선택 — 플로우 탭에서 해당 마일스톤 아래에 묶입니다)</span>
            </label>
            <select value={milestoneId} onChange={e => setMilestoneId(e.target.value)} style={selectStyle}>
              <option value="">없음</option>
              {msOptions.map(m => (
                <option key={m.id} value={m.id}>
                  {m.project ? `[${m.project}] ` : ''}{m.detail} → {fmtDateStr(m.target)}{m.done ? ' (완료)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Predecessor tasks */}
        {sortedTasks.length > 0 && (
          <div>
            <label style={{ display: 'block', color: C.fg2, fontSize: 12, marginBottom: 5 }}>
              선행 작업
              {predecessorIds.length > 0 && (
                <span style={{
                  marginLeft: 6, background: C.accent, color: C.bg,
                  fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10,
                }}>{predecessorIds.length}</span>
              )}
            </label>
            <div style={{ background: C.bg3, borderRadius: 6, maxHeight: 200, overflowY: 'auto' }}>
              {sortedTasks.map(t => {
                const col = projectColor(t.project)
                const checked = predecessorIds.includes(t.id)
                const isExpanded = previewId === t.id
                const hasNotes = (t.notes || '').trim().length > 0
                return (
                  <div
                    key={t.id}
                    style={{
                      borderBottom: `1px solid ${C.bg2}44`,
                      background: checked ? `${col}14` : 'transparent',
                      transition: 'background 0.1s',
                    }}
                  >
                    {/* Collapsed row */}
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', cursor: 'pointer' }}
                      onClick={() => setPreviewId(isExpanded ? null : t.id)}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePred(t.id)}
                        onClick={e => e.stopPropagation()}
                        style={{ accentColor: col, width: 13, height: 13, flexShrink: 0, cursor: 'pointer' }}
                      />
                      {t.project && (
                        <span style={{
                          background: `${col}22`, color: col, fontSize: 10, fontWeight: 600,
                          padding: '1px 5px', borderRadius: 3, border: `1px solid ${col}33`, flexShrink: 0,
                        }}>{t.project}</span>
                      )}
                      <span style={{
                        color: C.fg2, fontSize: 11, flex: 1,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{t.title}</span>
                      <span style={{ color: C.fg3, fontSize: 10, flexShrink: 0, marginLeft: 4 }}>
                        {isExpanded ? '▴' : '▾'}
                      </span>
                    </div>
                    {/* Expanded preview */}
                    {isExpanded && (
                      <div style={{
                        margin: '0 10px 8px',
                        padding: '9px 11px',
                        background: C.bg2, borderRadius: 6,
                        borderLeft: `3px solid ${col}`,
                      }}>
                        <div style={{ color: C.fg, fontSize: 12, fontWeight: 700, marginBottom: hasNotes ? 6 : 4, lineHeight: 1.4 }}>
                          {t.title}
                        </div>
                        {hasNotes && (
                          <div style={{ marginBottom: 6 }}>
                            {renderLines(t.notes, { fontSize: 11, lineHeight: 1.6 })}
                          </div>
                        )}
                        <div style={{ color: C.fg3, fontSize: 10, marginTop: 2 }}>
                          {fmtDateStr(t.startDate)} ~ {fmtDateStr(t.endDate)}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
      <ModalFooter onClose={onClose} onSubmit={submit} submitText={initial ? '저장' : '추가'} />
    </Modal>
  )
}
