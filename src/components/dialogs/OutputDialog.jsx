import { useState } from 'react'
import { Copy, Check, Download, ClipboardCopy } from 'lucide-react'
import Modal from '../Modal'
import { C } from '../../utils/colors'

export default function OutputDialog({ text, subject, onClose }) {
  const [copied, setCopied] = useState(false)
  const [copiedSubj, setCopiedSubj] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const copySubject = () => {
    navigator.clipboard.writeText(subject).then(() => {
      setCopiedSubj(true)
      setTimeout(() => setCopiedSubj(false), 2000)
    })
  }

  const save = () => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${subject}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Modal title="Weekly Report 생성 완료" onClose={onClose} width={720}>
      <div style={{ padding: '12px 20px 0' }}>
        <p style={{ color: C.fg3, fontSize: 12, marginBottom: 10 }}>
          아래 내용을 복사해서 이메일에 붙여넣으세요
        </p>

        {subject && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
            background: C.bg2, borderRadius: 7, padding: '8px 12px',
            border: `1px solid ${C.bg3}`,
          }}>
            <span style={{ color: C.fg3, fontSize: 11 }}>메일 제목</span>
            <span style={{ color: C.accent, fontWeight: 700, fontSize: 13, flex: 1 }}>{subject}</span>
            <button
              onClick={copySubject}
              style={{
                background: copiedSubj ? 'rgba(166,227,161,0.15)' : C.bg3,
                color: copiedSubj ? C.success : C.fg2,
                padding: '4px 12px', fontSize: 11, borderRadius: 5,
                display: 'flex', alignItems: 'center', gap: 5,
                transition: 'all 0.15s',
                flexShrink: 0,
              }}
            >
              {copiedSubj ? <Check size={12} strokeWidth={2.5} /> : <Copy size={12} strokeWidth={2} />}
              {copiedSubj ? '복사됨' : '제목 복사'}
            </button>
          </div>
        )}

        <textarea
          readOnly value={text}
          style={{
            width: '100%', height: 360, fontFamily: 'Consolas, monospace',
            fontSize: 12, lineHeight: 1.65, resize: 'none', background: C.bg2,
            color: C.fg, border: `1px solid ${C.bg3}`, borderRadius: 7, padding: '10px 12px',
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '10px 20px 18px' }}>
        <button
          onClick={onClose}
          style={{
            background: C.bg3, color: C.fg2, padding: '7px 16px', fontSize: 13, borderRadius: 6,
            transition: 'background 0.12s, color 0.12s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#45475a'; e.currentTarget.style.color = C.fg }}
          onMouseLeave={e => { e.currentTarget.style.background = C.bg3; e.currentTarget.style.color = C.fg2 }}
        >닫기</button>
        <button
          onClick={save}
          style={{
            background: C.bg3, color: C.fg2, padding: '7px 16px', fontSize: 13, borderRadius: 6,
            display: 'flex', alignItems: 'center', gap: 6,
            transition: 'background 0.12s, color 0.12s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#45475a'; e.currentTarget.style.color = C.fg }}
          onMouseLeave={e => { e.currentTarget.style.background = C.bg3; e.currentTarget.style.color = C.fg2 }}
        >
          <Download size={13} strokeWidth={2} />
          .txt 저장
        </button>
        <button
          onClick={copy}
          style={{
            background: copied ? 'rgba(166,227,161,0.2)' : C.accent,
            color: copied ? C.success : C.bg2,
            padding: '7px 20px', fontSize: 13, fontWeight: 700, borderRadius: 6,
            display: 'flex', alignItems: 'center', gap: 6,
            transition: 'all 0.15s',
            border: copied ? `1px solid ${C.success}` : '1px solid transparent',
            transform: 'translateY(0)',
          }}
          onMouseEnter={e => { if (!copied) { e.currentTarget.style.background = '#a0c4ff'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
          onMouseLeave={e => { if (!copied) { e.currentTarget.style.background = C.accent; e.currentTarget.style.transform = '' } }}
        >
          {copied
            ? <><Check size={14} strokeWidth={2.5} /> 복사됨!</>
            : <><ClipboardCopy size={14} strokeWidth={2} /> 클립보드 복사</>
          }
        </button>
      </div>
    </Modal>
  )
}
