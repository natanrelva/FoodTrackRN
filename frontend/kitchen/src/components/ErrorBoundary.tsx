import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { AlertTriangle, RefreshCw, Bug, Wifi, WifiOff } from 'lucide-react';
import { ErrorHandler, KitchenError } from '../utils/errorHandler';
import OfflineManager from '../utils/offlineManager';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isRetrying: boolean;
  retryCount: number;
  isOnline: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  private errorHandler: ErrorHandler;
  private offlineManager: OfflineManager;
  private unsubscribeOffline?: () => void;

  constructor(props: Props) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isRetrying: false,
      retryCount: 0,
      isOnline: navigator.onLine
    };

    this.errorHandler = ErrorHandler.getInstance();
    this.offlineManager = OfflineManager.getInstance();
  }

  componentDidMount() {
    // Listen for online/offline changes
    this.unsubscribeOffline = this.offlineManager.onConnectionChange((isOnline) => {
      this.setState({ isOnline });
      
      // If we come back online and had a network-related error, try to recover
      if (isOnline && this.state.hasError && this.isNetworkError(this.state.error)) {
        this.handleRetry();
      }
    });
  }

  componentWillUnmount() {
    if (this.unsubscribeOffline) {
      this.unsubscribeOffline();
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      errorInfo
    });

    // Handle the error through our error handler
    const kitchenError = this.errorHandler.handleError(error, {
      operation: 'component_render',
      component: 'ErrorBoundary'
    });

    // Call the onError prop if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report to external error tracking service
    this.reportError(error, errorInfo, kitchenError);
  }

  private reportError(error: Error, errorInfo: ErrorInfo, kitchenError: KitchenError): void {
    // In production, send error reports to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to error tracking service
      console.log('Would report error to monitoring service:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        kitchenError: {
          code: kitchenError.code,
          severity: kitchenError.severity,
          category: kitchenError.category
        }
      });
    }
  }

  private isNetworkError(error: Error | null): boolean {
    if (!error) return false;
    
    const networkErrorMessages = [
      'fetch',
      'network',
      'connection',
      'timeout',
      'offline'
    ];
    
    return networkErrorMessages.some(msg => 
      error.message.toLowerCase().includes(msg) ||
      error.name.toLowerCase().includes(msg)
    );
  }

  private handleRetry = async (): Promise<void> => {
    this.setState({ isRetrying: true });
    
    try {
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reset error state
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        isRetrying: false,
        retryCount: this.state.retryCount + 1
      });
    } catch (retryError) {
      console.error('Retry failed:', retryError);
      this.setState({ isRetrying: false });
    }
  };

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleReportBug = (): void => {
    const errorReport = {
      error: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      retryCount: this.state.retryCount
    };

    // Copy error report to clipboard
    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2))
      .then(() => {
        alert('Relatório de erro copiado para a área de transferência. Cole em um email para o suporte técnico.');
      })
      .catch(() => {
        console.log('Error report:', errorReport);
        alert('Não foi possível copiar o relatório. Verifique o console do navegador para detalhes.');
      });
  };

  private renderErrorDetails(): ReactNode {
    const { error, errorInfo } = this.state;
    
    if (!error) return null;

    const isNetworkError = this.isNetworkError(error);
    const canRetry = isNetworkError || this.state.retryCount < 3;

    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Erro:</strong> {error.message}
          </AlertDescription>
        </Alert>

        {isNetworkError && (
          <Alert>
            <div className="flex items-center gap-2">
              {this.state.isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
              <AlertDescription>
                Status da conexão: {this.state.isOnline ? 'Online' : 'Offline'}
                {!this.state.isOnline && ' - Algumas funcionalidades podem estar limitadas'}
              </AlertDescription>
            </div>
          </Alert>
        )}

        <div className="flex gap-2 flex-wrap">
          {canRetry && (
            <Button 
              onClick={this.handleRetry}
              disabled={this.state.isRetrying}
              variant="default"
            >
              {this.state.isRetrying ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Tentando novamente...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Tentar Novamente
                </>
              )}
            </Button>
          )}
          
          <Button onClick={this.handleReload} variant="outline">
            Recarregar Página
          </Button>
          
          <Button onClick={this.handleReportBug} variant="outline">
            <Bug className="mr-2 h-4 w-4" />
            Reportar Erro
          </Button>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium">
              Detalhes Técnicos (Desenvolvimento)
            </summary>
            <div className="mt-2 p-4 bg-gray-100 rounded text-xs font-mono">
              <div className="mb-2">
                <strong>Stack Trace:</strong>
                <pre className="whitespace-pre-wrap">{error.stack}</pre>
              </div>
              {errorInfo && (
                <div>
                  <strong>Component Stack:</strong>
                  <pre className="whitespace-pre-wrap">{errorInfo.componentStack}</pre>
                </div>
              )}
            </div>
          </details>
        )}
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Ops! Algo deu errado
              </CardTitle>
              <CardDescription>
                Ocorreu um erro inesperado na aplicação da cozinha. 
                {this.state.retryCount > 0 && ` (Tentativa ${this.state.retryCount})`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {this.renderErrorDetails()}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

export default ErrorBoundary;