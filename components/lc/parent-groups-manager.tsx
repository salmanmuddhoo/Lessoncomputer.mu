'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Users, Link2, Send, ChevronDown, ChevronRight, Loader2, MessageSquare, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'

interface Member {
  id: string
  studentId: string
  studentName: string | null
  parentPhone: string | null
  inviteSentAt: string | null
}
interface Cohort {
  id: string
  gradeId: string
  academicYear: number
  name: string | null
  whatsappGroupUrl: string | null
  members: Member[]
}
interface Props {
  grades: { id: string; name: string }[]
  cohorts: Cohort[]
  currentYear: number
}

export function ParentGroupsManager({ grades, cohorts, currentYear }: Props) {
  const router = useRouter()
  const [viewYear, setViewYear] = useState<number>(currentYear)
  const [yearInput, setYearInput] = useState<string>(String(currentYear))
  const [savingYear, setSavingYear] = useState(false)

  const years = useMemo(() => {
    const set = new Set<number>([currentYear, currentYear + 1])
    for (const c of cohorts) set.add(c.academicYear)
    return Array.from(set).sort((a, b) => b - a)
  }, [cohorts, currentYear])

  const cohortByGrade = useMemo(() => {
    const map = new Map<string, Cohort>()
    for (const c of cohorts) if (c.academicYear === viewYear) map.set(c.gradeId, c)
    return map
  }, [cohorts, viewYear])

  async function saveCurrentYear() {
    const y = Number(yearInput)
    if (!Number.isInteger(y) || y < 2000 || y > 2100) return toast.error('Enter a valid year.')
    setSavingYear(true)
    const res = await fetch('/api/admin/parent-groups/set-year', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ year: y }),
    })
    setSavingYear(false)
    if (res.ok) { toast.success('Current academic year updated.'); router.refresh() }
    else toast.error((await res.json().catch(() => ({}))).error ?? 'Could not save.')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="w-6 h-6" /> Parent Groups</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
          One WhatsApp cohort per grade, per academic year. Parents are added automatically when a
          student provides their number to join live classes. Reports are sent <strong>privately</strong> to
          one parent; a broadcast sends the same message privately to every parent in the cohort.
          WhatsApp does not allow apps to add members to a group, so parents receive an invite link to
          self-join the real group.
        </p>
      </div>

      {/* Current academic year (which cohort new enrolments join) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><CalendarDays className="w-4 h-4" /> Current academic year</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="cur-year" className="text-xs">New enrolments join this year's cohort</Label>
            <Input id="cur-year" type="number" className="w-32" value={yearInput}
              onChange={(e) => setYearInput(e.target.value)} />
          </div>
          <Button onClick={saveCurrentYear} disabled={savingYear}>
            {savingYear && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save
          </Button>
          <span className="text-xs text-muted-foreground ml-auto">Currently: <strong>{currentYear}</strong></span>
        </CardContent>
      </Card>

      {/* View-year selector */}
      <div className="flex items-center gap-3">
        <Label className="text-sm">Viewing cohorts for year</Label>
        <Select value={String(viewYear)} onValueChange={(v) => setViewYear(Number(v))}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {grades.map((g) => (
          <GradeCohortCard
            key={g.id}
            grade={g}
            year={viewYear}
            cohort={cohortByGrade.get(g.id) ?? null}
            onChanged={() => router.refresh()}
          />
        ))}
        {grades.length === 0 && <p className="text-sm text-muted-foreground">No active grades configured.</p>}
      </div>
    </div>
  )
}

