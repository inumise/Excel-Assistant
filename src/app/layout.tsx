import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { SuperTokensProvider } from '@/components/auth/SuperTokensProvider'
import { GlobalNav } from '@/components/owner/GlobalNav'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Owner AI Employee Builder',
  description:
    'Owner-first platform to design large AI employee structures with visual maps, prompts, code controls, and operations dashboards.',
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
                  Owner AI Employee Builder
                </p>
                <p className="text-[11px] text-[#475569]">
                  Seamless structure design for non-programmer owners
                </p>
              </div>
              <GlobalNav />
            </div>
          </header>
          {children}
        </SuperTokensProvider>
      </body>
    </html>
  )
}
