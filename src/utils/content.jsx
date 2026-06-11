import { C } from './colors'

export function renderLines(text, opts = {}) {
  const { fontSize = 11, lineHeight = 1.6 } = opts
  return (text || '').split('\n').map((line, i) => {
    if (!line.trim()) return <div key={i} style={{ height: 5 }} />
    const isIndented = /^ {2,}/.test(line)
    const stripped = line.trimStart()
    const isBullet = stripped.startsWith('- ')
    const body = isBullet ? stripped.slice(2) : stripped
    return (
      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', paddingLeft: isIndented ? 14 : 0, marginBottom: 2 }}>
        {isBullet && (
          <span style={{ color: C.fg3, marginRight: 5, flexShrink: 0, lineHeight, fontSize }}>·</span>
        )}
        <span style={{ color: isIndented ? C.fg3 : C.fg2, fontSize, lineHeight, wordBreak: 'break-word' }}>
          {body}
        </span>
      </div>
    )
  })
}