function GradeCohortCard({
  grade, year, cohort, onChanged,
}: {
  grade: { id: string; name: string }
  year: number
  cohort: Cohort | null
  onChanged: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [inviteUrl, setInviteUrl] = useState(cohort?.whatsappGroupUrl ?? '')
  const [savingUrl, setSavingUrl] = useState(false)
  const [creating, setCreating] = useState(false)
  const [broadcastOpen, setBroadcastOpen] = useState(false)
  const [reportFor, setReportFor] = useState<Member | null>(null)

  const memberCount = cohort?.members.length ?? 0
  const withPhone = cohort?.members.filter((m) => (m.parentPhone ?? '').length >= 7).length ?? 0

  async function upsert(body: Record<string, unknown>) {
    return fetch('/api/admin/parent-groups/upsert', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gradeId: grade.id, academicYear: year, ...body }),
    })
  }

  async function createCohort() {
    setCreating(true)
    const res = await upsert({})
    setCreating(false)
    if (res.ok) { toast.success('Cohort created.'); onChanged() }
    else toast.error((await res.json().catch(() => ({}))).error ?? 'Could not create.')
  }

  async function saveInvite() {
    setSavingUrl(true)
    const res = await upsert({ whatsappGroupUrl: inviteUrl })
    setSavingUrl(false)
    if (res.ok) { toast.success('Invite link saved.'); onChanged() }
    else toast.error((await res.json().catch(() => ({}))).error ?? 'Could not save.')
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">{grade.name} <span className="text-muted-foreground font-normal">— {year}</span></CardTitle>
          {cohort ? (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> {memberCount} parent{memberCount === 1 ? '' : 's'}
              {memberCount > 0 && ` (${withPhone} with number)`}
            </span>
          ) : (
            <Button size="sm" variant="outline" onClick={createCohort} disabled={creating}>
              {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Create cohort
            </Button>
          )}
        </div>
      </CardHeader>

      {cohort && (
        <CardContent className="space-y-4">
          {/* Invite link */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1"><Link2 className="w-3.5 h-3.5" /> WhatsApp group invite link</Label>
            <div className="flex gap-2">
              <Input placeholder="https://chat.whatsapp.com/…" value={inviteUrl} onChange={(e) => setInviteUrl(e.target.value)} />
              <Button variant="outline" onClick={saveInvite} disabled={savingUrl}>
                {savingUrl && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">Auto-sent to each new parent so they can self-join the group.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setBroadcastOpen(true)} disabled={withPhone === 0}>
              <MessageSquare className="w-4 h-4 mr-2" /> Broadcast to all parents
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setExpanded((e) => !e)}>
              {expanded ? <ChevronDown className="w-4 h-4 mr-1" /> : <ChevronRight className="w-4 h-4 mr-1" />}
              {expanded ? 'Hide' : 'Show'} parents
            </Button>
          </div>

          {expanded && (
            <div className="border rounded-lg divide-y">
              {cohort.members.length === 0 && <p className="text-sm text-muted-foreground p-3">No parents in this cohort yet.</p>}
              {cohort.members.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{m.studentName ?? 'Student'}</p>
                    <p className="text-xs text-muted-foreground">{m.parentPhone ?? 'No number'}</p>
                  </div>
                  <Button size="sm" variant="outline" disabled={!m.parentPhone} onClick={() => setReportFor(m)}>
                    <Send className="w-3.5 h-3.5 mr-1.5" /> Send report
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}

      {cohort && broadcastOpen && (
        <BroadcastDialog cohort={cohort} gradeName={grade.name} onClose={() => setBroadcastOpen(false)} />
      )}
      {reportFor && (
        <ReportDialog member={reportFor} onClose={() => setReportFor(null)} />
      )}
    </Card>
  )
}

function BroadcastDialog({ cohort, gradeName, onClose }: { cohort: Cohort; gradeName: string; onClose: () => void }) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const count = cohort.members.filter((m) => (m.parentPhone ?? '').length >= 7).length

  async function send() {
    if (!message.trim()) return toast.error('Message cannot be empty.')
    setSending(true)
    const res = await fetch('/api/admin/parent-groups/broadcast', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cohortId: cohort.id, message }),
    })
    setSending(false)
    const data = await res.json().catch(() => ({}))
    if (res.ok) { toast.success(`Sent to ${data.sent}/${data.total} parents${data.failed ? ` (${data.failed} failed)` : ''}.`); onClose() }
    else toast.error(data.error ?? 'Could not send.')
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Broadcast to {gradeName} parents</DialogTitle>
          <DialogDescription>Sends privately (1-to-1) to {count} parent{count === 1 ? '' : 's'} with a number in this cohort.</DialogDescription>
        </DialogHeader>
        <Textarea rows={6} placeholder="Type your message to all parents…" value={message} onChange={(e) => setMessage(e.target.value)} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={send} disabled={sending}>
            {sending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Send to {count}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ReportDialog({ member, onClose }: { member: Member; onClose: () => void }) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  async function send() {
    if (!message.trim()) return toast.error('Report cannot be empty.')
    setSending(true)
    const res = await fetch('/api/admin/parent-groups/send-report', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: member.studentId, message }),
    })
    setSending(false)
    const data = await res.json().catch(() => ({}))
    if (res.ok) { toast.success('Report sent to parent.'); onClose() }
    else toast.error(data.error ?? 'Could not send.')
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send report — {member.studentName ?? 'Student'}</DialogTitle>
          <DialogDescription>Sent privately to {member.parentPhone}. Not visible to other parents.</DialogDescription>
        </DialogHeader>
        <Textarea rows={6} placeholder="Type the report for this student's parent…" value={message} onChange={(e) => setMessage(e.target.value)} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={send} disabled={sending}>
            {sending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Send report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
