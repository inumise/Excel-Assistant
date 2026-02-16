import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { SuperTokensProvider } from '@/components/auth/SuperTokensProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Mind Map Builder',
  description: 'Visual mind-map canvas with node settings, drawing tools, and AI box configuration.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-mind-motion="on">
      <body className={`${inter.className} mind-app-body`}>
        <SuperTokensProvider>{children}</SuperTokensProvider>
      </body>
    </html>
  )
}
