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
                  Mind Map
                </Link>
                <Link
                  href="/settings"
                  className="rounded-md border border-[#C7D2FE] px-3 py-1.5 text-[#4338CA] hover:bg-[#EEF2FF]"
                >
                  AI Manager
                </Link>
                <Link
                  href="/bugtracker/workflow-web-design-factory"
                  className="rounded-md border border-[#FBCFE8] px-3 py-1.5 text-[#BE185D] hover:bg-[#FDF2F8]"
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
