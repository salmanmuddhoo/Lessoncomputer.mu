import React from "react"
import type { Metadata, Viewport } from 'next'
import { DM_Sans, Playfair_Display } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/sonner'
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

export const metadata: Metadata = {
  title: {
    default: 'LessonComputer.mu — Learn at Your Own Pace',
    template: '%s | LessonComputer.mu',
  },
  description: 'The leading online learning platform in Mauritius. Watch video lessons and join live classes organised by grade.',
  keywords: ['online learning', 'Mauritius', 'education', 'live classes', 'video lessons', 'grades'],
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://lessoncomputer.mu'),
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
  openGraph: {
    title: 'LessonComputer.mu',
    description: 'The leading online learning platform in Mauritius.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#FAFAF8',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${playfairDisplay.variable} font-sans antialiased`}>
        {children}
        <Toaster richColors />
        <Analytics />
      </body>
    </html>
  )
}
