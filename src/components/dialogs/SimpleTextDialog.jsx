import { useState, useEffect, useRef } from 'react'
import Modal, { ModalFooter } from '../Modal'
import { C } from '../../utils/colors'

export default function SimpleTextDialog({ title, initial = '', onClose, onSubmit }) {
  const [text, setText] = useState(initial)
  const [error, setError] = useState(false)
  const ref = useRef()

  useEffect(() => { ref.current?.focus(); ref.current?.select() }, [])

  const submit = () => {
    if (!text.trim()) { setError(true); return }
    onSubmit(text.trim())
  }

  return (
    <Modal title={title} onClose={onClose} width={400}>
      <div style={{ padding: '14px 20px 0' }}>
        <label style={{ display: 'block', color: C.fg2, fontSize: 12, marginBottom: 5 }}>내용</label>
        <input
          ref={ref} value={text} className={error ? 'error' : ''}
          onChange={e => { setText(e.target.value); setError(false) }}
          onKeyDown={e => { if (e.key === 'Enter') submit() }}
        />
      </div>
      <ModalFooter onClose={onClose} onSubmit={submit} />
    </Modal>
  )
}
