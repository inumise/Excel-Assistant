'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/', label: 'Builder' },
  { href: '/overview', label: 'Overview' },
  { href: '/structures', label: 'Structures' },
  { href: '/templates', label: 'Templates' },
  { href: '/playbooks', label: 'Playbooks' },
  { href: '/operations', label: 'Operations' },
  { href: '/settings', label: 'Settings' },
]

export function GlobalNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-wrap items-center justify-end gap-2 text-xs">
      {navItems.map((item) => {
        const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-md border px-3 py-1.5 transition ${
              active
                ? 'border-[#1D4ED8] bg-[#EFF6FF] text-[#1D4ED8]'
                : 'border-[#93C5FD] text-[#1D4ED8] hover:bg-[#EFF6FF]'
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
