import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Users } from 'lucide-react'

export const metadata = { title: 'Students' }

export default async function AdminStudentsPage() {
  const supabase = await createClient()

  const { data: students } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'student')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Students</h1>
        <p className="text-muted-foreground text-sm mt-0.5">{students?.length ?? 0} registered students</p>
      </div>

      <div className="rounded-xl border border-border/60 overflow-hidden">
        {students && students.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b border-border/60">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Joined</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                        {s.full_name ? s.full_name[0].toUpperCase() : '?'}
                      </div>
                      <span className="font-medium">{s.full_name ?? 'Unnamed'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(s.created_at).toLocaleDateString('en-MU', { dateStyle: 'medium' })}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className="capitalize">{s.role}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="py-16 text-center">
            <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No students have registered yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}
