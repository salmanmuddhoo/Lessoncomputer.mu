'use client'

import { useState, useEffect } from 'react'
import { Loader2, Users, Trash2, UserX, UserCheck, Search, Package, RefreshCw, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
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
  month: number
  year: number
  price: number
  grade_id: string
}

interface StudentSub {
  id: string
  package_id: string
  is_recurring: boolean
  purchased_at: string
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [grades, setGrades] = useState<Grade[]>([])
  const [gradeFilter, setGradeFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  // Subscription dialog state
  const [subStudent, setSubStudent] = useState<Student | null>(null)
  const [subPackages, setSubPackages] = useState<SubscriptionPackage[]>([])
  const [studentSubs, setStudentSubs] = useState<StudentSub[]>([])
  const [subLoading, setSubLoading] = useState(false)
  const [addingPkg, setAddingPkg] = useState('')
  const [addRecurring, setAddRecurring] = useState(false)

  async function load() {
    const supabase = createClient()
    const [{ data: studentData }, { data: gradeData }] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, is_active, created_at, grade:grades(id, name, color)')
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
    const supabase = createClient()
    const newValue = !student.is_active
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: newValue })
      .eq('id', student.id)
    if (error) { toast.error(error.message); return }
    toast.success(newValue ? 'Student activated' : 'Student deactivated')
    load()
  }

  async function deleteStudent(id: string, name: string | null) {
    if (!confirm(`Permanently delete ${name ?? 'this student'}? This cannot be undone.`)) return
    const supabase = createClient()
    const { error } = await supabase.from('profiles').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success('Student deleted')
    load()
  }

  async function openSubDialog(student: Student) {
    setSubStudent(student)
    setSubLoading(true)
    const supabase = createClient()
    const [{ data: pkgData }, { data: subData }] = await Promise.all([
      supabase
        .from('subscription_packages')
        .select('id, name, month, year, price, grade_id')
        .eq('is_active', true)
        .order('year', { ascending: false })
        .order('month', { ascending: false }),
      supabase
        .from('student_subscriptions')
        .select('id, package_id, is_recurring, purchased_at')
        .eq('student_id', student.id)
        .eq('status', 'active'),
    ])
    // Only show packages matching student's grade (or all if no grade)
    const gradeId = student.grade?.id
    setSubPackages((pkgData ?? []).filter((p) => !gradeId || p.grade_id === gradeId) as SubscriptionPackage[])
    setStudentSubs((subData ?? []) as StudentSub[])
    setSubLoading(false)
  }

  async function addSubscription() {
    if (!subStudent || !addingPkg) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('student_subscriptions').upsert({
      student_id: subStudent.id,
      package_id: addingPkg,
      is_recurring: addRecurring,
      status: 'active',
      created_by: user?.id,
    }, { onConflict: 'student_id,package_id' })
    if (error) { toast.error(error.message); return }
    toast.success('Subscription granted')
    setAddingPkg('')
    openSubDialog(subStudent)
  }

  async function cancelSubscription(subId: string) {
    const supabase = createClient()
    const { error } = await supabase
      .from('student_subscriptions')
      .update({ status: 'cancelled' })
      .eq('id', subId)
    if (error) { toast.error(error.message); return }
    toast.success('Subscription cancelled')
    if (subStudent) openSubDialog(subStudent)
  }

  const filtered = students
    .filter((s) => gradeFilter === 'all' || s.grade?.id === gradeFilter)
    .filter((s) => !search || (s.full_name ?? '').toLowerCase().includes(search.toLowerCase()))

  // Count per grade
  const countByGrade: Record<string, number> = {}
  for (const s of students) {
    const key = s.grade?.id ?? 'none'
    countByGrade[key] = (countByGrade[key] ?? 0) + 1
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Students</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{students.length} registered students</p>
        </div>
      </div>

      {/* Grade summary chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setGradeFilter('all')}
          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${gradeFilter === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/40'}`}
        >
          All ({students.length})
        </button>
        {grades.map((g) => (
          <button
            key={g.id}
            onClick={() => setGradeFilter(g.id)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${gradeFilter === g.id ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/40'}`}
          >
            {g.name} ({countByGrade[g.id] ?? 0})
          </button>
        ))}
        <button
          onClick={() => setGradeFilter('none')}
          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${gradeFilter === 'none' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/40'}`}
        >
          No grade ({countByGrade['none'] ?? 0})
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
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
                          <Badge
                            variant="outline"
                            className="text-xs"
                            style={{ borderColor: `${s.grade.color}40`, color: s.grade.color }}
                          >
                            {s.grade.name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openSubDialog(s)}
                            title="Manage subscriptions"
                          >
                            <Package className="w-3.5 h-3.5 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleActive(s)}
                            title={s.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {s.is_active
                              ? <UserX className="w-3.5 h-3.5 text-muted-foreground" />
                              : <UserCheck className="w-3.5 h-3.5 text-primary" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => deleteStudent(s.id, s.full_name)}
                          >
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

      {/* Subscription management dialog */}
      <Dialog open={!!subStudent} onOpenChange={(open) => { if (!open) setSubStudent(null) }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Subscriptions — {subStudent?.full_name ?? 'Student'}
            </DialogTitle>
          </DialogHeader>

          {subLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-5 py-2">
              {/* Current subscriptions */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Active Subscriptions
                </p>
                {studentSubs.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No active subscriptions.</p>
                ) : (
                  <div className="space-y-2">
                    {studentSubs.map((sub) => {
                      const pkg = subPackages.find((p) => p.id === sub.package_id)
                      return (
                        <div key={sub.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-border/60 bg-muted/20">
                          <div>
                            <p className="text-sm font-medium">{pkg?.name ?? sub.package_id}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {pkg && (
                                <span className="text-xs text-muted-foreground">
                                  {MONTHS[pkg.month - 1]} {pkg.year}
                                </span>
                              )}
                              {sub.is_recurring && (
                                <span className="flex items-center gap-0.5 text-xs text-primary">
                                  <RefreshCw className="w-2.5 h-2.5" /> Recurring
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10 shrink-0"
                            onClick={() => cancelSubscription(sub.id)}
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Add new subscription */}
              <div className="border-t border-border/40 pt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Grant Access to Package
                </p>
                <div className="space-y-3">
                  <Select value={addingPkg} onValueChange={setAddingPkg}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a package…" />
                    </SelectTrigger>
                    <SelectContent>
                      {subPackages
                        .filter((p) => !studentSubs.some((s) => s.package_id === p.id))
                        .map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} — {MONTHS[p.month - 1]} {p.year} (Rs {p.price})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">Recurring</Label>
                      <p className="text-xs text-muted-foreground">Student pays monthly</p>
                    </div>
                    <Switch checked={addRecurring} onCheckedChange={setAddRecurring} />
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSubStudent(null)}>Close</Button>
            <Button
              onClick={addSubscription}
              disabled={!addingPkg}
              className="bg-primary text-primary-foreground hover:bg-accent"
            >
              Grant Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
