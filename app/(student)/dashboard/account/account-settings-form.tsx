'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

const profileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  grade_id: z.string().min(1, 'Please select a grade'),
})

const passwordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  message: 'Passwords do not match',
  path: ['confirm'],
})

type ProfileData = z.infer<typeof profileSchema>
type PasswordData = z.infer<typeof passwordSchema>

interface ProfileSettingsFormProps {
  userId: string
  fullName: string
  currentGradeId: string | null
  grades: { id: string; name: string }[]
}

export function ProfileSettingsForm({ userId, fullName, currentGradeId, grades }: ProfileSettingsFormProps) {
  const [saving, setSaving] = useState(false)

  const form = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: fullName, grade_id: currentGradeId ?? '' },
  })

  async function onSubmit(data: ProfileData) {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: data.full_name, grade_id: data.grade_id })
      .eq('id', userId)
    if (error) { toast.error(error.message) } else { toast.success('Profile updated') }
    setSaving(false)
  }

  return (
    <Card className="border-border/60 h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Profile Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full name</Label>
            <Input id="full_name" placeholder="Your name" {...form.register('full_name')} />
            {form.formState.errors.full_name && (
              <p className="text-xs text-destructive">{form.formState.errors.full_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>My grade</Label>
            <Select
              defaultValue={currentGradeId ?? undefined}
              onValueChange={(v) => form.setValue('grade_id', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your grade" />
              </SelectTrigger>
              <SelectContent>
                {grades.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.grade_id && (
              <p className="text-xs text-destructive">{form.formState.errors.grade_id.message}</p>
            )}
            <p className="text-xs text-muted-foreground">Your dashboard will show videos from this grade.</p>
          </div>

          <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground hover:bg-accent">
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Save Changes
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export function PasswordSettingsForm() {
  const [saving, setSaving] = useState(false)

  const form = useForm<PasswordData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: '', confirm: '' },
  })

  async function onSubmit(data: PasswordData) {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: data.password })
    if (error) { toast.error(error.message) } else {
      toast.success('Password updated')
      form.reset()
    }
    setSaving(false)
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Change Password</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-pw">New password</Label>
            <Input id="new-pw" type="password" autoComplete="new-password" placeholder="At least 8 characters" {...form.register('password')} />
            {form.formState.errors.password && (
              <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-pw">Confirm new password</Label>
            <Input id="confirm-pw" type="password" autoComplete="new-password" placeholder="Repeat your new password" {...form.register('confirm')} />
            {form.formState.errors.confirm && (
              <p className="text-xs text-destructive">{form.formState.errors.confirm.message}</p>
            )}
          </div>
          <Button type="submit" disabled={saving} variant="outline">
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Update Password
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

// Kept for backwards compatibility — not used by the account page anymore
export function AccountSettingsForm({ userId, fullName, currentGradeId, grades }: ProfileSettingsFormProps) {
  return (
    <div className="space-y-5">
      <ProfileSettingsForm userId={userId} fullName={fullName} currentGradeId={currentGradeId} grades={grades} />
      <PasswordSettingsForm />
    </div>
  )
}
