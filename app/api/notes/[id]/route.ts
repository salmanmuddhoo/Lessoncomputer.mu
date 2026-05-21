import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface RouteProps {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteProps) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const isLive = searchParams.get('live') === '1'

  const supabase = await createClient()
  const { data: note } = await (supabase as any)
    .from('revision_notes')
    .select('title, content, content_live')
    .eq('id', id)
    .single()

  if (!note) {
    return new NextResponse('Not found', { status: 404 })
  }

  const html = isLive ? (note.content_live || note.content) : note.content

  if (!html) {
    return new NextResponse('No content', { status: 404 })
  }

  const page = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${note.title}</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      line-height: 1.7;
      max-width: 860px;
      margin: 2rem auto;
      padding: 0 1.5rem 4rem;
      color: #1a1a1a;
    }
    h1, h2, h3, h4 { line-height: 1.3; margin-top: 1.5em; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 0.5rem 0.75rem; text-align: left; }
    th { background: #f5f5f5; }
    img { max-width: 100%; height: auto; }
    pre, code { background: #f5f5f5; border-radius: 4px; padding: 0.2em 0.4em; font-size: 0.9em; }
    pre code { padding: 0; }
    pre { padding: 1em; overflow-x: auto; }
    @media (prefers-color-scheme: dark) {
      body { background: #111; color: #eee; }
      th, td { border-color: #333; }
      th { background: #222; }
      pre, code { background: #222; }
    }
  </style>
</head>
<body>
  <h1>${note.title}</h1>
  ${html}
</body>
</html>`

  return new NextResponse(page, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
