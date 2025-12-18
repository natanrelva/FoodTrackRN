import { Routes, Route } from 'react-router-dom'
import { DeliveryDashboard } from './pages/DeliveryDashboard'
import { MobileAgent } from './pages/MobileAgent'
import { Layout } from './components/Layout'
import { WebSocketProvider } from './contexts/WebSocketContext'

function App() {
  return (
    <WebSocketProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<DeliveryDashboard />} />
          <Route path="/dashboard" element={<DeliveryDashboard />} />
          <Route path="/mobile" element={<MobileAgent />} />
          <Route path="/agent" element={<MobileAgent />} />
        </Routes>
      </Layout>
    </WebSocketProvider>
  )
}

export default App