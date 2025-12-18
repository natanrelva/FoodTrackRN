import { Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { useWebSocketContext } from '../contexts/WebSocketContext';

export function WebSocketStatus() {
  const { connected, connecting, error } = useWebSocketContext();

  if (connecting) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full text-sm">
        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
        <span>Conectando...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm">
        <AlertCircle className="w-4 h-4" />
        <span>Erro de conexão</span>
      </div>
    );
  }

  if (connected) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">
        <Wifi className="w-4 h-4" />
        <span>Conectado</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 text-gray-700 rounded-full text-sm">
      <WifiOff className="w-4 h-4" />
      <span>Desconectado</span>
    </div>
  );
}

export default WebSocketStatus;