'use client'

import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
