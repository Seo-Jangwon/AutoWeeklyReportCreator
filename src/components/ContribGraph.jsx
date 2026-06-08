import { useMemo, useState } from 'react'
import { toISO, fmtDateStr } from '../utils/dates'
import { C, projectColor } from '../utils/colors'

const WEEK_DAYS = ['월', '화', '수', '목', '금', '토', '일']
const CELL_H = 13
const GAP    = 3

function buildMaps(data) {
  const contrib = {}
  const detail  = {}
  for (const wkData of Object.values(data.weeks || {})) {
    for (const [ds, entries] of Object.entries(wkData.entries || {})) {
      if (entries?.length) {
        contrib[ds] = (contrib[ds] || 0) + entries.length
        if (!detail[ds]) detail[ds] = []
        for (const e of entries) detail[ds].push(e)
      }
    }
  }
  return { contrib, detail }
}

function cellColor(count) {
  if (!count)    return '#313244'
  if (count < 2) return 'rgba(137,180,250,0.22)'
  if (count < 4) return 'rgba(137,180,250,0.45)'
  if (count < 7) return 'rgba(137,180,250,0.70)'
  return '#89b4fa'
}

const COL_TEMPLATE = `18px repeat(52, 1fr)`

export default function ContribGraph({ data }) {
  const [tooltip, setTooltip]   = useState(null)
  const [selected, setSelected] = useState(null)

  const { contribMap, detailMap } = useMemo(() => {
    const { contrib, detail } = buildMaps(data)
    return { contribMap: contrib, detailMap: detail }
  }, [data])

  const { cols, monthRow } = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const dow = today.getDay()
    const mondayOffset = dow === 0 ? 6 : dow - 1
    const thisMonday = new Date(today)
    thisMonday.setDate(today.getDate() - mondayOffset)
    const start = new Date(thisMonday)
    start.setDate(thisMonday.getDate() - 51 * 7)

    const cols = []
    const monthRow = Array(52).fill(null)
    let lastMonth = -1

    for (let w = 0; w < 52; w++) {
      const col = []
      for (let d = 0; d < 7; d++) {
        const date = new Date(start)
        date.setDate(start.getDate() + w * 7 + d)
        col.push(date)
      }
      const m = col[0].getMonth()
      if (m !== lastMonth) { monthRow[w] = `${m + 1}월`; lastMonth = m }
      cols.push(col)
    }
    return { cols, monthRow }
  }, [])

  const todayISO = toISO(new Date())
  const totalEntries = Object.values(contribMap).reduce((a, b) => a + b, 0)
  const activeDays   = Object.keys(contribMap).length

  return (
    <div style={{
      background: C.bg2, borderRadius: 9,
      border: `1px solid ${C.bg3}`,
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      padding: '12px 14px',
      flexShrink: 0,
    }}>
      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
        <span style={{ color: C.accent2, fontWeight: 700, fontSize: 12 }}>작업 기록</span>
        <span style={{ color: C.fg3, fontSize: 11 }}>최근 52주</span>
        <span style={{ color: C.fg3, fontSize: 11, marginLeft: 'auto' }}>
          총 {totalEntries}건 · {activeDays}일 활동
        </span>
      </div>

      {/* Month label row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: COL_TEMPLATE,
        gap: `0 ${GAP}px`,
        marginBottom: 3,
      }}>
        <div />
        {monthRow.map((label, w) => (
          <div key={w} style={{
            color: C.fg3, fontSize: 10,
            overflow: 'visible', whiteSpace: 'nowrap',
            userSelect: 'none',
          }}>{label ?? ''}</div>
        ))}
      </div>

      {/* Main grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: COL_TEMPLATE,
        gap: `0 ${GAP}px`,
      }}>
        {/* Day labels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
          {WEEK_DAYS.map((d, i) => (
            <div key={d} style={{
              height: CELL_H,
              display: 'flex', alignItems: 'center',
              color: C.fg3, fontSize: 9, userSelect: 'none',
              opacity: i % 2 === 0 ? 1 : 0,
            }}>{d}</div>
          ))}
        </div>

        {/* 52 week columns */}
        {cols.map((col, w) => (
          <div key={w} style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
            {col.map((date, d) => {
              const iso     = toISO(date)
              const count   = contribMap[iso] || 0
              const isFuture  = iso > todayISO
              const isSelected = iso === selected
              return (
                <div
                  key={d}
                  onClick={() => { if (count > 0) setSelected(s => s === iso ? null : iso) }}
                  style={{
                    height: CELL_H, borderRadius: 2,
                    background: isFuture ? 'transparent' : cellColor(count),
                    border: isSelected
                      ? `1px solid ${C.accent}`
                      : isFuture ? `1px solid rgba(69,71,90,0.4)` : 'none',
                    cursor: count > 0 ? 'pointer' : 'default',
                    transition: 'filter 0.1s',
                    boxSizing: 'border-box',
                    outline: isSelected ? `1px solid ${C.accent}44` : 'none',
                  }}
                  onMouseEnter={e => {
                    if (!isFuture) e.currentTarget.style.filter = 'brightness(1.4)'
                    const r = e.currentTarget.getBoundingClientRect()
                    setTooltip({ iso, count, x: r.left + r.width / 2, y: r.top })
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.filter = ''
                    setTooltip(null)
                  }}
                />
              )
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, justifyContent: 'flex-end' }}>
        <span style={{ color: C.fg3, fontSize: 10, marginRight: 2 }}>적음</span>
        {[0, 1, 3, 5, 7].map(n => (
          <div key={n} style={{ width: 13, height: 13, borderRadius: 2, background: cellColor(n), flexShrink: 0 }} />
        ))}
        <span style={{ color: C.fg3, fontSize: 10, marginLeft: 2 }}>많음</span>
      </div>

      {/* Detail panel — shown when a day is selected */}
      {selected && detailMap[selected] && (
        <div style={{
          marginTop: 10,
          borderTop: `1px solid ${C.bg3}`,
          paddingTop: 8,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 6,
          }}>
            <span style={{ color: C.accent2, fontSize: 11, fontWeight: 700 }}>
              {fmtDateStr(selected)} · {detailMap[selected].length}건
            </span>
            <button
              onClick={() => setSelected(null)}
              style={{ color: C.fg3, fontSize: 11, background: 'transparent', padding: '0 2px' }}
            >✕</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto' }}>
            {detailMap[selected].map((e, i) => {
              const c = projectColor(e.project)
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                  <div style={{ width: 3, borderRadius: 2, background: c, alignSelf: 'stretch', flexShrink: 0 }} />
                  {e.project && (
                    <span style={{
                      background: `${c}1a`, color: c, fontSize: 10, fontWeight: 600,
                      padding: '1px 5px', borderRadius: 3, border: `1px solid ${c}33`,
                      flexShrink: 0, whiteSpace: 'nowrap',
                    }}>{e.project}</span>
                  )}
                  <span style={{ color: C.fg2, fontSize: 11, lineHeight: 1.4, wordBreak: 'break-word' }}>
                    {e.text}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed',
          left: tooltip.x, top: tooltip.y,
          transform: 'translateX(-50%) translateY(calc(-100% - 6px))',
          pointerEvents: 'none',
          background: '#11111b',
          border: `1px solid ${C.bg3}`,
          borderRadius: 6,
          padding: '4px 10px',
          fontSize: 11, color: C.fg,
          zIndex: 9999,
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 14px rgba(0,0,0,0.55)',
        }}>
          <span style={{ color: C.fg3 }}>{tooltip.iso}</span>
          <span style={{ color: tooltip.count ? C.accent : C.fg3, fontWeight: 600, marginLeft: 7 }}>
            {tooltip.count ? `${tooltip.count}건` : '기록 없음'}
          </span>
        </div>
      )}
    </div>
  )
}
