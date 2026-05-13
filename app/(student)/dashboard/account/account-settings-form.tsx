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

interface AccountSettingsFormProps {
  userId: string
  fullName: string
  currentGradeId: string | null
  grades: { id: string; name: string }[]
}

export function AccountSettingsForm({ userId, fullName, currentGradeId, grades }: AccountSettingsFormProps) {
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  const profileForm = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: fullName,
      grade_id: currentGradeId ?? '',
    },
  })

  const passwordForm = useForm<PasswordData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: '', confirm: '' },
  })

  async function onSaveProfile(data: ProfileData) {
    setSavingProfile(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: data.full_name, grade_id: data.grade_id })
      .eq('id', userId)
    if (error) { toast.error(error.message) } else { toast.success('Profile updated') }
    setSavingProfile(false)
  }

  async function onChangePassword(data: PasswordData) {
    setSavingPassword(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: data.password })
    if (error) { toast.error(error.message) } else {
      toast.success('Password updated')
      passwordForm.reset()
    }
    setSavingPassword(false)
  }

  return (
    <div className="space-y-5">
      {/* Profile settings */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Profile Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input id="full_name" placeholder="Your name" {...profileForm.register('full_name')} />
              {profileForm.formState.errors.full_name && (
                <p className="text-xs text-destructive">{profileForm.formState.errors.full_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>My grade</Label>
              <Select
                defaultValue={currentGradeId ?? undefined}
                onValueChange={(v) => profileForm.setValue('grade_id', v)}
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
              {profileForm.formState.errors.grade_id && (
                <p className="text-xs text-destructive">{profileForm.formState.errors.grade_id.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Your dashboard will show videos from this grade.
              </p>
            </div>

            <Button type="submit" disabled={savingProfile} className="bg-primary text-primary-foreground hover:bg-accent">
              {savingProfile && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change password */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-pw">New password</Label>
              <Input
                id="new-pw"
                type="password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                {...passwordForm.register('password')}
              />
              {passwordForm.formState.errors.password && (
                <p className="text-xs text-destructive">{passwordForm.formState.errors.password.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pw">Confirm new password</Label>
              <Input
                id="confirm-pw"
                type="password"
                autoComplete="new-password"
                placeholder="Repeat your new password"
                {...passwordForm.register('confirm')}
              />
              {passwordForm.formState.errors.confirm && (
                <p className="text-xs text-destructive">{passwordForm.formState.errors.confirm.message}</p>
              )}
            </div>
            <Button type="submit" disabled={savingPassword} variant="outline">
              {savingPassword && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Update Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
