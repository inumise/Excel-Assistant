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
      <body className={`${inter.className} bg-[#0B0B0B] text-[#F6F1E9]`}>
        <SuperTokensProvider>
          <header className="sticky top-0 z-30 border-b border-[#C9A483]/20 bg-[#111111]/90 backdrop-blur">
            <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-semibold tracking-wide text-[#FFD700]">
                  Hyperplacity AI Workers
                </p>
                <p className="text-[11px] text-[#C9A483]">
                  #1A1A1A / #FFD700 / #C9A483 luxury stack
                </p>
              </div>

              <nav className="flex items-center gap-2 text-xs">
                <Link
                  href="/"
                  className="rounded-md border border-[#FFD700]/40 px-3 py-1.5 text-[#FFD700] hover:bg-[#2A240A]"
                >
                  Mind Map
                </Link>
                <Link
                  href="/settings"
                  className="rounded-md border border-[#C9A483]/30 px-3 py-1.5 text-[#EBDCC8] hover:bg-[#1A1A1A]"
                >
                  AI Manager
                </Link>
                <Link
                  href="/bugtracker/workflow-web-design-factory"
                  className="rounded-md border border-[#C9A483]/30 px-3 py-1.5 text-[#EBDCC8] hover:bg-[#1A1A1A]"
                >
                  Bugtracker
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
