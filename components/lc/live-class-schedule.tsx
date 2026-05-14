'use client'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface Props {
  scheduledAt: string
  isRecurring: boolean
  recurrenceDayOfWeek: number | null
  endTime: string | null
}

export function LiveClassSchedule({ scheduledAt, isRecurring, recurrenceDayOfWeek, endTime }: Props) {
  const d = new Date(scheduledAt)
  const startTime = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

  if (isRecurring && recurrenceDayOfWeek != null) {
    let text = `Every ${DAYS[recurrenceDayOfWeek]} from ${startTime}`
    if (endTime) {
      const [h, m] = endTime.split(':').map(Number)
      const ed = new Date(); ed.setHours(h, m, 0)
      text += ` to ${ed.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
    }
    return <>{text}</>
  }

  const date = d.toLocaleDateString([], { dateStyle: 'medium' })
  let text = `${date} · ${startTime}`
  if (endTime) {
    const [h, m] = endTime.split(':').map(Number)
    const ed = new Date(); ed.setHours(h, m, 0)
    text += ` – ${ed.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
  }
  return <>{text}</>
}
