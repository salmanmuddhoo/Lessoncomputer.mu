import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const pathname = request.nextUrl.pathname

  // API routes authenticate themselves (each handler calls getUser and returns JSON
  // errors). Running the auth/redirect logic here for them adds a network round-trip
  // and, if getUser throws, can crash the request into an empty response. Pass through.
  if (pathname.startsWith('/api')) {
    return NextResponse.next({ request })
  }

  // Pass through if Supabase is not yet configured (e.g. before env vars are set in Vercel)
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  // Never let an auth/network hiccup here crash the whole request into an empty
  // response — fall through as unauthenticated and let the page/route decide.
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (e) {
    console.error('[middleware] getUser failed:', e)
  }

  // Redirect unauthenticated users away from protected routes
  const isProtected = pathname.startsWith('/dashboard') || pathname.startsWith('/admin')
  if (isProtected && !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users away from auth pages — admins go to /admin
  const isAuthPage = pathname === '/login' || pathname === '/register'
  if (isAuthPage && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    const dest = profile?.role === 'admin' ? '/admin' : '/dashboard'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  // Fetch profile once for role + active checks on protected routes
  if ((pathname.startsWith('/admin') || pathname.startsWith('/dashboard')) && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single()

    // Block inactive students from the dashboard
    if (
      profile?.role === 'student' &&
      profile?.is_active === false &&
      pathname.startsWith('/dashboard')
    ) {
      const url = new URL('/login', request.url)
      url.searchParams.set('error', 'account_suspended')
      return NextResponse.redirect(url)
    }

    // Block non-admins from admin routes
    if (pathname.startsWith('/admin') && profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
