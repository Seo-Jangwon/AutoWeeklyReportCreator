import { useState, useEffect, useRef } from 'react'
import Modal, { ModalFooter } from '../Modal'
import TagPicker from '../TagPicker'
import { C } from '../../utils/colors'
import { toISO, addWeeks } from '../../utils/dates'

export default function AddMilestoneDialog({ projects, initial, onClose, onSubmit }) {
  const [project, setProject] = useState(initial?.project ?? (projects[0] ?? ''))
  const [detail, setDetail]   = useState(initial?.detail ?? '')
  const [target, setTarget]   = useState(initial?.target ?? toISO(addWeeks(new Date(), 4)))
  const [errors, setErrors]   = useState({})
  const detailRef = useRef()

  useEffect(() => { detailRef.current?.focus() }, [])

  const submit = () => {
    const e = {}
    if (!project)      e.project = true
    if (!detail.trim()) e.detail = true
    if (!target)       e.target = true
    if (Object.keys(e).length) { setErrors(e); return }
    onSubmit({ project, detail: detail.trim(), target })
  }

  return (
    <Modal title={`마일스톤 ${initial ? '수정' : '추가'}`} onClose={onClose} width={460}>
      <div style={{ padding: '14px 20px 0' }}>
        <label style={{ display: 'block', color: C.fg2, fontSize: 12, marginBottom: 5 }}>프로젝트</label>
        <TagPicker
          projects={projects} value={project}
          onChange={v => { setProject(v); setErrors(e => ({ ...e, project: false })) }}
          error={errors.project}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: '10px 12px', margin: '12px 0 0', alignItems: 'center' }}>
          <label style={{ color: C.fg2, fontSize: 12 }}>내용</label>
          <input
            ref={detailRef} value={detail} className={errors.detail ? 'error' : ''}
            onChange={e => { setDetail(e.target.value); setErrors(r => ({ ...r, detail: false })) }}
            onKeyDown={e => { if (e.key === 'Enter') submit() }}
            placeholder="마일스톤 내용"
          />

          <label style={{ color: C.fg2, fontSize: 12 }}>목표시점</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="date"
              value={target}
              className={errors.target ? 'error' : ''}
              style={{ width: 155, colorScheme: 'dark' }}
              onChange={e => { setTarget(e.target.value); setErrors(r => ({ ...r, target: false })) }}
            />
            <span style={{ color: C.fg3, fontSize: 11 }}>큰 작업 목표 날짜</span>
          </div>
        </div>
      </div>
      <ModalFooter onClose={onClose} onSubmit={submit} submitText={initial ? '저장' : '추가'} />
    </Modal>
  )
}
