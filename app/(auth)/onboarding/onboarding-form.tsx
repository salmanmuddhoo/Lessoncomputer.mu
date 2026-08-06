'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export function OnboardingForm({ grades, initialName }: { grades: { id: string; name: string }[]; initialName: string }) {
  const router = useRouter()
  const [fullName, setFullName] = useState(initialName)
  const [gradeId, setGradeId] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (saving) return
    if (!gradeId) { toast.error('Please select your grade'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gradeId, fullName: fullName.trim() || undefined }),
      })
      const data = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) { toast.error(data.error ?? 'Could not save. Please try again.'); return }
      router.push('/dashboard')
      router.refresh()
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="ob-name">Full name</Label>
        <Input id="ob-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
      </div>
      <div className="space-y-2">
        <Label>Your grade</Label>
        <Select onValueChange={setGradeId}>
          <SelectTrigger><SelectValue placeholder="Select your grade" /></SelectTrigger>
          <SelectContent>
            {grades.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Button
        onClick={save}
        disabled={saving}
        className="w-full bg-primary text-primary-foreground hover:bg-accent font-semibold"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        Continue to dashboard
      </Button>
    </div>
  )
}
