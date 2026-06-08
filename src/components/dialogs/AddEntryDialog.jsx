import { useState, useEffect, useRef } from 'react'
import Modal, { ModalFooter } from '../Modal'
import TagPicker from '../TagPicker'
import { C } from '../../utils/colors'

export default function AddEntryDialog({ projects, dayLabel, initial, onClose, onSubmit }) {
  const [project, setProject] = useState(initial?.project ?? (projects[0] ?? ''))
  const [text, setText] = useState(initial?.text ?? '')
  const [errors, setErrors] = useState({})
  const textRef = useRef()

  useEffect(() => { textRef.current?.focus() }, [])

  const submit = () => {
    const e = {}
    if (!project) e.project = true
    if (!text.trim()) e.text = true
    if (Object.keys(e).length) { setErrors(e); return }
    onSubmit({ project, text: text.trim() })
  }

  return (
    <Modal title={`활동 ${initial ? '수정' : '추가'} — ${dayLabel}`} onClose={onClose} width={480}>
      <div style={{ padding: '14px 20px 0' }}>
        <label style={{ display: 'block', color: C.fg2, fontSize: 12, marginBottom: 5 }}>프로젝트</label>
        <TagPicker
          projects={projects} value={project}
          onChange={v => { setProject(v); setErrors(e => ({ ...e, project: false })) }}
          error={errors.project}
        />
        <label style={{ display: 'block', color: C.fg2, fontSize: 12, margin: '12px 0 5px' }}>
          내용&nbsp;<span style={{ color: C.fg3, fontWeight: 400 }}>(Ctrl+Enter 저장)</span>
        </label>
        <textarea
          ref={textRef}
          value={text}
          rows={4}
          className={errors.text ? 'error' : ''}
          onChange={e => { setText(e.target.value); setErrors(er => ({ ...er, text: false })) }}
          onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) submit() }}
        />
      </div>
      <ModalFooter onClose={onClose} onSubmit={submit} submitText={initial ? '저장' : '추가'} />
    </Modal>
  )
}
