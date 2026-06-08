export const DEFAULT_DATA = { projects: [], weeks: {}, due_dates: [], milestones: [], user_name: '서장원' }

// Migrate old per-week due_dates/milestones to global arrays and remove per-week copies
export function migrateData(data) {
  if (!data) return data
  let dd = data.due_dates || []
  let ms = data.milestones || []
  const seen_dd = new Set(dd.map(x => `${x.project}|${x.task}|${x.date}`))
  const seen_ms = new Set(ms.map(x => `${x.project}|${x.detail}|${x.target}`))
  let hasLegacy = false
  for (const wkData of Object.values(data.weeks || {})) {
    if ((wkData.due_dates || []).length > 0 || (wkData.milestones || []).length > 0) hasLegacy = true
    for (const x of (wkData.due_dates || [])) {
      const key = `${x.project}|${x.task}|${x.date}`
      if (!seen_dd.has(key)) { dd = [...dd, x]; seen_dd.add(key) }
    }
    for (const x of (wkData.milestones || [])) {
      const key = `${x.project}|${x.detail}|${x.target}`
      if (!seen_ms.has(key)) { ms = [...ms, x]; seen_ms.add(key) }
    }
  }
  // Strip per-week due_dates/milestones so they don't get re-added on subsequent loads
  const weeks = hasLegacy
    ? Object.fromEntries(Object.entries(data.weeks || {}).map(([k, w]) => {
        const { due_dates: _dd, milestones: _ms, ...rest } = w
        return [k, rest]
      }))
    : data.weeks
  return { ...data, due_dates: dd, milestones: ms, weeks }
}

const emptyWeek = () => ({ entries: {}, blockers: [] })

const wk = (data, key) => data.weeks[key] || emptyWeek()

export const getEntries    = (data, key, ds) => wk(data, key).entries[ds] || []
export const getDueDates   = (data)           => data.due_dates || []
export const getMilestones = (data)           => data.milestones || []
export const getBlockers   = (data, key)      => wk(data, key).blockers || []
export const getFullWeek   = (data, key)      => ({ ...wk(data, key), due_dates: data.due_dates || [], milestones: data.milestones || [] })

function updateWeek(data, key, fn) {
  return { ...data, weeks: { ...data.weeks, [key]: fn(wk(data, key)) } }
}

export const setEntries    = (data, key, ds, v) => updateWeek(data, key, w => ({ ...w, entries: { ...w.entries, [ds]: v } }))
export const setDueDates   = (data, v)           => ({ ...data, due_dates: v })
export const setMilestones = (data, v)           => ({ ...data, milestones: v })
export const setBlockers   = (data, key, v)      => updateWeek(data, key, w => ({ ...w, blockers: v }))
