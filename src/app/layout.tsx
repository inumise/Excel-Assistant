import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import './globals.css'
import { SuperTokensProvider } from '@/components/auth/SuperTokensProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Hyperplacity AI Workers',
  description:
    'Luxury-themed AI workflow studio with manager/programmer nodes, WhatsApp controls, and bugtracker automation.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#F8FBFF] text-[#0F172A]`}>
        <SuperTokensProvider>
          <header className="sticky top-0 z-30 border-b border-[#BFDBFE] bg-white/80 backdrop-blur">
            <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-semibold tracking-wide text-[#1D4ED8]">
                  Hyperplacity AI Workers
                </p>
                <p className="text-[11px] text-[#475569]">
                  Futuristic white + deep RGB control surface
                </p>
              </div>

              <nav className="flex items-center gap-2 text-xs">
                <Link
                  href="/"
                  className="rounded-md border border-[#93C5FD] px-3 py-1.5 text-[#1D4ED8] hover:bg-[#EFF6FF]"
                >
                  Board
                </Link>
              </nav>
            </div>
          </header>
          {children}
        </SuperTokensProvider>
      </body>
    </html>
  )
}
