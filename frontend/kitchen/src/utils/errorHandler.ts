import { toast } from 'sonner';

export interface ErrorContext {
  operation: string;
  component?: string;
  orderId?: string;
  stationId?: string;
  ingredientId?: string;
  userId?: string;
}

export interface ErrorDetails {
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'network' | 'validation' | 'permission' | 'system' | 'business';
  retryable: boolean;
  userMessage: string;
  technicalMessage: string;
  suggestedActions: string[];
}

export class KitchenError extends Error {
  public readonly code: string;
  public readonly severity: 'low' | 'medium' | 'high' | 'critical';
  public readonly category: 'network' | 'validation' | 'permission' | 'system' | 'business';
  public readonly retryable: boolean;
  public readonly context: ErrorContext;
  public readonly userMessage: string;
  public readonly technicalMessage: string;
  public readonly suggestedActions: string[];

  constructor(details: ErrorDetails, context: ErrorContext) {
    super(details.message);
    this.name = 'KitchenError';
    this.code = details.code;
    this.severity = details.severity;
    this.category = details.category;
    this.retryable = details.retryable;
    this.context = context;
    this.userMessage = details.userMessage;
    this.technicalMessage = details.technicalMessage;
    this.suggestedActions = details.suggestedActions;
  }
}

// Error classification and mapping
export const ERROR_CODES = {
  // Network errors
  NETWORK_UNAVAILABLE: 'NETWORK_UNAVAILABLE',
  API_TIMEOUT: 'API_TIMEOUT',
  CONNECTION_LOST: 'CONNECTION_LOST',
  
  // Recipe errors
  RECIPE_NOT_FOUND: 'RECIPE_NOT_FOUND',
  RECIPE_INVALID: 'RECIPE_INVALID',
  INGREDIENT_SUBSTITUTION_FAILED: 'INGREDIENT_SUBSTITUTION_FAILED',
  
  // Inventory errors
  INGREDIENT_UNAVAILABLE: 'INGREDIENT_UNAVAILABLE',
  STOCK_INSUFFICIENT: 'STOCK_INSUFFICIENT',
  INVENTORY_SYNC_FAILED: 'INVENTORY_SYNC_FAILED',
  BARCODE_SCAN_FAILED: 'BARCODE_SCAN_FAILED',
  
  // Station assignment errors
  STATION_UNAVAILABLE: 'STATION_UNAVAILABLE',
  STATION_OVERLOADED: 'STATION_OVERLOADED',
  EQUIPMENT_FAILURE: 'EQUIPMENT_FAILURE',
  ASSIGNMENT_FAILED: 'ASSIGNMENT_FAILED',
  
  // Quality control errors
  QUALITY_STANDARD_VIOLATION: 'QUALITY_STANDARD_VIOLATION',
  TEMPERATURE_VIOLATION: 'TEMPERATURE_VIOLATION',
  TIMING_VIOLATION: 'TIMING_VIOLATION',
  
  // System errors
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  SYSTEM_OVERLOAD: 'SYSTEM_OVERLOAD',
} as const;

