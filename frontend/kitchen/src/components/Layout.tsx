import { ReactNode } from 'react'
import { WebSocketStatus } from './WebSocketStatus'
import { OfflineIndicator } from './OfflineIndicator'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-primary">
              {import.meta.env.VITE_APP_NAME || 'FoodTrack Kitchen'}
            </h1>
            <div className="flex items-center gap-4">
              <OfflineIndicator />
              <WebSocketStatus />
            </div>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}