import { Routes, Route } from 'react-router-dom'
import { DeliveryDashboard } from './pages/DeliveryDashboard'
import { MobileAgent } from './pages/MobileAgent'
import { Layout } from './components/Layout'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DeliveryDashboard />} />
        <Route path="/dashboard" element={<DeliveryDashboard />} />
        <Route path="/mobile" element={<MobileAgent />} />
        <Route path="/agent" element={<MobileAgent />} />
      </Routes>
    </Layout>
  )
}

export default App