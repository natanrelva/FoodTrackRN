import React, { useState, useEffect } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Wifi, 
  WifiOff, 
  CloudOff, 
  RefreshCw, 
  Clock, 

  CheckCircle,
  XCircle
} from 'lucide-react';
import OfflineManager, { OfflineAction, SyncResult } from '../utils/offlineManager';
import { toast } from 'sonner';

interface OfflineIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ 
  className = '', 
  showDetails = false 
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingActions, setPendingActions] = useState<OfflineAction[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [_showDetailsPanel, _setShowDetailsPanel] = useState(false);

  const offlineManager = OfflineManager.getInstance();

  useEffect(() => {
    // Subscribe to connection changes
    const unsubscribe = offlineManager.onConnectionChange((online) => {
      setIsOnline(online);
      
      if (online) {
        toast.success('Conexão restaurada! Sincronizando dados...', {
          duration: 3000
        });
      } else {
        toast.warning('Conexão perdida. Modo offline ativado.', {
          duration: 5000
        });
      }
    });

    // Load initial pending actions
    loadPendingActions();

    // Refresh pending actions periodically
    const interval = setInterval(loadPendingActions, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const loadPendingActions = () => {
    const actions = offlineManager.getPendingActions();
    setPendingActions(actions);
  };

  const handleManualSync = async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    
    try {
      const result = await offlineManager.syncPendingActions();
      setLastSyncResult(result);
      loadPendingActions();
      
      if (result.success) {
        toast.success(`Sincronização concluída! ${result.syncedActions} ações sincronizadas.`);
      } else {
        toast.error(`Sincronização parcial: ${result.errors.length} erros encontrados.`);
      }
    } catch (error) {
      console.error('Manual sync failed:', error);
      toast.error('Falha na sincronização manual.');
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusColor = () => {
    if (!isOnline) return 'bg-red-500';
    if (pendingActions.length > 0) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (pendingActions.length > 0) return `${pendingActions.length} pendente(s)`;
    return 'Online';
  };

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="h-4 w-4" />;
    if (pendingActions.length > 0) return <Clock className="h-4 w-4" />;
    return <Wifi className="h-4 w-4" />;
  };

  const renderPendingActionsList = () => {
    if (pendingActions.length === 0) {
      return (
        <div className="text-center py-4 text-gray-500">
          <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
          <p>Todas as ações foram sincronizadas</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {pendingActions.map((action) => (
          <div key={action.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <div className="flex-1">
              <div className="font-medium text-sm">
                {getActionTypeLabel(action.type)}
              </div>
              <div className="text-xs text-gray-500">
                {new Date(action.timestamp).toLocaleTimeString()}
                {action.retryCount > 0 && ` • ${action.retryCount} tentativas`}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {action.retryCount >= action.maxRetries ? (
                <XCircle className="h-4 w-4 text-red-500" />
              ) : (
                <Clock className="h-4 w-4 text-yellow-500" />
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const getActionTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      'order_status_update': 'Atualização de Status do Pedido',
      'inventory_update': 'Atualização de Estoque',
      'station_assignment': 'Atribuição de Estação',
      'quality_report': 'Relatório de Qualidade'
    };
    return labels[type] || type;
  };

  const renderSyncResult = () => {
    if (!lastSyncResult) return null;

    return (
      <Alert className={lastSyncResult.success ? 'border-green-200' : 'border-red-200'}>
        <div className="flex items-center gap-2">
          {lastSyncResult.success ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <XCircle className="h-4 w-4 text-red-500" />
          )}
          <AlertDescription>
            {lastSyncResult.success ? (
              `Última sincronização: ${lastSyncResult.syncedActions} ações sincronizadas`
            ) : (
              `Sincronização parcial: ${lastSyncResult.errors.length} erros`
            )}
          </AlertDescription>
        </div>
        {!lastSyncResult.success && lastSyncResult.errors.length > 0 && (
          <div className="mt-2 text-xs text-red-600">
            {lastSyncResult.errors.slice(0, 3).map((error, index) => (
              <div key={index}>• {error}</div>
            ))}
            {lastSyncResult.errors.length > 3 && (
              <div>• ... e mais {lastSyncResult.errors.length - 3} erros</div>
            )}
          </div>
        )}
      </Alert>
    );
  };

  if (!showDetails) {
    // Simple indicator
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
        <span className="text-sm font-medium">{getStatusText()}</span>
        {getStatusIcon()}
      </div>
    );
  }

  // Detailed panel
  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-4">
        <Badge 
          variant={isOnline ? (pendingActions.length > 0 ? 'secondary' : 'default') : 'destructive'}
          className="flex items-center gap-1"
        >
          {getStatusIcon()}
          {getStatusText()}
        </Badge>
        
        {isOnline && pendingActions.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleManualSync}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <>
                <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-3 w-3" />
                Sincronizar
              </>
            )}
          </Button>
        )}
      </div>

      {!isOnline && (
        <Alert className="mb-4">
          <CloudOff className="h-4 w-4" />
          <AlertDescription>
            Modo offline ativo. As alterações serão sincronizadas quando a conexão for restaurada.
          </AlertDescription>
        </Alert>
      )}

      {renderSyncResult()}

      <Card className="mt-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Ações Pendentes</CardTitle>
          <CardDescription className="text-xs">
            Operações aguardando sincronização com o servidor
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {renderPendingActionsList()}
        </CardContent>
      </Card>
    </div>
  );
};

// Hook for using offline status in components
export const useOfflineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingActionsCount, setPendingActionsCount] = useState(0);

  useEffect(() => {
    const offlineManager = OfflineManager.getInstance();
    
    const unsubscribe = offlineManager.onConnectionChange(setIsOnline);
    
    const updatePendingCount = () => {
      const actions = offlineManager.getPendingActions();
      setPendingActionsCount(actions.length);
    };

    updatePendingCount();
    const interval = setInterval(updatePendingCount, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return {
    isOnline,
    pendingActionsCount,
    hasOfflineData: pendingActionsCount > 0
  };
};

export default OfflineIndicator;