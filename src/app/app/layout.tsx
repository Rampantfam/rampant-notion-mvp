import type { ReactNode } from 'react'

export const metadata = { title: 'Client • Rampant' }

export default function ClientLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-gray-50">{children}</div>
}
