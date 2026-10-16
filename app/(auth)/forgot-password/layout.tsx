import type { Metadata } from 'next'

// The page itself is a client component, so its metadata lives here. Without it the page
// inherited the homepage title; it has nothing to rank for, so it stays out of search.
export const metadata: Metadata = {
  title: 'Reset Password',
  robots: { index: false, follow: false },
}

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children
}
