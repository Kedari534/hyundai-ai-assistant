export function groupSessions(sessions, now = new Date()) {
  const startToday = new Date(now)
  startToday.setHours(0, 0, 0, 0)
  const startYesterday = new Date(startToday)
  startYesterday.setDate(startYesterday.getDate() - 1)
  const groups = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Earlier', items: [] },
  ]
  for (const session of sessions) {
    const when = new Date(session.updatedAt)
    if (when >= startToday) groups[0].items.push(session)
    else if (when >= startYesterday) groups[1].items.push(session)
    else groups[2].items.push(session)
  }
  return groups.filter((group) => group.items.length)
}

export function relativeTime(value, now = new Date()) {
  const date = new Date(value)
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000)
  if (seconds < 60) return 'Just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function exactTime(value) {
  return new Date(value).toLocaleString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function passwordScore(password) {
  let score = 0
  if (password.length >= 8) score += 1
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password) || password.length >= 12) score += 1
  return score
}

export function modelLabel(code) {
  const labels = {
    ALCAZAR: 'Alcazar',
    CRETA: 'Creta',
    I20: 'i20',
    AURA: 'Aura',
    VENUE: 'Venue',
    VERNA: 'Verna',
    EXTER: 'Exter',
    TUCSON: 'Tucson',
    GRAND_I10_NIOS: 'Grand i10 Nios',
  }
  return labels[code] || code
}
