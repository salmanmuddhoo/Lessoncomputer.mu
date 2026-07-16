import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface RouteProps {
  params: Promise<{ id: string }>
}

const LOGIN_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign in required</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f9fafb; }
    .box { text-align: center; padding: 2rem; max-width: 360px; }
    h2 { margin: 0 0 0.5rem; color: #111; }
    p { color: #555; margin: 0 0 1.5rem; }
    a { display: inline-block; padding: 0.6rem 1.5rem; background: #f59e0b; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600; }
    a:hover { opacity: 0.85; }
  </style>
</head>
<body>
  <div class="box">
    <h2>Sign in required</h2>
    <p>Please sign in to view this content.</p>
    <a href="/login">Sign in</a>
  </div>
</body>
</html>`

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function sanitiseHtml(raw: string): string {
  // Strip embedded scripts/styles/links so stored content can't run JS or override
  // the page. Inline formatting is preserved.
  const bodyContent = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? raw
  return bodyContent
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<link[^>]*>/gi, '')
}

export async function GET(request: Request, { params }: RouteProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return new NextResponse(LOGIN_HTML, {
      status: 401,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const isLive = searchParams.get('live') === '1'

  // RLS (student_read_revision_notes) already restricts this row to students with an
  // active subscription covering the note's chapter — a non-subscriber gets no row.
  const { data: note } = await (supabase as any)
    .from('revision_notes')
    .select('title, content, content_live, is_published, is_published_for_live')
    .eq('id', id)
    .single()

  if (!note) {
    return new NextResponse('Not found', { status: 404 })
  }

  // Only serve content that is actually published in the requested mode.
  const publishedInMode = isLive ? note.is_published_for_live : note.is_published
  if (!publishedInMode) {
    return new NextResponse('Not found', { status: 404 })
  }

  const rawHtml = isLive ? (note.content_live || note.content) : note.content

  if (!rawHtml) {
    return new NextResponse('No content', { status: 404 })
  }

  const html = sanitiseHtml(rawHtml)

  const page = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(note.title ?? '')}</title>
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
  <h1>${escapeHtml(note.title ?? '')}</h1>
  ${html}
</body>
</html>`

  return new NextResponse(page, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
