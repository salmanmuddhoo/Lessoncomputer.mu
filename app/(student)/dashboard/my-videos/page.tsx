import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { VideoCard } from '@/components/lc/video-card'
import { ShoppingBag, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata = { title: 'My Videos' }

export default async function MyVideosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: purchases } = await supabase
    .from('purchases')
    .select('*, video:videos(*, grade:grades(*))')
    .eq('student_id', user!.id)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">My Videos</h1>
        <p className="text-muted-foreground text-sm mt-0.5">{purchases?.length ?? 0} videos purchased</p>
      </div>

      {purchases && purchases.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {purchases.map((p) => p.video && (
            <VideoCard key={p.id} video={p.video} owned />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center">
          <ShoppingBag className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-semibold mb-2">No videos yet</h3>
          <p className="text-sm text-muted-foreground mb-6">Browse our collection and purchase your first lesson.</p>
          <Button asChild className="bg-primary text-primary-foreground hover:bg-accent">
            <Link href="/grades">
              Browse Videos <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}
