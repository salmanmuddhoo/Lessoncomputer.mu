'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ShieldPlus, ShieldCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'

interface AdminRow { id: string; name: string | null }

export function ManageAdmins({ admins, currentUserId }: { admins: AdminRow[]; currentUserId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function handleCreate() {
    if (saving) return
    if (!email.trim() || password.length < 8) {
      toast.error('Enter an email and a password of at least 8 characters.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/create-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: fullName.trim(), email: email.trim(), password }),
      })
      const data = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? 'Could not create the admin.')
        return
      }
      toast.success('Admin created. They can now sign in.')
      setFullName(''); setEmail(''); setPassword(''); setOpen(false)
      router.refresh()
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          Administrators
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          {admins.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No administrators found.</p>
          ) : (
            admins.map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-border/40 bg-muted/20">
                <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="truncate">{a.name ?? 'Unnamed admin'}</span>
                {a.id === currentUserId && <span className="ml-auto text-xs text-muted-foreground">You</span>}
              </div>
            ))
          )}
        </div>

        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-accent" onClick={() => setOpen(true)}>
          <ShieldPlus className="w-4 h-4 mr-1.5" /> Add Admin
        </Button>
        <p className="text-xs text-muted-foreground">
          The new admin can sign in immediately with the email and password you set (no email confirmation needed).
        </p>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add administrator</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="admin-name">Full name</Label>
              <Input id="admin-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-email">Email</Label>
              <Input id="admin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" autoComplete="off" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-password">Temporary password</Label>
              <Input id="admin-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" />
              <p className="text-xs text-muted-foreground">Share it with the new admin; they can change it later from Settings.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button className="bg-primary text-primary-foreground hover:bg-accent" onClick={handleCreate} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <ShieldPlus className="w-4 h-4 mr-1.5" />}
              Create admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
