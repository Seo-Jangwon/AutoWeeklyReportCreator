import { useState, useRef } from 'react'
import { Trash2, Plus } from 'lucide-react'
import Modal from '../Modal'
import { C, projectColor } from '../../utils/colors'

export default function ProjectManagerDialog({ data, onClose, onChange }) {
  const [projects, setProjects] = useState(data.projects || [])
  const [newName, setNewName] = useState('')
  const inputRef = useRef()

  const add = () => {
    const name = newName.trim()
    if (!name || projects.includes(name)) { setNewName(''); return }
    const next = [...projects, name]
    setProjects(next)
    onChange({ ...data, projects: next })
    setNewName('')
    inputRef.current?.focus()
  }

  const remove = (idx) => {
    const next = projects.filter((_, i) => i !== idx)
    setProjects(next)
    onChange({ ...data, projects: next })
  }

  return (
    <Modal title="프로젝트 관리" onClose={onClose} width={340}>
      <div style={{ padding: '14px 20px' }}>
        <p style={{ color: C.fg2, fontSize: 12, marginBottom: 10 }}>연구 주제 / 프로젝트</p>

        <div style={{
          background: C.bg2, borderRadius: 7, border: `1px solid ${C.bg3}`,
          maxHeight: 260, overflowY: 'auto', marginBottom: 12,
        }}>
          {projects.length === 0 ? (
            <div style={{ color: C.fg3, fontSize: 12, padding: '16px', textAlign: 'center', opacity: 0.7 }}>
              프로젝트가 없습니다.
            </div>
          ) : projects.map((p, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', padding: '9px 12px',
              borderBottom: i < projects.length - 1 ? `1px solid ${C.bg3}` : 'none',
              transition: 'background 0.1s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = C.bg3}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: projectColor(p), marginRight: 10, flexShrink: 0,
              }} />
              <span style={{ flex: 1, color: C.fg, fontSize: 13 }}>{p}</span>
              <button
                onClick={() => remove(i)}
                style={{
                  background: 'transparent', color: C.fg3,
                  padding: '3px', borderRadius: 4,
                  display: 'flex', alignItems: 'center',
                  transition: 'color 0.1s, background 0.1s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = C.warn; e.currentTarget.style.background = 'rgba(243,139,168,0.15)' }}
                onMouseLeave={e => { e.currentTarget.style.color = C.fg3; e.currentTarget.style.background = 'transparent' }}
              >
                <Trash2 size={13} strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            ref={inputRef}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') add() }}
            placeholder="새 프로젝트 이름"
            style={{ flex: 1 }}
          />
          <button
            onClick={add}
            style={{
              background: C.success, color: '#1e1e2e',
              padding: '7px 14px', fontSize: 12, fontWeight: 700, borderRadius: 6,
              flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
              transition: 'background 0.12s, transform 0.1s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#bdf5b8'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.background = C.success; e.currentTarget.style.transform = '' }}
          >
            <Plus size={13} strokeWidth={2.5} />
            추가
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 20px 16px' }}>
        <button
          onClick={onClose}
          style={{
            background: C.bg3, color: C.fg2, padding: '7px 18px', fontSize: 13, borderRadius: 6,
            transition: 'background 0.12s, color 0.12s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#45475a'; e.currentTarget.style.color = C.fg }}
          onMouseLeave={e => { e.currentTarget.style.background = C.bg3; e.currentTarget.style.color = C.fg2 }}
        >닫기</button>
      </div>
    </Modal>
  )
}
