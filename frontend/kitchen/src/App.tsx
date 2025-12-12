import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { KitchenDashboard } from './pages/KitchenDashboard'
import { ImprovedKitchenDashboardPage } from './pages/ImprovedKitchenDashboard'
import { StationDisplay } from './pages/StationDisplay'
import { Layout } from './components/Layout'
import { WebSocketProvider } from './contexts/WebSocketContext'
import ErrorBoundary from './components/ErrorBoundary'

function App() {
  return (
    <ErrorBoundary>
      <WebSocketProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<ImprovedKitchenDashboardPage />} />
            <Route path="/dashboard" element={<KitchenDashboard />} />
            <Route path="/improved" element={<ImprovedKitchenDashboardPage />} />
            <Route path="/station/:stationId" element={<StationDisplay />} />
          </Routes>
        </Layout>
        <Toaster 
          position="top-right" 
          expand={true}
          richColors={true}
          closeButton={true}
        />
      </WebSocketProvider>
    </ErrorBoundary>
  )
}

export default App