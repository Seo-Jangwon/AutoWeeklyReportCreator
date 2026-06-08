import { useState, useEffect, useRef } from 'react'
import Modal, { ModalFooter } from '../Modal'
import { C } from '../../utils/colors'

export default function SettingsDialog({ data, onClose, onChange }) {
  const [name, setName] = useState(data.user_name || '서장원')
  const ref = useRef()

  useEffect(() => { ref.current?.focus(); ref.current?.select() }, [])

  const preview = `[weekly]${name || '이름'} YYMMDD`

  const submit = () => {
    if (!name.trim()) return
    onChange({ ...data, user_name: name.trim() })
    onClose()
  }

  return (
    <Modal title="설정" onClose={onClose} width={400}>
      <div style={{ padding: '18px 24px 0', textAlign: 'center' }}>
        <p style={{ color: C.fg, fontWeight: 700, fontSize: 13, marginBottom: 4 }}>이름 / 표시명</p>
        <p style={{ color: C.fg2, fontSize: 12, marginBottom: 12 }}>
          주간 메모 제목에 들어갑니다
        </p>
        <input
          ref={ref} value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit() }}
          style={{ textAlign: 'center', marginBottom: 8 }}
        />
        <p style={{ color: C.accent, fontWeight: 700, fontSize: 13, marginTop: 6 }}>{preview}</p>
      </div>
      <ModalFooter onClose={onClose} onSubmit={submit} submitText="저장" />
    </Modal>
  )
}
