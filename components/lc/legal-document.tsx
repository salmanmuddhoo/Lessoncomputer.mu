import type { ReactNode } from 'react'
import type { LegalDoc, LegalRun } from '@/lib/legal/types'

// Plain-text contact details in the source documents become working links without
// changing a single visible character of the published wording.
const AUTOLINK = /(lessonscomputers@gmail\.com|\+230 5915 1012|dataprotection\.govmu\.org)/g

function autolink(text: string, keyBase: string): ReactNode[] {
  return text.split(AUTOLINK).map((part, i) => {
    if (part === 'lessonscomputers@gmail.com') {
      return <a key={`${keyBase}-${i}`} href="mailto:lessonscomputers@gmail.com" className="text-primary hover:underline">{part}</a>
    }
    if (part === '+230 5915 1012') {
      return <a key={`${keyBase}-${i}`} href="https://wa.me/23059151012" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{part}</a>
    }
    if (part === 'dataprotection.govmu.org') {
      return <a key={`${keyBase}-${i}`} href="https://dataprotection.govmu.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{part}</a>
    }
    return part
  })
}

// Bracketed placeholders (e.g. the Data Protection Office registration number) must never
// be visible on the live site: substitute the real value when configured, otherwise drop the
// whole sentence that contains it.
const PLACEHOLDERS: Record<string, string | undefined> = {
  '[REGISTRATION NUMBER]': process.env.DPO_REGISTRATION_NUMBER,
  '[EXPIRY DATE]': process.env.DPO_REGISTRATION_EXPIRY,
}

function resolvePlaceholders(text: string): string {
  if (!text.includes('[')) return text
  const allSet = Object.entries(PLACEHOLDERS).every(([token, value]) => !text.includes(token) || !!value)
  if (allSet) {
    return Object.entries(PLACEHOLDERS).reduce((t, [token, value]) => t.split(token).join(value ?? token), text)
  }
  return text.replace(/\s*[^.]*\[[A-Z ]+\][^.]*\./g, '')
}

function Runs({ runs, keyBase }: { runs: LegalRun[]; keyBase: string }) {
  return (
    <>
      {runs.map((r, i) => {
        const text = resolvePlaceholders(r.text)
        if (!text) return null
        const content = r.href
          ? <a href={r.href} className="text-primary hover:underline">{text}</a>
          : autolink(text, `${keyBase}-${i}`)
        return r.b
          ? <strong key={i} className="font-semibold text-foreground">{content}</strong>
          : <span key={i} className="whitespace-pre-line">{content}</span>
      })}
    </>
  )
}

export function LegalDocument({ doc }: { doc: LegalDoc }) {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <h1 className="text-3xl font-bold mb-2">{doc.title}</h1>
      <p className="text-muted-foreground text-sm mb-10">{doc.updated}</p>

      <div className="space-y-4 text-sm leading-relaxed text-foreground/90">
        {doc.blocks.map((b, i) => {
          switch (b.t) {
            case 'h2':
              return <h2 key={i} className="text-lg font-semibold text-foreground pt-4">{b.text}</h2>
            case 'p':
              return <p key={i}><Runs runs={b.runs} keyBase={`p${i}`} /></p>
            case 'ul':
            case 'ol': {
              const List = b.t === 'ul' ? 'ul' : 'ol'
              return (
                <List key={i} className={`${b.t === 'ul' ? 'list-disc' : 'list-decimal'} pl-6 space-y-1.5`}>
                  {b.items.map((item, j) => <li key={j}><Runs runs={item} keyBase={`l${i}-${j}`} /></li>)}
                </List>
              )
            }
            case 'table': {
              const [head, ...rows] = b.rows
              return (
                <div key={i} className="overflow-x-auto rounded-lg border border-border/60">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr>{head.map((c, j) => <th key={j} className="text-left font-semibold px-3 py-2 align-top">{c}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {rows.map((r, j) => (
                        <tr key={j}>{r.map((c, k) => <td key={k} className="px-3 py-2 align-top">{autolink(c, `t${i}-${j}-${k}`)}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            }
          }
        })}
      </div>
    </div>
  )
}
