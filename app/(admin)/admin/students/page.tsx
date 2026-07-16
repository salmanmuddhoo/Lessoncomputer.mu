'use client'

import { useState, useEffect } from 'react'
import {
  Loader2, Users, Trash2, UserX, UserCheck, Search, Package,
  RefreshCw, X, Radio, Phone, User, CreditCard, ClipboardList,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

interface Student {
  id: string
  full_name: string | null
  is_active: boolean
  created_at: string
  parent_phone: string | null
  grade: { id: string; name: string; color: string } | null
}

interface Grade {
  id: string
  name: string
  color: string
}

interface SubscriptionPackage {
  id: string
  name: string
  month: number | null
  year: number | null
  price: number
  grade_id: string
  package_type: string
}

interface StudentSub {
  id: string
  package_id: string
  is_recurring: boolean
  purchased_at: string
  valid_from: string | null
  valid_until: string | null
}

interface Payment {
  id: string
  amount: number
  currency: string
  description: string | null
  status: string
  order_type: string
  created_at: string
}

interface AttendanceMark {
  id: string
  marked_at: string
  session: { label: string | null; opens_at: string; grade: { name: string } | null } | null
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function statusBadge(status: string) {
  const map: Record<string, string> = {
    paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    cancelled: 'bg-muted text-muted-foreground',
  }
  return `text-xs px-2 py-0.5 rounded-full font-medium ${map[status] ?? 'bg-muted text-muted-foreground'}`
}

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [grades, setGrades] = useState<Grade[]>([])
  const [gradeFilter, setGradeFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  // Dialog state
  const [subStudent, setSubStudent] = useState<Student | null>(null)
  const [dialogTab, setDialogTab] = useState('details')
  const [subPackages, setSubPackages] = useState<SubscriptionPackage[]>([])
  const [studentSubs, setStudentSubs] = useState<StudentSub[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [attendance, setAttendance] = useState<AttendanceMark[]>([])
  const [subLoading, setSubLoading] = useState(false)

  // Edit state
  const [editParentPhone, setEditParentPhone] = useState('')
  const [savingParentPhone, setSavingParentPhone] = useState(false)
  const [addingVideoPkg, setAddingVideoPkg] = useState('')
  const [addingLivePkg, setAddingLivePkg] = useState('')
  const [liveRecurring, setLiveRecurring] = useState(true)

  async function load() {
    const supabase = createClient()
    const [{ data: studentData }, { data: gradeData }] = await Promise.all([
      (supabase as any)
        .from('profiles')
        .select('id, full_name, is_active, created_at, parent_phone, grade:grades(id, name, color)')
        .eq('role', 'student')
        .order('created_at', { ascending: false }),
      supabase.from('grades').select('id, name, color').eq('is_active', true).order('order_index'),
    ])
    setStudents((studentData ?? []) as Student[])
    setGrades(gradeData ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function toggleActive(student: Student) {
    const newValue = !student.is_active
    // Admins have no RLS policy to update another user's profile, so this goes through
    // a service-role admin route instead of a direct client update (which silently no-ops).
    try {
      const res = await fetch('/api/admin/toggle-student-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: student.id, isActive: newValue }),
      })
      const data = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) { toast.error(data.error ?? 'Could not update the student.'); return }
      toast.success(newValue ? 'Student activated' : 'Student deactivated')
      load()
    } catch {
      toast.error('Network error. Please try again.')
    }
  }

  async function deleteStudent(id: string, name: string | null) {
    if (!confirm(`Permanently delete ${name ?? 'this student'}? This cannot be undone.`)) return
    const supabase = createClient()
    const { error } = await supabase.from('profiles').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success('Student deleted')
    load()
  }

  async function saveParentPhone() {
    if (!subStudent) return
    setSavingParentPhone(true)
    const supabase = createClient()
    const { error } = await (supabase as any)
      .from('profiles')
      .update({ parent_phone: editParentPhone.trim() || null })
      .eq('id', subStudent.id)
    if (error) { toast.error(error.message) } else {
      toast.success('Parent phone updated')
      setSubStudent({ ...subStudent, parent_phone: editParentPhone.trim() || null })
      load()
    }
    setSavingParentPhone(false)
  }

  async function openDialog(student: Student) {
    setSubStudent(student)
    setEditParentPhone(student.parent_phone ?? '')
    setDialogTab('details')
    setSubLoading(true)
    setAddingVideoPkg('')
    setAddingLivePkg('')
    const supabase = createClient()

    const [{ data: pkgData }, { data: subData }, { data: payData }, { data: attData }] = await Promise.all([
      supabase
        .from('subscription_packages')
        .select('id, name, month, year, price, grade_id, package_type')
        .eq('is_active', true)
        .order('year', { ascending: false })
        .order('month', { ascending: false }),
      supabase
        .from('student_subscriptions')
        .select('id, package_id, is_recurring, purchased_at, valid_from, valid_until')
        .eq('student_id', student.id)
        .eq('status', 'active'),
      (supabase as any)
        .from('mips_orders')
        .select('id, amount, currency, description, status, order_type, created_at')
        .eq('student_id', student.id)
        .order('created_at', { ascending: false }),
      (supabase as any)
        .from('attendance_marks')
        .select('id, marked_at, session:attendance_sessions(label, opens_at, grade:grades(name))')
        .eq('student_id', student.id)
        .order('marked_at', { ascending: false }),
    ])

    const gradeId = student.grade?.id
    setSubPackages(
      ((pkgData ?? []) as SubscriptionPackage[]).filter((p) => {
        if (gradeId && p.grade_id !== gradeId) return false
        if (p.package_type === 'live_month') return !!(p.month && p.year)
        return true
      })
    )
    setStudentSubs((subData ?? []) as StudentSub[])
    setPayments((payData ?? []) as Payment[])
    setAttendance((attData ?? []) as AttendanceMark[])
    setSubLoading(false)
  }

  async function grantAccess(packageId: string, recurring: boolean) {
    if (!subStudent || !packageId) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('student_subscriptions').upsert({
      student_id: subStudent.id,
      package_id: packageId,
      is_recurring: recurring,
      status: 'active',
      created_by: user?.id,
    }, { onConflict: 'student_id,package_id' })
    if (error) { toast.error(error.message); return }
    toast.success('Subscription granted')
    openDialog(subStudent)
  }

  async function cancelSubscription(subId: string) {
    const supabase = createClient()
    const { error } = await supabase.from('student_subscriptions').update({ status: 'cancelled' }).eq('id', subId)
    if (error) { toast.error(error.message); return }
    toast.success('Subscription cancelled')
    if (subStudent) openDialog(subStudent)
  }

  const filtered = students
    .filter((s) => gradeFilter === 'all' || s.grade?.id === gradeFilter)
    .filter((s) => !search || (s.full_name ?? '').toLowerCase().includes(search.toLowerCase()))

  const countByGrade: Record<string, number> = {}
  for (const s of students) {
    const key = s.grade?.id ?? 'none'
    countByGrade[key] = (countByGrade[key] ?? 0) + 1
  }

  const videoSubs = studentSubs.filter((sub) => {
    const pkg = subPackages.find((p) => p.id === sub.package_id)
    return !pkg || pkg.package_type !== 'live_month'
  })
  const liveSubs = studentSubs.filter((sub) => {
    const pkg = subPackages.find((p) => p.id === sub.package_id)
    return pkg?.package_type === 'live_month'
  })
  const videoPackages = subPackages.filter((p) => p.package_type !== 'live_month')
  const livePackages  = subPackages.filter((p) => p.package_type === 'live_month')
  const subscribedIds = new Set(studentSubs.map((s) => s.package_id))

  function renderSubRow(sub: StudentSub) {
    const pkg = subPackages.find((p) => p.id === sub.package_id)
    const isLive = pkg?.package_type === 'live_month'
    const today = new Date().toISOString().split('T')[0]!
    const isUpcoming = isLive && sub.valid_from != null && sub.valid_from > today
    return (
      <div key={sub.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-border/60 bg-muted/20">
        <div>
          <p className="text-sm font-medium">{pkg?.name ?? sub.package_id}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {pkg && isLive && pkg.month && pkg.year && (
              <span className="text-xs text-muted-foreground">{MONTHS[pkg.month - 1]} {pkg.year}</span>
            )}
            {isUpcoming && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-medium">
                Upcoming — access from {sub.valid_from}
              </span>
            )}
            {sub.is_recurring && (
              <span className="flex items-center gap-0.5 text-xs text-primary">
                <RefreshCw className="w-2.5 h-2.5" /> Recurring
              </span>
            )}
          </div>
        </div>
        <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 shrink-0" onClick={() => cancelSubscription(sub.id)}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Students</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{students.length} registered students</p>
        </div>
      </div>

      {/* Grade filter chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setGradeFilter('all')} className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${gradeFilter === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/40'}`}>
          All ({students.length})
        </button>
        {grades.map((g) => (
          <button key={g.id} onClick={() => setGradeFilter(g.id)} className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${gradeFilter === g.id ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/40'}`}>
            {g.name} ({countByGrade[g.id] ?? 0})
          </button>
        ))}
        <button onClick={() => setGradeFilter('none')} className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${gradeFilter === 'none' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/40'}`}>
          No grade ({countByGrade['none'] ?? 0})
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search by name…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="rounded-xl border border-border/60 overflow-hidden">
          {filtered.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead className="bg-muted/30 border-b border-border/60">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Student</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Grade</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Parent Phone</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Joined</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filtered.map((s) => (
                    <tr key={s.id} className={`hover:bg-muted/20 transition-colors ${!s.is_active ? 'opacity-60' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs shrink-0">
                            {s.full_name ? s.full_name[0].toUpperCase() : '?'}
                          </div>
                          <span className="font-medium truncate max-w-[140px]">{s.full_name ?? 'Unnamed'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {s.grade ? (
                          <Badge variant="outline" className="text-xs" style={{ borderColor: `${s.grade.color}40`, color: s.grade.color }}>
                            {s.grade.name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {s.parent_phone
                          ? <span className="text-sm font-mono">{s.parent_phone}</span>
                          : <span className="text-xs text-muted-foreground italic">Not provided</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                        {new Date(s.created_at).toLocaleDateString('en-MU', { dateStyle: 'medium' })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${s.is_active ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                          {s.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openDialog(s)} title="Manage student">
                            <Package className="w-3.5 h-3.5 text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => toggleActive(s)} title={s.is_active ? 'Deactivate' : 'Activate'}>
                            {s.is_active ? <UserX className="w-3.5 h-3.5 text-muted-foreground" /> : <UserCheck className="w-3.5 h-3.5 text-primary" />}
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => deleteStudent(s.id, s.full_name)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-16 text-center">
              <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">
                {search || gradeFilter !== 'all' ? 'No students match your filter.' : 'No students registered yet.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Student management dialog ── */}
      <Dialog open={!!subStudent} onOpenChange={(open) => { if (!open) setSubStudent(null) }}>
        <DialogContent className="max-w-xl max-h-[88vh] flex flex-col gap-0 p-0">
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-border/60 shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                {subStudent?.full_name?.[0]?.toUpperCase() ?? '?'}
              </div>
              {subStudent?.full_name ?? 'Student'}
            </DialogTitle>
          </DialogHeader>

          {subLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Tabs value={dialogTab} onValueChange={setDialogTab} className="flex flex-col flex-1 min-h-0">
              <TabsList className="mx-6 mt-4 shrink-0 flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
                <TabsTrigger value="details" className="flex items-center gap-1.5 text-xs">
                  <User className="w-3.5 h-3.5" /> Details
                </TabsTrigger>
                <TabsTrigger value="video" className="flex items-center gap-1.5 text-xs">
                  <Package className="w-3.5 h-3.5" /> Video Access
                </TabsTrigger>
                <TabsTrigger value="live" className="flex items-center gap-1.5 text-xs">
                  <Radio className="w-3.5 h-3.5" /> Live Access
                </TabsTrigger>
                <TabsTrigger value="payments" className="flex items-center gap-1.5 text-xs">
                  <CreditCard className="w-3.5 h-3.5" /> Payments
                </TabsTrigger>
                <TabsTrigger value="attendance" className="flex items-center gap-1.5 text-xs">
                  <ClipboardList className="w-3.5 h-3.5" /> Attendance
                </TabsTrigger>
              </TabsList>

              {/* ── Details ── */}
              <TabsContent value="details" className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Full name</p>
                    <p className="font-medium">{subStudent?.full_name ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Grade</p>
                    {subStudent?.grade ? (
                      <Badge variant="outline" className="text-xs" style={{ borderColor: `${subStudent.grade.color}40`, color: subStudent.grade.color }}>
                        {subStudent.grade.name}
                      </Badge>
                    ) : <p className="text-muted-foreground">—</p>}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Member since</p>
                    <p className="font-medium">{subStudent ? new Date(subStudent.created_at).toLocaleDateString('en-MU', { dateStyle: 'medium' }) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Status</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${subStudent?.is_active ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                      {subStudent?.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <div className="border-t border-border/60 pt-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> Parent Contact
                  </p>
                  <div className="flex gap-2">
                    <div className="flex gap-1.5 flex-1">
                      <span className="inline-flex items-center px-3 rounded-lg border border-border/60 bg-muted text-sm text-muted-foreground shrink-0">+230</span>
                      <Input
                        type="tel"
                        inputMode="numeric"
                        placeholder="5XXXXXXX"
                        value={editParentPhone}
                        onChange={(e) => setEditParentPhone(e.target.value)}
                        disabled={savingParentPhone}
                        className="font-mono"
                      />
                    </div>
                    <Button size="sm" onClick={saveParentPhone} disabled={savingParentPhone} className="bg-primary text-primary-foreground hover:bg-accent shrink-0">
                      {savingParentPhone ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* ── Video Access ── */}
              <TabsContent value="video" className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" /> Active Video Subscriptions
                </p>
                {videoSubs.length === 0
                  ? <p className="text-sm text-muted-foreground italic">No active video subscriptions.</p>
                  : <div className="space-y-2">{videoSubs.map(renderSubRow)}</div>
                }
                <div className="border-t border-border/40 pt-4 space-y-2.5">
                  <p className="text-xs text-muted-foreground font-medium">Grant access to a video package</p>
                  <Select value={addingVideoPkg} onValueChange={setAddingVideoPkg}>
                    <SelectTrigger><SelectValue placeholder="Select video package…" /></SelectTrigger>
                    <SelectContent>
                      {videoPackages.filter((p) => !subscribedIds.has(p.id)).length === 0
                        ? <SelectItem value="__none__" disabled>All packages already granted</SelectItem>
                        : videoPackages.filter((p) => !subscribedIds.has(p.id)).map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name} — Rs {p.price}</SelectItem>
                          ))
                      }
                    </SelectContent>
                  </Select>
                  <div className="flex justify-end">
                    <Button size="sm" disabled={!addingVideoPkg || addingVideoPkg === '__none__'} onClick={() => grantAccess(addingVideoPkg, false)} className="bg-primary text-primary-foreground hover:bg-accent">
                      Grant Access
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* ── Live Access ── */}
              <TabsContent value="live" className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5" /> Active Live Subscriptions
                </p>
                {liveSubs.length === 0
                  ? <p className="text-sm text-muted-foreground italic">No active live class subscriptions.</p>
                  : <div className="space-y-2">{liveSubs.map(renderSubRow)}</div>
                }
                <div className="border-t border-border/40 pt-4 space-y-2.5">
                  <p className="text-xs text-muted-foreground font-medium">Grant access to a live classes month</p>
                  <Select value={addingLivePkg} onValueChange={setAddingLivePkg}>
                    <SelectTrigger><SelectValue placeholder="Select live month…" /></SelectTrigger>
                    <SelectContent>
                      {livePackages.filter((p) => !subscribedIds.has(p.id)).length === 0
                        ? <SelectItem value="__none__" disabled>All months already granted</SelectItem>
                        : livePackages.filter((p) => !subscribedIds.has(p.id)).map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}{p.month && p.year ? ` — ${MONTHS[p.month - 1]} ${p.year}` : ''} (Rs {p.price})
                            </SelectItem>
                          ))
                      }
                    </SelectContent>
                  </Select>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Switch id="live-recurring" checked={liveRecurring} onCheckedChange={setLiveRecurring} />
                      <Label htmlFor="live-recurring" className="text-sm cursor-pointer">Recurring</Label>
                    </div>
                    <Button size="sm" disabled={!addingLivePkg || addingLivePkg === '__none__'} onClick={() => grantAccess(addingLivePkg, liveRecurring)} className="bg-primary text-primary-foreground hover:bg-accent">
                      Grant Access
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* ── Payments ── */}
              <TabsContent value="payments" className="flex-1 overflow-y-auto px-6 py-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-3">
                  <CreditCard className="w-3.5 h-3.5" /> Payment History
                </p>
                {payments.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No payments on record.</p>
                ) : (
                  <div className="space-y-2">
                    {payments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/60 bg-muted/10">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{p.description ?? `${p.order_type} payment`}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(p.created_at).toLocaleDateString('en-MU', { dateStyle: 'medium' })}
                            {' · '}{new Date(p.created_at).toLocaleTimeString('en-MU', { timeStyle: 'short' })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={statusBadge(p.status)}>{p.status}</span>
                          <span className="text-sm font-semibold">{p.currency} {p.amount.toFixed(2)}</span>
                          {(p.status === 'pending' || p.status === 'failed') && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 px-2 border-primary/40 text-primary hover:bg-primary/10"
                              onClick={async () => {
                                const res = await fetch('/api/payment/admin-activate', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ orderId: p.id }),
                                })
                                const data = await res.json()
                                if (res.ok) {
                                  toast.success('Subscription activated')
                                  setPayments((prev) => prev.map((x) => x.id === p.id ? { ...x, status: 'paid' } : x))
                                } else {
                                  toast.error(data.error ?? 'Failed to activate')
                                }
                              }}
                            >
                              Activate
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* ── Attendance ── */}
              <TabsContent value="attendance" className="flex-1 overflow-y-auto px-6 py-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-3">
                  <ClipboardList className="w-3.5 h-3.5" /> Attendance Records ({attendance.length})
                </p>
                {attendance.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No attendance records found.</p>
                ) : (
                  <div className="space-y-2">
                    {attendance.map((a) => (
                      <div key={a.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/60 bg-muted/10">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {a.session?.label ?? 'Class session'}
                            {a.session?.grade?.name && (
                              <span className="text-muted-foreground font-normal"> · {a.session.grade.name}</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Marked: {new Date(a.marked_at).toLocaleDateString('en-MU', { dateStyle: 'medium' })}
                            {' · '}{new Date(a.marked_at).toLocaleTimeString('en-MU', { timeStyle: 'short' })}
                          </p>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-medium shrink-0">
                          Present
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter className="px-6 py-4 border-t border-border/60 shrink-0">
            <Button variant="outline" onClick={() => setSubStudent(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
