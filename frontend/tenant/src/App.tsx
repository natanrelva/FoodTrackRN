import { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { OrderDetails } from './components/OrderDetails';
import { CatalogManagement } from './components/CatalogManagement';
import { Payments } from './components/Payments';
import { ChannelIntegration } from './components/ChannelIntegration';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
import { Sidebar } from './components/Sidebar';
import { AdminScreen } from '@foodtrack/types';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AdminScreen>('dashboard');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const handleOrderClick = (orderId: string) => {
    setSelectedOrderId(orderId);
    setCurrentScreen('order-details');
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'dashboard':
        return <Dashboard onOrderClick={handleOrderClick} />;
      case 'order-details':
        return <OrderDetails orderId={selectedOrderId} onBack={() => setCurrentScreen('dashboard')} />;
      case 'catalog':
        return <CatalogManagement />;
      case 'payments':
        return <Payments />;
      case 'channels':
        return <ChannelIntegration />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onOrderClick={handleOrderClick} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar currentScreen={currentScreen} onNavigate={setCurrentScreen} />
      <main className="flex-1 overflow-auto">
        {renderScreen()}
      </main>
    </div>
  );
}
