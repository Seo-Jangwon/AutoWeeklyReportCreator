import { useState, useEffect, useRef } from 'react'
import Modal, { ModalFooter } from '../Modal'
import TagPicker from '../TagPicker'
import { C } from '../../utils/colors'
import { toISO } from '../../utils/dates'

export default function AddDueDateDialog({ projects, initial, onClose, onSubmit }) {
  const [project, setProject] = useState(initial?.project ?? (projects[0] ?? ''))
  const [task, setTask]       = useState(initial?.task ?? '')
  const [date, setDate]       = useState(initial?.date ?? toISO(new Date()))
  const [errors, setErrors]   = useState({})
  const taskRef = useRef()

  useEffect(() => { taskRef.current?.focus() }, [])

  const submit = () => {
    const e = {}
    if (!task.trim()) e.task = true
    if (!date)        e.date = true
    if (Object.keys(e).length) { setErrors(e); return }
    onSubmit({ project, task: task.trim(), date })
  }

  return (
    <Modal title={`마감일 ${initial ? '수정' : '추가'}`} onClose={onClose} width={460}>
      <div style={{ padding: '14px 20px 0' }}>
        <label style={{ display: 'block', color: C.fg2, fontSize: 12, marginBottom: 5 }}>프로젝트</label>
        <TagPicker projects={projects} value={project} onChange={v => setProject(v)} />

        <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: '10px 12px', margin: '12px 0 0', alignItems: 'center' }}>
          <label style={{ color: C.fg2, fontSize: 12 }}>작업</label>
          <input
            ref={taskRef} value={task} className={errors.task ? 'error' : ''}
            onChange={e => { setTask(e.target.value); setErrors(r => ({ ...r, task: false })) }}
            onKeyDown={e => { if (e.key === 'Enter') submit() }}
            placeholder="작업명"
          />

          <label style={{ color: C.fg2, fontSize: 12 }}>날짜</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="date"
              value={date}
              className={errors.date ? 'error' : ''}
              style={{ width: 155, colorScheme: 'dark' }}
              onChange={e => { setDate(e.target.value); setErrors(r => ({ ...r, date: false })) }}
            />
            <span style={{ color: C.fg3, fontSize: 11 }}>작은 작업 마감일</span>
          </div>
        </div>
      </div>
      <ModalFooter onClose={onClose} onSubmit={submit} submitText={initial ? '저장' : '추가'} />
    </Modal>
  )
}
