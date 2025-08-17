import { ReactNode } from 'react'
import ClientOnly from '@/components/common/ClientOnly'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <ClientOnly fallback={<div className="min-h-screen flex items-center justify-center" suppressHydrationWarning>Loading...</div>}>
      <div className="min-h-screen flex flex-col" suppressHydrationWarning={true}>
        {children}
      </div>
    </ClientOnly>
  )
}