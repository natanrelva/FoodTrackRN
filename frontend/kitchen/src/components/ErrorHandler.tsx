import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { 
  AlertTriangle, 
  RefreshCw, 
  X, 
  ChevronDown, 
  ChevronUp,
  Clock,
  Wifi,
  WifiOff,
  Settings
} from 'lucide-react';
import { KitchenError, ErrorHandler as ErrorHandlerClass } from '../utils/errorHandler';

import FallbackManager from '../utils/fallbackMechanisms';
import { useOfflineStatus } from './OfflineIndicator';
import { toast } from 'sonner';

interface ErrorHandlerProps {
  error: KitchenError | Error | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  context?: {
    orderId?: string;
    stationId?: string;
    ingredientId?: string;
    operation?: string;
  };
  showDetails?: boolean;
  autoRetry?: boolean;
  maxRetries?: number;
}

export const ErrorHandlerComponent: React.FC<ErrorHandlerProps> = ({
  error,
  onRetry,
  onDismiss,
  context = {},
  showDetails = false,
  autoRetry = false,
  maxRetries = 3
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [showDetailsPanel, setShowDetailsPanel] = useState(showDetails);
  const [fallbackSuggestions, setFallbackSuggestions] = useState<any[]>([]);
  const { isOnline } = useOfflineStatus();

  const fallbackManager = FallbackManager.getInstance();

  useEffect(() => {
    if (error && autoRetry && retryCount < maxRetries && onRetry) {
      const timer = setTimeout(() => {
        handleRetry();
      }, Math.pow(2, retryCount) * 1000); // Exponential backoff

      return () => clearTimeout(timer);
    }
  }, [error, autoRetry, retryCount, maxRetries, onRetry]);

  useEffect(() => {
    if (error && error instanceof KitchenError) {
      loadFallbackSuggestions();
    }
  }, [error]);

  const loadFallbackSuggestions = async () => {
    if (!error || !(error instanceof KitchenError)) return;

    try {
      let suggestions: any[] = [];

      // Generate fallback suggestions based on error type
      switch (error.category) {
        case 'network':
          suggestions = [
            {
              type: 'offline_mode',
              title: 'Usar Modo Offline',
              description: 'Continuar trabalhando offline até a conexão ser restaurada',
              action: () => toast.info('Modo offline ativado. Dados serão sincronizados quando possível.')
            }
          ];
          break;

        case 'business':
          if (error.code === 'INGREDIENT_UNAVAILABLE' && context.ingredientId) {
            const result = await fallbackManager.handleInventoryShortage(context.ingredientId, 100, 0);
            if (result.substitutes) {
              suggestions = result.substitutes.map((sub: any) => ({
                type: 'ingredient_substitute',
                title: `Usar ${sub.name}`,
                description: `Substituto disponível: ${sub.description}`,
                action: () => toast.success(`Substituto selecionado: ${sub.name}`)
              }));
            }
          }
          break;

        case 'system':
          if (error.code === 'STATION_UNAVAILABLE' && context.stationId && context.orderId) {
            // This would normally fetch available stations from the API
            suggestions = [
              {
                type: 'station_reassign',
                title: 'Reatribuir Estação',
                description: 'Encontrar estação alternativa para o pedido',
                action: () => toast.info('Procurando estação alternativa...')
              }
            ];
          }
          break;
      }

      setFallbackSuggestions(suggestions);
    } catch (fallbackError) {
      console.error('Failed to load fallback suggestions:', fallbackError);
    }
  };

  const handleRetry = async () => {
    if (!onRetry || isRetrying) return;

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    try {
      await onRetry();
      toast.success('Operação realizada com sucesso!');
    } catch (retryError) {
      console.error('Retry failed:', retryError);
      toast.error('Tentativa falhou. Tente novamente.');
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss();
    }
    setRetryCount(0);
    setFallbackSuggestions([]);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'network': return isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />;
      case 'system': return <Settings className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  if (!error) return null;

  const kitchenError = error instanceof KitchenError ? error : null;
  const canRetry = kitchenError?.retryable !== false && retryCount < maxRetries;

  return (
    <Card className="border-l-4 border-l-red-500">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              {kitchenError ? getCategoryIcon(kitchenError.category) : <AlertTriangle className="h-4 w-4" />}
            </div>
            <div className="flex-1">
              <CardTitle className="text-sm font-medium">
                {kitchenError?.userMessage || error.message}
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                {kitchenError && (
                  <div className="flex items-center gap-2">
                    <Badge variant={getSeverityColor(kitchenError.severity)} className="text-xs">
                      {kitchenError.severity}
                    </Badge>
                    <span>{kitchenError.category}</span>
                    {retryCount > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Tentativa {retryCount}/{maxRetries}
                      </span>
                    )}
                  </div>
                )}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {kitchenError && kitchenError.suggestedActions.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetailsPanel(!showDetailsPanel)}
              >
                {showDetailsPanel ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleDismiss}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex gap-2 flex-wrap">
          {canRetry && onRetry && (
            <Button
              size="sm"
              onClick={handleRetry}
              disabled={isRetrying}
              variant="default"
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                  Tentando...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-3 w-3" />
                  Tentar Novamente
                </>
              )}
            </Button>
          )}

          {fallbackSuggestions.map((suggestion, index) => (
            <Button
              key={index}
              size="sm"
              variant="outline"
              onClick={suggestion.action}
            >
              {suggestion.title}
            </Button>
          ))}
        </div>

        {showDetailsPanel && kitchenError && (
          <div className="mt-4 space-y-3">
            {kitchenError.suggestedActions.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-2">Ações Sugeridas:</div>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {kitchenError.suggestedActions.map((action, index) => (
                      <li key={index}>{action}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {fallbackSuggestions.length > 0 && (
              <Alert>
                <Settings className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-2">Alternativas Disponíveis:</div>
                  <div className="space-y-2">
                    {fallbackSuggestions.map((suggestion, index) => (
                      <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                        <div className="font-medium">{suggestion.title}</div>
                        <div className="text-gray-600">{suggestion.description}</div>
                      </div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {process.env.NODE_ENV === 'development' && (
              <details className="text-xs">
                <summary className="cursor-pointer font-medium">Detalhes Técnicos</summary>
                <div className="mt-2 p-2 bg-gray-100 rounded font-mono">
                  <div><strong>Código:</strong> {kitchenError.code}</div>
                  <div><strong>Contexto:</strong> {JSON.stringify(kitchenError.context, null, 2)}</div>
                  <div><strong>Mensagem Técnica:</strong> {kitchenError.technicalMessage}</div>
                </div>
              </details>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Hook for using error handling in components
export const useErrorHandler = () => {
  const [error, setError] = useState<KitchenError | Error | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleError = (error: any, context: any = {}) => {
    const errorHandler = ErrorHandlerClass.getInstance();
    const kitchenError = errorHandler.handleError(error, context);
    setError(kitchenError);
    return kitchenError;
  };

  const clearError = () => {
    setError(null);
    setIsRetrying(false);
  };

  const retry = async (operation: () => Promise<any>) => {
    setIsRetrying(true);
    try {
      const result = await operation();
      clearError();
      return result;
    } catch (retryError) {
      handleError(retryError);
      throw retryError;
    } finally {
      setIsRetrying(false);
    }
  };

  return {
    error,
    isRetrying,
    handleError,
    clearError,
    retry
  };
};

export default ErrorHandlerComponent;