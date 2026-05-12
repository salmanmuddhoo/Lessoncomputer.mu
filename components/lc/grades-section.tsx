import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { GradeCard } from '@/components/lc/grade-card'
import { Button } from '@/components/ui/button'
import type { Grade } from '@/lib/types/database'

const PLACEHOLDER_GRADES: (Grade & { videoCount?: number; liveClassCount?: number })[] = [
  { id: '1', name: 'Grade 7',       slug: 'grade-7',  description: 'Foundation of secondary education',    color: '#FACC15', order_index: 1, is_active: true, created_at: '', videoCount: 24, liveClassCount: 4 },
  { id: '2', name: 'Grade 8',       slug: 'grade-8',  description: 'Building core academic skills',        color: '#EAB308', order_index: 2, is_active: true, created_at: '', videoCount: 30, liveClassCount: 6 },
  { id: '3', name: 'Grade 9',       slug: 'grade-9',  description: 'Advancing towards School Certificate', color: '#CA8A04', order_index: 3, is_active: true, created_at: '', videoCount: 36, liveClassCount: 6 },
  { id: '4', name: 'Grade 10',      slug: 'grade-10', description: 'Consolidation for SC preparation',     color: '#A16207', order_index: 4, is_active: true, created_at: '', videoCount: 42, liveClassCount: 8 },
  { id: '5', name: 'Grade 11 (SC)', slug: 'grade-11', description: 'School Certificate Year',              color: '#1C1C1C', order_index: 5, is_active: true, created_at: '', videoCount: 48, liveClassCount: 10 },
  { id: '6', name: 'Grade 12 (HSC)','slug': 'grade-12', description: 'Higher School Certificate Year',   color: '#1C1C1C', order_index: 6, is_active: true, created_at: '', videoCount: 52, liveClassCount: 12 },
]

interface GradesSectionProps {
  grades?: (Grade & { videoCount?: number; liveClassCount?: number })[]
}

export function GradesSection({ grades = PLACEHOLDER_GRADES }: GradesSectionProps) {
  return (
    <section className="py-20 md:py-24 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-3">Curriculum</p>
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-foreground leading-tight">
              Browse by Grade
            </h2>
          </div>
          <Button variant="ghost" size="sm" asChild className="hidden sm:flex items-center gap-1 font-medium">
            <Link href="/grades">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {grades.map((grade) => (
            <GradeCard key={grade.id} grade={grade} />
          ))}
        </div>
      </div>
    </section>
  )
}
