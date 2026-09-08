import React from "react"
import type { Metadata, Viewport } from 'next'
import { DM_Sans, Playfair_Display } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/sonner'
import { CookieConsent } from '@/components/lc/cookie-consent'
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
    default: 'LessonComputer.mu | Cambridge Computer Science Tuition',
    template: '%s | LessonComputer.mu',
  },
  description: 'Expert-led Cambridge IGCSE, O Level and A Level Computer Science tuition (0478, 2210, 9618) — video lessons and live classes for students in Mauritius and worldwide.',
  keywords: ['Cambridge Computer Science', 'IGCSE Computer Science 0478', 'O Level Computer Science 2210', 'A Level Computer Science 9618', 'Mauritius', 'online tuition', 'live classes', 'video lessons'],
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: '/' },
  icons: {
    icon: [
      { url: '/favicon.ico?v=2', sizes: '32x32' },
      { url: '/icon.svg?v=2', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png?v=2',
  },
  openGraph: {
    siteName: 'LessonComputer.mu',
    title: 'LessonComputer.mu | Cambridge Computer Science Tuition',
    description: 'Expert-led Cambridge IGCSE, O Level and A Level Computer Science tuition — video lessons and live classes for students in Mauritius and worldwide.',
    url: SITE_URL,
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LessonComputer.mu | Cambridge Computer Science Tuition',
    description: 'Expert-led Cambridge IGCSE, O Level and A Level Computer Science tuition — video lessons and live classes for students in Mauritius and worldwide.',
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
          <Toaster richColors />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}