export function classifyError(error: any, context: ErrorContext): KitchenError {
  // Network errors
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return new KitchenError({
      code: ERROR_CODES.NETWORK_UNAVAILABLE,
      message: 'Network connection unavailable',
      severity: 'high',
      category: 'network',
      retryable: true,
      userMessage: 'Conexão de rede indisponível. Tentando reconectar...',
      technicalMessage: `Network fetch failed: ${error.message}`,
      suggestedActions: [
        'Verificar conexão de internet',
        'Tentar novamente em alguns segundos',
        'Usar modo offline se disponível'
      ]
    }, context);
  }

  if (error.name === 'AbortError' || error.message.includes('timeout')) {
    return new KitchenError({
      code: ERROR_CODES.API_TIMEOUT,
      message: 'Request timeout',
      severity: 'medium',
      category: 'network',
      retryable: true,
      userMessage: 'Operação demorou muito para responder. Tentando novamente...',
      technicalMessage: `API timeout: ${error.message}`,
      suggestedActions: [
        'Aguardar alguns segundos',
        'Tentar novamente',
        'Verificar status do servidor'
      ]
    }, context);
  }

  // Recipe errors
  if (error.message.includes('Recipe not found') || error.message.includes('receita não encontrada')) {
    return new KitchenError({
      code: ERROR_CODES.RECIPE_NOT_FOUND,
      message: 'Recipe not found',
      severity: 'high',
      category: 'business',
      retryable: false,
      userMessage: 'Receita não encontrada. Verifique o prato selecionado.',
      technicalMessage: `Recipe lookup failed: ${error.message}`,
      suggestedActions: [
        'Verificar se o prato existe no cardápio',
        'Contatar gerência para atualizar receitas',
        'Usar receita alternativa se disponível'
      ]
    }, context);
  }

  // Inventory errors
  if (error.message.includes('Ingredient unavailable') || error.message.includes('ingrediente indisponível')) {
    return new KitchenError({
      code: ERROR_CODES.INGREDIENT_UNAVAILABLE,
      message: 'Ingredient unavailable',
      severity: 'high',
      category: 'business',
      retryable: false,
      userMessage: 'Ingrediente indisponível. Verificar substitutos ou marcar prato como indisponível.',
      technicalMessage: `Ingredient availability check failed: ${error.message}`,
      suggestedActions: [
        'Verificar estoque físico',
        'Usar ingrediente substituto',
        'Marcar prato como indisponível',
        'Solicitar reposição urgente'
      ]
    }, context);
  }

  if (error.message.includes('Insufficient stock') || error.message.includes('estoque insuficiente')) {
    return new KitchenError({
      code: ERROR_CODES.STOCK_INSUFFICIENT,
      message: 'Insufficient stock',
      severity: 'medium',
      category: 'business',
      retryable: false,
      userMessage: 'Estoque insuficiente para completar o pedido.',
      technicalMessage: `Stock check failed: ${error.message}`,
      suggestedActions: [
        'Verificar quantidade disponível',
        'Ajustar porções se possível',
        'Solicitar reposição',
        'Notificar cliente sobre possível atraso'
      ]
    }, context);
  }

  // Station assignment errors
  if (error.message.includes('Station unavailable') || error.message.includes('estação indisponível')) {
    return new KitchenError({
      code: ERROR_CODES.STATION_UNAVAILABLE,
      message: 'Station unavailable',
      severity: 'medium',
      category: 'system',
      retryable: true,
      userMessage: 'Estação indisponível. Reatribuindo para estação alternativa.',
      technicalMessage: `Station assignment failed: ${error.message}`,
      suggestedActions: [
        'Tentar estação alternativa',
        'Verificar status do equipamento',
        'Redistribuir carga de trabalho',
        'Notificar manutenção se necessário'
      ]
    }, context);
  }

  // Authentication errors
  if (error.status === 401 || error.message.includes('Unauthorized')) {
    return new KitchenError({
      code: ERROR_CODES.AUTH_EXPIRED,
      message: 'Authentication expired',
      severity: 'high',
      category: 'permission',
      retryable: false,
      userMessage: 'Sessão expirada. Faça login novamente.',
      technicalMessage: `Authentication failed: ${error.message}`,
      suggestedActions: [
        'Fazer login novamente',
        'Verificar credenciais',
        'Contatar administrador se problema persistir'
      ]
    }, context);
  }

  // Validation errors
  if (error.status === 400 || error.message.includes('validation')) {
    return new KitchenError({
      code: ERROR_CODES.VALIDATION_FAILED,
      message: 'Validation failed',
      severity: 'low',
      category: 'validation',
      retryable: false,
      userMessage: 'Dados inválidos. Verifique as informações inseridas.',
      technicalMessage: `Validation error: ${error.message}`,
      suggestedActions: [
        'Verificar dados inseridos',
        'Corrigir campos obrigatórios',
        'Seguir formato esperado'
      ]
    }, context);
  }

  // Default error
  return new KitchenError({
    code: 'UNKNOWN_ERROR',
    message: error.message || 'Unknown error',
    severity: 'medium',
    category: 'system',
    retryable: true,
    userMessage: 'Erro inesperado. Tentando novamente...',
    technicalMessage: `Unclassified error: ${error.message || error}`,
    suggestedActions: [
      'Tentar novamente',
      'Recarregar a página se problema persistir',
      'Contatar suporte técnico'
    ]
  }, context);
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: KitchenError[] = [];
  private maxLogSize = 100;

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  handleError(error: any, context: ErrorContext): KitchenError {
    const kitchenError = classifyError(error, context);
    
    // Log error
    this.logError(kitchenError);
    
    // Show user notification
    this.showUserNotification(kitchenError);
    
    // Report to monitoring (in production)
    this.reportError(kitchenError);
    
    return kitchenError;
  }

  private logError(error: KitchenError): void {
    console.error('Kitchen Error:', {
      code: error.code,
      severity: error.severity,
      category: error.category,
      context: error.context,
      message: error.technicalMessage,
      timestamp: new Date().toISOString()
    });

    // Add to in-memory log
    this.errorLog.unshift(error);
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize);
    }

    // Store in localStorage for offline analysis
    try {
      const storedErrors = JSON.parse(localStorage.getItem('kitchen_error_log') || '[]');
      storedErrors.unshift({
        code: error.code,
        severity: error.severity,
        category: error.category,
        context: error.context,
        message: error.technicalMessage,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('kitchen_error_log', JSON.stringify(storedErrors.slice(0, 50)));
    } catch (e) {
      console.warn('Failed to store error log:', e);
    }
  }

  private showUserNotification(error: KitchenError): void {
    const toastOptions = {
      duration: error.severity === 'critical' ? 10000 : 5000,
      action: error.retryable ? {
        label: 'Tentar Novamente',
        onClick: () => {
          // This would be handled by the calling component
          console.log('Retry requested for error:', error.code);
        }
      } : undefined
    };

    switch (error.severity) {
      case 'critical':
        toast.error(error.userMessage, toastOptions);
        break;
      case 'high':
        toast.error(error.userMessage, toastOptions);
        break;
      case 'medium':
        toast.warning(error.userMessage, toastOptions);
        break;
      case 'low':
        toast.info(error.userMessage, toastOptions);
        break;
    }
  }

  private reportError(_error: KitchenError): void {
    // In production, this would send error reports to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to error tracking service
      // errorTrackingService.report(error);
    }
  }

  getErrorLog(): KitchenError[] {
    return [...this.errorLog];
  }

  clearErrorLog(): void {
    this.errorLog = [];
    localStorage.removeItem('kitchen_error_log');
  }

  getErrorsByCategory(category: string): KitchenError[] {
    return this.errorLog.filter(error => error.category === category);
  }

  getErrorsBySeverity(severity: string): KitchenError[] {
    return this.errorLog.filter(error => error.severity === severity);
  }
}

// Utility functions for common error scenarios
export const handleRecipeError = (error: any, dishId: string) => {
  return ErrorHandler.getInstance().handleError(error, {
    operation: 'recipe_lookup',
    component: 'RecipeDisplay',
    orderId: dishId
  });
};

export const handleInventoryError = (error: any, ingredientId: string, operation: string) => {
  return ErrorHandler.getInstance().handleError(error, {
    operation,
    component: 'InventoryManagement',
    ingredientId
  });
};

export const handleStationError = (error: any, stationId: string, orderId?: string) => {
  return ErrorHandler.getInstance().handleError(error, {
    operation: 'station_assignment',
    component: 'StationAssignment',
    stationId,
    orderId
  });
};

export const handleOrderError = (error: any, orderId: string, operation: string) => {
  return ErrorHandler.getInstance().handleError(error, {
    operation,
    component: 'OrderManagement',
    orderId
  });
};

export default ErrorHandler;