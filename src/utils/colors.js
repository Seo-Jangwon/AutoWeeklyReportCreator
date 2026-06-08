export const C = {
  bg:      '#181825',
  bg2:     '#1e1e2e',
  bg3:     '#313244',
  card:    '#252537',
  cardHi:  '#313244',
  fg:      '#cdd6f4',
  fg2:     '#a6adc8',
  fg3:     '#6c7086',
  accent:  '#89b4fa',
  accent2: '#cba6f7',
  warn:    '#f38ba8',
  success: '#a6e3a1',
  sat:     '#74c7ec',
  sun:     '#f38ba8',
}

const PROJECT_COLORS = [
  '#89b4fa', '#a6e3a1', '#fab387', '#cba6f7', '#94e2d5',
  '#f9e2af', '#f5c2e7', '#b4befe', '#eba0ac', '#74c7ec',
]

const CRC32_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
    t[i] = c
  }
  return t
})()

function crc32(str) {
  const bytes = new TextEncoder().encode(str)
  let crc = 0xFFFFFFFF
  for (const b of bytes) crc = CRC32_TABLE[(crc ^ b) & 0xFF] ^ (crc >>> 8)
  return (crc ^ 0xFFFFFFFF) >>> 0
}

export function projectColor(name) {
  if (!name) return C.fg2
  return PROJECT_COLORS[crc32(name) % PROJECT_COLORS.length]
}

export function lighten(hex, f = 0.12) {
  const h = hex.replace('#', '')
  const r = Math.min(255, Math.round(parseInt(h.slice(0, 2), 16) + (255 - parseInt(h.slice(0, 2), 16)) * f))
  const g = Math.min(255, Math.round(parseInt(h.slice(2, 4), 16) + (255 - parseInt(h.slice(2, 4), 16)) * f))
  const b = Math.min(255, Math.round(parseInt(h.slice(4, 6), 16) + (255 - parseInt(h.slice(4, 6), 16)) * f))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

export function blend(c1, c2, t) {
  const p = h => { const s = h.replace('#', ''); return [parseInt(s.slice(0,2),16), parseInt(s.slice(2,4),16), parseInt(s.slice(4,6),16)] }
  const [ar,ag,ab] = p(c1); const [br,bg_,bb] = p(c2)
  const r = Math.round(ar + (br-ar)*t), g = Math.round(ag + (bg_-ag)*t), b = Math.round(ab + (bb-ab)*t)
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
}
