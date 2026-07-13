'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog'
import {
  Loader2, Plus, Trash2, Pencil, Video, ImageIcon, FileText, Upload, MessageSquareQuote,
} from 'lucide-react'
import { toast } from 'sonner'

type TestimonialType = 'video' | 'photo' | 'result'

interface Testimonial {
  id: string
  type: TestimonialType
  author_name: string | null
  author_role: string | null
  quote: string | null
  media_url: string
  is_published: boolean
  order_index: number
}

const TYPE_META: Record<TestimonialType, { label: string; icon: typeof Video }> = {
  video:  { label: 'Video',        icon: Video },
  photo:  { label: 'Photo',        icon: ImageIcon },
  result: { label: 'Result sheet', icon: FileText },
}

const EMPTY = {
  type: 'video' as TestimonialType,
  author_name: '',
  author_role: 'Student',
  quote: '',
  media_url: '',
  is_published: true,
  order_index: 0,
}

function TestimonialDialog({ item, onDone }: { item?: Testimonial; onDone: () => void }) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({
    type: item?.type ?? EMPTY.type,
    author_name: item?.author_name ?? '',
    author_role: item?.author_role ?? 'Student',
    quote: item?.quote ?? '',
    media_url: item?.media_url ?? '',
    is_published: item?.is_published ?? true,
    order_index: item?.order_index ?? 0,
  })

  const isUpload = form.type === 'photo' || form.type === 'result'

  async function handleFile(file: File) {
    setUploading(true)
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from('testimonials').upload(path, file, { cacheControl: '3600', upsert: false })
    if (error) { toast.error(error.message); setUploading(false); return }
    const { data } = supabase.storage.from('testimonials').getPublicUrl(path)
    setForm((f) => ({ ...f, media_url: data.publicUrl }))
    setUploading(false)
    toast.success('File uploaded.')
  }

  async function save() {
    if (!form.media_url.trim()) {
      toast.error(form.type === 'video' ? 'Enter a streamable video URL.' : 'Upload a file.')
      return
    }
    setSaving(true)
    const payload = {
      type: form.type,
      author_name: form.author_name.trim() || null,
      author_role: form.author_role.trim() || null,
      quote: form.quote.trim() || null,
      media_url: form.media_url.trim(),
      is_published: form.is_published,
      order_index: Number(form.order_index) || 0,
    }
    const { error } = item
      ? await (supabase as any).from('testimonials').update(payload).eq('id', item.id)
      : await (supabase as any).from('testimonials').insert(payload)
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success(item ? 'Testimonial updated.' : 'Testimonial added.')
    setOpen(false)
    onDone()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o && !item) setForm({ ...EMPTY }) }}>
      <DialogTrigger asChild>
        {item ? (
          <Button variant="ghost" size="sm"><Pencil className="w-3.5 h-3.5 mr-1" /> Edit</Button>
        ) : (
          <Button className="bg-primary text-primary-foreground hover:bg-accent">
            <Plus className="w-4 h-4 mr-2" /> Add Testimonial
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader><DialogTitle>{item ? 'Edit' : 'Add'} Testimonial</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as TestimonialType, media_url: '' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TYPE_META) as TestimonialType[]).map((t) => (
                    <SelectItem key={t} value={t}>{TYPE_META[t].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={form.author_role} onValueChange={(v) => setForm((f) => ({ ...f, author_role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Student">Student</SelectItem>
                  <SelectItem value="Parent">Parent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Name</Label>
            <Input placeholder="e.g. Priya R." value={form.author_name} onChange={(e) => setForm((f) => ({ ...f, author_name: e.target.value }))} />
          </div>

          {/* Media: streamable URL for video, upload for photo/result */}
          {form.type === 'video' ? (
            <div className="space-y-2">
              <Label>Streamable video URL</Label>
              <Input placeholder="https://streamable.com/xxxxx" value={form.media_url} onChange={(e) => setForm((f) => ({ ...f, media_url: e.target.value }))} />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>{form.type === 'result' ? 'Result sheet image' : 'Photo'}</Label>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border/60 text-sm cursor-pointer hover:bg-muted/30 transition-colors">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? 'Uploading…' : 'Choose file'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                  />
                </label>
                {form.media_url && !uploading && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.media_url} alt="preview" className="h-14 w-14 rounded-lg object-cover border border-border/60" />
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Quote (optional)</Label>
            <Textarea rows={3} placeholder="What they said…" value={form.quote} onChange={(e) => setForm((f) => ({ ...f, quote: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-4 items-end">
            <div className="space-y-2">
              <Label>Order</Label>
              <Input type="number" min="0" value={form.order_index} onChange={(e) => setForm((f) => ({ ...f, order_index: Number(e.target.value) }))} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
              <Label className="cursor-pointer">Published</Label>
              <Switch checked={form.is_published} onCheckedChange={(v) => setForm((f) => ({ ...f, is_published: v }))} />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving || uploading} className="bg-primary text-primary-foreground hover:bg-accent">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {item ? 'Save' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function AdminTestimonialsPage() {
  const supabase = createClient()
  const [items, setItems] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data } = await (supabase as any)
      .from('testimonials')
      .select('id, type, author_name, author_role, quote, media_url, is_published, order_index')
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: false })
    setItems((data ?? []) as Testimonial[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function remove(id: string) {
    if (!confirm('Delete this testimonial?')) return
    const { error } = await (supabase as any).from('testimonials').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success('Testimonial deleted.')
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquareQuote className="w-6 h-6 text-primary" /> Testimonials
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Videos, photos and result sheets shown on the homepage.</p>
        </div>
        <TestimonialDialog onDone={load} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center rounded-xl border border-border/60">
          <MessageSquareQuote className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">No testimonials yet.</p>
          <TestimonialDialog onDone={load} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((t) => {
            const Icon = TYPE_META[t.type].icon
            return (
              <div key={t.id} className="rounded-xl border border-border/60 bg-card overflow-hidden flex flex-col">
                <div className="aspect-video bg-muted/40 relative flex items-center justify-center">
                  {t.type === 'video' ? (
                    <div className="flex flex-col items-center text-muted-foreground text-xs gap-1">
                      <Video className="w-8 h-8" />
                      <span className="px-2 text-center break-all line-clamp-1">{t.media_url}</span>
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.media_url} alt={t.author_name ?? 'testimonial'} className="w-full h-full object-cover" />
                  )}
                  {!t.is_published && (
                    <span className="absolute top-2 left-2 text-[10px] px-1.5 py-0.5 rounded bg-background/90 border border-border/60 text-muted-foreground">Hidden</span>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs gap-1"><Icon className="w-3 h-3" /> {TYPE_META[t.type].label}</Badge>
                    <span className="text-xs text-muted-foreground ml-auto">#{t.order_index}</span>
                  </div>
                  <p className="text-sm font-semibold">{t.author_name ?? '—'}</p>
                  <p className="text-xs text-muted-foreground">{t.author_role}</p>
                  {t.quote && <p className="text-xs text-muted-foreground mt-2 line-clamp-3 italic">&ldquo;{t.quote}&rdquo;</p>}
                  <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border/40">
                    <TestimonialDialog item={t} onDone={load} />
                    <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 ml-auto" onClick={() => remove(t.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
