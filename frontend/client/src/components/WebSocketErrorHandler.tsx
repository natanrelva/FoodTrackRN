import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { useWebSocketContext } from '../contexts/WebSocketContext';

export function WebSocketErrorHandler() {
  const { error, connected, connect } = useWebSocketContext();
  const [dismissed, setDismissed] = useState(false);
  const [retrying, setRetrying] = useState(false);

  // Reset dismissed state when error changes
  useEffect(() => {
    if (error) {
      setDismissed(false);
    }
  }, [error]);

  // Auto-dismiss when connected
  useEffect(() => {
    if (connected) {
      setDismissed(false);
      setRetrying(false);
    }
  }, [connected]);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await connect();
    } catch (err) {
      console.error('Manual reconnection failed:', err);
    } finally {
      setRetrying(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  if (!error || dismissed || connected) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-red-900 mb-1">
              Conexão perdida
            </h4>
            <p className="text-sm text-red-700 mb-3">
              Não foi possível conectar ao servidor. Algumas funcionalidades podem não funcionar corretamente.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleRetry}
                disabled={retrying}
                className="inline-flex items-center gap-1 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-3 h-3 ${retrying ? 'animate-spin' : ''}`} />
                {retrying ? 'Tentando...' : 'Tentar novamente'}
              </button>
              <button
                onClick={handleDismiss}
                className="inline-flex items-center gap-1 px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
              >
                Dispensar
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-red-400 hover:text-red-600 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default WebSocketErrorHandler;