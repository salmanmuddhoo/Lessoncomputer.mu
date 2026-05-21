'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  liveClassId: string
  gradeId: string
  alreadyMarked: boolean
  userId: string
}

export function AttendanceMarkButton({ liveClassId, gradeId, alreadyMarked, userId }: Props) {
  const [marked, setMarked] = useState(alreadyMarked)
  const [loading, setLoading] = useState(false)

  async function handleMark() {
    setLoading(true)
    const supabase = createClient()
    const now = new Date().toISOString()
    // Upsert: if the student joined (entry_time exists) only update scheduled_end_time;
    // if they somehow skipped joining, create the full row so they still get credit.
    const { error } = await (supabase as any)
      .from('live_attendance')
      .upsert(
        {
          live_class_id: liveClassId,
          student_id: userId,
          grade_id: gradeId,
          entry_time: now,
          scheduled_end_time: now,
        },
        { onConflict: 'live_class_id,student_id' }
      )
    if (error) {
      toast.error('Could not mark attendance. Please try again.')
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

  return (
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
  )
}
