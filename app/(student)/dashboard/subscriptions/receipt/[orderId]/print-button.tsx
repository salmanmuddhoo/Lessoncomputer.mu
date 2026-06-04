'use client'

import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export function PrintButton() {
  return (
    <Button
      size="sm"
      onClick={() => window.print()}
      className="bg-primary text-primary-foreground hover:bg-accent gap-2"
    >
      <Printer className="w-4 h-4" />
      Save as PDF / Print
    </Button>
  )
}

export function BackButton() {
  const router = useRouter()
  return (
    <button
      onClick={() => router.back()}
      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      ← Back
    </button>
  )
}
