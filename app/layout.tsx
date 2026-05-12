import React from "react"
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const inter = Inter({
  subsets: ["latin"],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: {
    default: 'LessonComputer.mu — Learn at Your Own Pace',
    template: '%s | LessonComputer.mu',
  },
  description: 'The leading online learning platform in Mauritius. Watch video lessons and join live classes organised by grade.',
  keywords: ['online learning', 'Mauritius', 'education', 'live classes', 'video lessons', 'grades'],
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://lessoncomputer.mu'),
  openGraph: {
    title: 'LessonComputer.mu',
    description: 'The leading online learning platform in Mauritius.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#09090B',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        <Toaster richColors theme="dark" />
        <Analytics />
      </body>
    </html>
  )
}
