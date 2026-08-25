import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

// POST /api/onboarding  { gradeId, fullName }
// Completes a student's profile (used after Google one-click sign-up, which can't
// capture a grade). Upserts via the service role so it works even if the profile row
// wasn't created yet. A student can only complete THEIR OWN profile.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { gradeId, fullName, referralSource, referralOther } = await req.json() as { gradeId?: string; fullName?: string; referralSource?: string; referralOther?: string }
    if (!gradeId) return NextResponse.json({ error: 'Please select your grade.' }, { status: 400 })

    const admin = createServiceRoleClient()

    // Validate the grade is real and active.
    const { data: grade } = await (admin as any)
      .from('grades').select('id').eq('id', gradeId).eq('is_active', true).maybeSingle()
    if (!grade) return NextResponse.json({ error: 'Invalid grade selected.' }, { status: 400 })

    const patch: Record<string, unknown> = { id: user.id, grade_id: gradeId }
    if (fullName && fullName.trim()) patch.full_name = fullName.trim()
    if (referralSource && referralSource.trim()) patch.referral_source = referralSource.trim()
    if (referralSource === 'other' && referralOther && referralOther.trim()) patch.referral_other = referralOther.trim()

    const { error } = await (admin as any)
      .from('profiles')
      .upsert(patch, { onConflict: 'id' })

    if (error) {
      console.error('[api/onboarding] upsert failed:', error)
      return NextResponse.json({ error: 'Could not save. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/onboarding]', err)
    return NextResponse.json({ error: 'Could not save. Please try again.' }, { status: 500 })
  }
}
