'use client'

import { useState, useEffect } from 'react'
import { ExternalLink, Loader2, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ParentContactDialog } from '@/components/lc/parent-contact-dialog'

interface Props {
  liveClassId: string
  meetUrl: string
  gradeId: string
  scheduledAt: string
  endTime: string | null
  isRecurring: boolean
  recurrenceDayOfWeek: number | null
  hasParentPhone?: boolean
}

function getClassStartDate(scheduledAt: string, isRecurring: boolean, recurrenceDayOfWeek: number | null): Date {
  const scheduled = new Date(scheduledAt)

  if (!isRecurring || recurrenceDayOfWeek === null) return scheduled

  // For recurring classes, find this week's occurrence
  const now = new Date()
  const occurrence = new Date(now)
  occurrence.setHours(scheduled.getHours(), scheduled.getMinutes(), 0, 0)

  const daysUntil = (recurrenceDayOfWeek - now.getDay() + 7) % 7
  occurrence.setDate(occurrence.getDate() + daysUntil)
  return occurrence
}

function computeScheduledEndTime(scheduledAt: string, endTime: string | null, isRecurring: boolean, recurrenceDayOfWeek: number | null): string | null {
  if (!endTime) return null
  const [h, m] = endTime.split(':').map(Number)
  const base = getClassStartDate(scheduledAt, isRecurring, recurrenceDayOfWeek)
  const end = new Date(base)
  end.setHours(h, m, 0, 0)
  return end.toISOString()
}

function computeState(scheduledAt: string, isRecurring: boolean, recurrenceDayOfWeek: number | null): { enabled: boolean; minutesLeft: number | null } {
  const now = new Date()
  const start = getClassStartDate(scheduledAt, isRecurring, recurrenceDayOfWeek)
  const enableAt = start.getTime() - 30 * 60 * 1000

  if (now.getTime() >= enableAt) return { enabled: true, minutesLeft: null }

  const minutesLeft = Math.ceil((enableAt - now.getTime()) / 60_000)
  return { enabled: false, minutesLeft }
}

export function JoinLiveClassButton({ liveClassId, meetUrl, gradeId, scheduledAt, endTime, isRecurring, recurrenceDayOfWeek, hasParentPhone = true }: Props) {
  const [state, setState] = useState(() => computeState(scheduledAt, isRecurring, recurrenceDayOfWeek))
  const [loading, setLoading] = useState(false)
  const [showParentDialog, setShowParentDialog] = useState(false)
  const [parentPhoneProvided, setParentPhoneProvided] = useState(hasParentPhone)
  const supabase = createClient()

  useEffect(() => {
    if (state.enabled) return
    const interval = setInterval(() => {
      const next = computeState(scheduledAt, isRecurring, recurrenceDayOfWeek)
      setState(next)
      if (next.enabled) clearInterval(interval)
    }, 30_000)
    return () => clearInterval(interval)
  }, [state.enabled, scheduledAt, isRecurring, recurrenceDayOfWeek])

  async function handleJoin() {
    if (!parentPhoneProvided) {
      setShowParentDialog(true)
      return
    }
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { error } = await (supabase as any)
          .from('live_attendance')
          .upsert(
            {
              live_class_id: liveClassId,
              student_id: user.id,
              grade_id: gradeId,
              entry_time: new Date().toISOString(),
            },
            { onConflict: 'live_class_id,student_id', ignoreDuplicates: true }
          )
        if (error) {
          toast.warning(`Attendance not recorded: ${error.message}`)
        }
      }
    } catch (err: any) {
      toast.warning(`Attendance not recorded: ${err?.message ?? 'unknown error'}`)
    } finally {
      setLoading(false)
      window.open(meetUrl, '_blank', 'noopener,noreferrer')
    }
  }

  if (!state.enabled) {
    const label = state.minutesLeft !== null && state.minutesLeft <= 60
      ? `Opens in ${state.minutesLeft} min`
      : 'Opens 30 min before'
    return (
      <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-muted text-muted-foreground text-sm font-semibold shrink-0 cursor-not-allowed select-none">
        <Clock className="w-4 h-4 shrink-0" />
        {label}
      </div>
    )
  }

  return (
    <>
      <button
        onClick={handleJoin}
        disabled={loading}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-accent text-sm font-semibold transition-colors shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
        Join Live Class
      </button>

      <ParentContactDialog
        open={showParentDialog}
        onClose={() => setShowParentDialog(false)}
        onSuccess={() => {
          setParentPhoneProvided(true)
          setShowParentDialog(false)
          handleJoin()
        }}
      />
    </>
  )
}
