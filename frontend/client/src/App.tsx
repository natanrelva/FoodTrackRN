import { useState } from 'react';
import { MenuScreen } from './components/MenuScreen';
import { CartScreen } from './components/CartScreen';
import { CheckoutScreen } from './components/CheckoutScreen';
import { OrderTrackingScreen } from './components/OrderTrackingScreen';
import { CartProvider } from './contexts/CartContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { WebSocketErrorHandler } from './components/WebSocketErrorHandler';
import { WebScreen } from '@foodtrack/types';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<WebScreen>('menu');
  const [orderId, setOrderId] = useState<string | null>(null);

  const handleNavigate = (screen: WebScreen, orderIdParam?: string) => {
    setCurrentScreen(screen);
    if (orderIdParam) {
      setOrderId(orderIdParam);
    }
  };

  return (
    <WebSocketProvider>
      <CartProvider>
        <div className="min-h-screen bg-slate-50">
          {/* Mobile Container */}
          <div className="max-w-md mx-auto bg-white min-h-screen shadow-2xl relative">
            {currentScreen === 'menu' && <MenuScreen onNavigate={handleNavigate} />}
            {currentScreen === 'cart' && <CartScreen onNavigate={handleNavigate} />}
            {currentScreen === 'checkout' && <CheckoutScreen onNavigate={handleNavigate} />}
            {currentScreen === 'tracking' && orderId && <OrderTrackingScreen orderId={orderId} onNavigate={handleNavigate} />}
          </div>
          <WebSocketErrorHandler />
        </div>
      </CartProvider>
    </WebSocketProvider>
  );
}
