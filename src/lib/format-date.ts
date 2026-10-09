// Dates are stored as ISO strings (YYYY-MM-DD) and shown in Nigerian English, e.g. "9 October 2026".
// UTC avoids the date shifting by a day depending on the server's time zone.
const longDate = new Intl.DateTimeFormat('en-NG', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const dayOfMonth = new Intl.DateTimeFormat('en-NG', { day: 'numeric', timeZone: 'UTC' })
const shortMonth = new Intl.DateTimeFormat('en-NG', { month: 'short', timeZone: 'UTC' })

export const formatDate = (iso: string): string => longDate.format(new Date(iso))

export const dateParts = (iso: string) => {
  const date = new Date(iso)
  return { day: dayOfMonth.format(date), month: shortMonth.format(date) }
}

export const byNewestFirst = <T extends { date: string }>(items: T[]): T[] =>
  [...items].sort((a, b) => b.date.localeCompare(a.date))
