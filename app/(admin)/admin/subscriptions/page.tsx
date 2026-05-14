'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Loader2, Plus, Trash2, Package, ChevronDown, ChevronUp, Pencil,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1]

interface Grade {
  id: string
  name: string
  color: string
}

interface Chapter {
  id: string
  grade_id: string
  title: string
  order_index: number
}

interface Package {
  id: string
  name: string
  description: string | null
  grade_id: string
  price: number
  month: number
  year: number
  is_active: boolean
  grade: Grade | null
  chapters: Chapter[]
}

interface FormState {
  description: string
  grade_id: string
  price: string
  month: string
  year: string
  is_active: boolean
  chapter_ids: string[]
}

const EMPTY_FORM: FormState = {
  description: '',
  grade_id: '',
  price: '0',
  month: String(new Date().getMonth() + 1),
  year: String(CURRENT_YEAR),
  is_active: true,
  chapter_ids: [],
}

export default function AdminSubscriptionsPage() {
  const [packages, setPackages] = useState<Package[]>([])
  const [grades, setGrades] = useState<Grade[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [takenChapterIds, setTakenChapterIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  const supabase = createClient()

  const load = useCallback(async () => {
    const [{ data: pkgs }, { data: gradeData }] = await Promise.all([
      supabase
        .from('subscription_packages')
        .select('*, grade:grades(id,name,color), subscription_package_chapters(chapter_id)')
        .order('year', { ascending: true })
        .order('month', { ascending: true }),
      supabase.from('grades').select('id,name,color').eq('is_active', true).order('order_index'),
    ])

    // Resolve chapter details for each package
    const allChapterIds = [
      ...new Set((pkgs ?? []).flatMap((p: any) =>
        (p.subscription_package_chapters ?? []).map((c: any) => c.chapter_id)
      )),
    ]

    let chapterMap: Record<string, Chapter> = {}
    if (allChapterIds.length > 0) {
      const { data: chData } = await supabase
        .from('chapters')
        .select('id,grade_id,title,order_index')
        .in('id', allChapterIds)
      for (const c of chData ?? []) chapterMap[c.id] = c
    }

    const mapped: Package[] = (pkgs ?? []).map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      grade_id: p.grade_id,
      price: p.price,
      month: p.month,
      year: p.year,
      is_active: p.is_active,
      grade: p.grade ?? null,
      chapters: (p.subscription_package_chapters ?? [])
        .map((c: any) => chapterMap[c.chapter_id])
        .filter(Boolean)
        .sort((a: Chapter, b: Chapter) => a.order_index - b.order_index),
    }))

    setPackages(mapped)
    setGrades(gradeData ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Load chapters when grade changes in form
  useEffect(() => {
    if (!form.grade_id) { setChapters([]); setTakenChapterIds([]); return }
    Promise.all([
      supabase.from('chapters').select('id,grade_id,title,order_index').eq('grade_id', form.grade_id).order('order_index'),
      supabase.from('subscription_packages')
        .select('id, subscription_package_chapters(chapter_id)')
        .eq('grade_id', form.grade_id)
        .eq('is_active', true),
    ]).then(([{ data: chData }, { data: pkgData }]) => {
      setChapters(chData ?? [])
      // Collect chapter IDs already used by OTHER packages
      const taken: string[] = []
      for (const pkg of pkgData ?? []) {
        if (pkg.id === editingId) continue // skip current package being edited
        for (const c of (pkg as any).subscription_package_chapters ?? []) {
          taken.push(c.chapter_id)
        }
      }
      setTakenChapterIds(taken)
    })
  }, [form.grade_id, editingId])

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(pkg: Package) {
    setEditingId(pkg.id)
    setForm({
      description: pkg.description ?? '',
      grade_id: pkg.grade_id,
      price: String(pkg.price),
      month: String(pkg.month),
      year: String(pkg.year),
      is_active: pkg.is_active,
      chapter_ids: pkg.chapters.map((c) => c.id),
    })
    setDialogOpen(true)
  }

  function toggleChapter(id: string) {
    setForm((f) => ({
      ...f,
      chapter_ids: f.chapter_ids.includes(id)
        ? f.chapter_ids.filter((c) => c !== id)
        : [...f.chapter_ids, id],
    }))
  }

  async function handleSave() {
    if (!form.grade_id) { toast.error('Please select a grade'); return }
    if (form.chapter_ids.length === 0) { toast.error('Select at least one chapter'); return }

    setSaving(true)
    const payload = {
      name: `${MONTHS[parseInt(form.month) - 1]} ${form.year}`,
      description: form.description.trim() || null,
      grade_id: form.grade_id,
      price: parseFloat(form.price) || 0,
      month: parseInt(form.month),
      year: parseInt(form.year),
      is_active: form.is_active,
    }

    let pkgId = editingId

    if (editingId) {
      const { error } = await supabase
        .from('subscription_packages')
        .update(payload)
        .eq('id', editingId)
      if (error) { toast.error(error.message); setSaving(false); return }
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('subscription_packages')
        .insert({ ...payload, created_by: user!.id })
        .select('id')
        .single()
      if (error) { toast.error(error.message); setSaving(false); return }
      pkgId = data.id
    }

    // Sync chapters: delete existing then insert new
    await supabase.from('subscription_package_chapters').delete().eq('package_id', pkgId!)
    if (form.chapter_ids.length > 0) {
      const { error } = await supabase
        .from('subscription_package_chapters')
        .insert(form.chapter_ids.map((cid) => ({ package_id: pkgId!, chapter_id: cid })))
      if (error) { toast.error(error.message); setSaving(false); return }
    }

    toast.success(editingId ? 'Package updated' : 'Package created')
    setDialogOpen(false)
    setSaving(false)
    load()
  }

  async function handleDelete(pkg: Package) {
    if (!confirm(`Delete "${pkg.name}" permanently?`)) return
    const { error } = await supabase
      .from('subscription_packages')
      .delete()
      .eq('id', pkg.id)
    if (error) { toast.error(error.message); return }
    toast.success('Package deleted')
    load()
  }

  async function toggleActive(pkg: Package) {
    const { error } = await supabase
      .from('subscription_packages')
      .update({ is_active: !pkg.is_active })
      .eq('id', pkg.id)
    if (error) { toast.error(error.message); return }
    toast.success(pkg.is_active ? 'Package deactivated' : 'Package activated')
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Subscription Packages</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Bundle chapters into monthly subscriptions for students
          </p>
        </div>
        <Button onClick={openCreate} className="bg-primary text-primary-foreground hover:bg-accent">
          <Plus className="w-4 h-4 mr-2" />
          New Package
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : packages.length === 0 ? (
        <div className="py-20 text-center rounded-xl border border-border/60">
          <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No subscription packages yet.</p>
          <p className="text-sm text-muted-foreground mt-1">Create your first package to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {packages.map((pkg) => (
            <div key={pkg.id} className="rounded-xl border border-border/60 bg-card overflow-hidden">
              {/* Header row */}
              <div className="flex items-center gap-3 px-5 py-4">
                <button
                  onClick={() => setExpanded(expanded === pkg.id ? null : pkg.id)}
                  className="flex-1 flex items-start gap-3 text-left min-w-0"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{pkg.name}</span>
                      {!pkg.is_active && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">Inactive</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {pkg.grade && (
                        <span className="text-xs font-medium" style={{ color: pkg.grade.color }}>
                          {pkg.grade.name}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {MONTHS[pkg.month - 1]} {pkg.year}
                      </span>
                      <span className="text-xs font-medium text-primary">
                        Rs {pkg.price.toFixed(2)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {pkg.chapters.length} chapter{pkg.chapters.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  {expanded === pkg.id
                    ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                    : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                  }
                </button>

                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(pkg)} title="Edit">
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(pkg)}
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Expanded detail */}
              {expanded === pkg.id && (
                <div className="border-t border-border/60 px-5 py-4 bg-muted/20 space-y-3">
                  {pkg.description && (
                    <p className="text-sm text-muted-foreground">{pkg.description}</p>
                  )}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Included chapters:</p>
                    {pkg.chapters.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">No chapters linked.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {pkg.chapters.map((ch) => (
                          <Badge key={ch.id} variant="outline" className="text-xs">
                            {ch.title}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-muted-foreground">
                      {pkg.is_active ? 'Visible to students' : 'Hidden from students'}
                    </span>
                    <Switch
                      checked={pkg.is_active}
                      onCheckedChange={() => toggleActive(pkg)}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Package' : 'New Subscription Package'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                rows={2}
                placeholder="What's included in this subscription?"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Grade *</Label>
                <Select
                  value={form.grade_id}
                  onValueChange={(v) => setForm((f) => ({ ...f, grade_id: v, chapter_ids: [] }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                  <SelectContent>
                    {grades.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Price (Rs) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Month *</Label>
                <Select
                  value={form.month}
                  onValueChange={(v) => setForm((f) => ({ ...f, month: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Year *</Label>
                <Select
                  value={form.year}
                  onValueChange={(v) => setForm((f) => ({ ...f, year: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {YEARS.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Chapter picker */}
            <div className="space-y-2">
              <Label>Chapters * {form.grade_id ? '' : '(select a grade first)'}</Label>
              {!form.grade_id ? (
                <p className="text-xs text-muted-foreground">Select a grade to see available chapters.</p>
              ) : chapters.length === 0 ? (
                <p className="text-xs text-muted-foreground">No chapters for this grade yet.</p>
              ) : (
                <div className="rounded-lg border border-border/60 divide-y divide-border/40 max-h-48 overflow-y-auto">
                  {chapters.map((ch) => {
                    const isTaken = takenChapterIds.includes(ch.id) && !form.chapter_ids.includes(ch.id)
                    return (
                      <label
                        key={ch.id}
                        className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors ${isTaken ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={form.chapter_ids.includes(ch.id)}
                          onChange={() => !isTaken && toggleChapter(ch.id)}
                          disabled={isTaken}
                          className="accent-primary"
                        />
                        <span className="text-sm flex-1">{ch.title}</span>
                        {isTaken && <span className="text-xs text-muted-foreground">In use</span>}
                      </label>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between py-1">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">Visible to students when active</p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-primary text-primary-foreground hover:bg-accent"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editingId ? 'Save Changes' : 'Create Package'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
