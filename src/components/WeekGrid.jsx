import { toISO } from '../utils/dates'
import { getDueDates, getMilestones } from '../utils/data'
import { projectColor } from '../utils/colors'
import DayColumn from './DayColumn'

function buildDotMap(data, dates) {
  const map = {}
  const validDates = new Set(dates.map(d => toISO(d)))

  for (const dd of getDueDates(data)) {
    if (dd.date && validDates.has(dd.date)) {
      if (!map[dd.date]) map[dd.date] = []
      map[dd.date].push({ color: projectColor(dd.project), type: 'dd' })
    }
  }
  for (const ms of getMilestones(data)) {
    if (ms.target && validDates.has(ms.target)) {
      if (!map[ms.target]) map[ms.target] = []
      map[ms.target].push({ color: projectColor(ms.project), type: 'ms' })
    }
  }
  return map
}

export default function WeekGrid({ dates, data, wk, onAdd, onEdit, onDelete }) {
  const dotMap = buildDotMap(data, dates)

  return (
    <div style={{
      flex: 1, display: 'flex', gap: 5,
      overflow: 'hidden', paddingTop: 10,
    }}>
      {dates.map((date, i) => (
        <DayColumn
          key={i}
          date={date}
          dayIdx={i}
          data={data}
          wk={wk}
          dots={dotMap[toISO(date)] || []}
          onAdd={onAdd}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
