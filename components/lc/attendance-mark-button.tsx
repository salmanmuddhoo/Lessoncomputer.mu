'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Loader2, Clock } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  sessionId: string
  closesAt: string
  alreadyMarked: boolean
  userId: string
}

export function AttendanceMarkButton({ sessionId, closesAt, alreadyMarked, userId }: Props) {
  const [marked, setMarked] = useState(alreadyMarked)
  const [loading, setLoading] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.floor((new Date(closesAt).getTime() - Date.now()) / 1000))
  )

  useEffect(() => {
    if (secondsLeft <= 0) return
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { clearInterval(interval); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  async function handleMark() {
    setLoading(true)
    const supabase = createClient()
    const { error } = await (supabase as any)
      .from('attendance_marks')
      .insert({ session_id: sessionId, student_id: userId, marked_at: new Date().toISOString() })
    if (error) {
      toast.error('Could not mark attendance. The window may have closed.')
    } else {
      setMarked(true)
      toast.success('Attendance marked — you are present!')
    }
    setLoading(false)
  }

  if (marked) {
    return (
      <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-semibold text-base">
        <CheckCircle2 className="w-6 h-6" />
        You are marked present!
      </div>
    )
  }

  if (secondsLeft <= 0) {
    return <p className="text-sm text-muted-foreground">The attendance window has closed.</p>
  }

  const min = Math.floor(secondsLeft / 60)
  const sec = secondsLeft % 60

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="w-4 h-4" />
        Closes in{' '}
        <span className="font-mono font-bold text-foreground tabular-nums">
          {min}:{sec.toString().padStart(2, '0')}
        </span>
      </div>
      <Button
        size="lg"
        onClick={handleMark}
        disabled={loading}
        className="bg-green-600 hover:bg-green-700 text-white font-semibold px-10"
      >
        {loading
          ? <Loader2 className="w-5 h-5 animate-spin mr-2" />
          : <CheckCircle2 className="w-5 h-5 mr-2" />}
        Mark Present
      </Button>
    </div>
  )
}
