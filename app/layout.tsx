import React from "react"
import type { Metadata, Viewport } from 'next'
import { DM_Sans, Playfair_Display } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/sonner'
import { CookieConsent } from '@/components/lc/cookie-consent'
import { PWAInstallPrompt } from '@/components/lc/pwa-install-prompt'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: '--font-dm-sans',
  weight: ['300', '400', '500', '600'],
})

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: '--font-playfair',
  weight: ['400', '500', '600', '700'],
})

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://lessoncomputer.mu'

export const metadata: Metadata = {
  title: {
    default: 'Cambridge Computer Science Online Tuition — IGCSE 0478, O Level 2210, A Level 9618',
    template: '%s | LessonComputer.mu',
  },
  description: 'Online Cambridge Computer Science tuition — live classes and full video courses for IGCSE 0478, O Level 2210 and AS & A Level 9618. Taught from Mauritius, open to students worldwide.',
  // No `keywords` tag — it's obsolete and ignored by every major search engine.
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: '/' },
  icons: {
    icon: [
      { url: '/favicon.ico?v=2', sizes: '32x32' },
      { url: '/icon.svg?v=2', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png?v=2',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'LessonComputer.mu',
  },
  openGraph: {
    siteName: 'LessonComputer.mu',
    title: 'Cambridge Computer Science Online Tuition | LessonComputer.mu',
    description: 'Cambridge Computer Science taught live from Mauritius, to students anywhere in the world.',
    url: SITE_URL,
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cambridge Computer Science Online Tuition | LessonComputer.mu',
    description: 'Cambridge Computer Science taught live from Mauritius, to students anywhere in the world.',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAFAF8' },
    { media: '(prefers-color-scheme: dark)', color: '#0F0F0F' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${dmSans.variable} ${playfairDisplay.variable} font-sans antialiased overflow-x-hidden`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
          <CookieConsent />
          <PWAInstallPrompt />
          <Toaster richColors />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}
