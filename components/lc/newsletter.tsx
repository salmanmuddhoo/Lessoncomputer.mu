'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

export function Newsletter() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    // Placeholder — connect to your email provider in Phase 2
    await new Promise((r) => setTimeout(r, 800))
    toast.success('You\'re subscribed! We\'ll notify you about new classes.')
    setEmail('')
    setLoading(false)
  }

  return (
    <section className="bg-secondary/50 border-y border-border py-16 md:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl mx-auto text-center">
          <p className="text-xs font-semibold tracking-[0.15em] text-primary uppercase mb-3">Stay Updated</p>
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-3">
            Never miss a new class
          </h2>
          <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
            Get notified when new video lessons and live classes are published for your grade.
          </p>

          <form onSubmit={handleSubmit} className="flex gap-2 max-w-sm mx-auto">
            <Input
              type="email"
              placeholder="Your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 rounded-full bg-card border-border h-11 px-5"
              required
            />
            <Button
              type="submit"
              disabled={loading}
              className="bg-foreground text-background hover:bg-foreground/90 rounded-full px-6 h-11 font-semibold shrink-0"
            >
              {loading ? '…' : 'Subscribe'}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground mt-4">
            No spam. Unsubscribe at any time.
          </p>
        </div>
      </div>
    </section>
  )
}
