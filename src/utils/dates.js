export const DAY_NAMES = ['토', '일', '월', '화', '수', '목', '금']

/** YYYY-MM-DD 문자열 → Date (로컬 기준). 파싱 불가 시 null */
export function parseDate(str) {
  if (!str) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str)
  if (!m) return null
  return new Date(+m[1], +m[2] - 1, +m[3])
}

/** dateStr로부터 D-day 숫자 반환. 오늘 = 0, 과거 = 음수, 파싱 불가 = null */
export function dday(dateStr) {
  const d = parseDate(dateStr)
  if (!d) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return Math.round((d - today) / 86400000)
}

/** D-day 숫자 → { label, color, bg } 배지 스펙. null 반환 시 배지 없음 */
export function ddayBadge(n) {
  if (n === null) return null
  if (n > 14)  return { label: `D-${n}`,   color: '#a6e3a1', bg: 'rgba(166,227,161,0.15)' }
  if (n >= 8)  return { label: `D-${n}`,   color: '#f9e2af', bg: 'rgba(249,226,175,0.18)' }
  if (n >= 1)  return { label: `D-${n}`,   color: '#fab387', bg: 'rgba(250,179,135,0.18)' }
  if (n === 0) return { label: 'D-day',    color: '#f38ba8', bg: 'rgba(243,139,168,0.22)' }
  return         { label: `D+${-n} 지남`, color: '#6c7086', bg: 'rgba(108,112,134,0.15)' }
}

/** ISO 날짜 문자열을 "M/D" 형태로 포맷. 파싱 불가 시 원본 반환 */
export function fmtDateStr(str) {
  const d = parseDate(str)
  return d ? fmt(d) : (str ?? '')
}

export function weekSaturday(d) {
  const day = d.getDay()
  const isoday = day === 0 ? 7 : day
  const offset = ((isoday - 6) % 7 + 7) % 7
  const sat = new Date(d)
  sat.setDate(d.getDate() - offset)
  sat.setHours(0, 0, 0, 0)
  return sat
}

export function weekDates(d) {
  const sat = weekSaturday(d)
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(sat)
    dd.setDate(sat.getDate() + i)
    return dd
  })
}

function isoWeekNum(d) {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7))
  const week1 = new Date(date.getFullYear(), 0, 4)
  return [
    date.getFullYear(),
    1 + Math.round(((date - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7),
  ]
}

export function weekKey(saturday) {
  const mon = new Date(saturday)
  mon.setDate(saturday.getDate() + 2)
  const [year, week] = isoWeekNum(mon)
  return `${year}-W${String(week).padStart(2, '0')}`
}

export function weekFriday(saturday) {
  const fri = new Date(saturday)
  fri.setDate(saturday.getDate() + 6)
  return fri
}

export function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export function fmt(d) {
  return `${d.getMonth()+1}/${d.getDate()}`
}

export function addWeeks(d, n) {
  const r = new Date(d)
  r.setDate(d.getDate() + n * 7)
  return r
}

export function isToday(d) {
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}
