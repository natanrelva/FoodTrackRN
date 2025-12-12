import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

interface KitchenErrorContext {
  operation?: string;
  orderId?: string;
  stationId?: string;
  ingredientId?: string;
  userId?: string;
  tenantId?: string;
}

class KitchenError extends Error {
  public readonly code: string;
  public readonly severity: 'low' | 'medium' | 'high' | 'critical';
  public readonly category: 'network' | 'validation' | 'permission' | 'system' | 'business';
  public readonly retryable: boolean;
  public readonly context: KitchenErrorContext;
  public readonly userMessage: string;
  public readonly suggestedActions: string[];

  constructor(
    message: string,
    code: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    category: 'network' | 'validation' | 'permission' | 'system' | 'business' = 'system',
    retryable: boolean = false,
    context: KitchenErrorContext = {},
    userMessage?: string,
    suggestedActions: string[] = []
  ) {
    super(message);
    this.name = 'KitchenError';
    this.code = code;
    this.severity = severity;
    this.category = category;
    this.retryable = retryable;
    this.context = context;
    this.userMessage = userMessage || message;
    this.suggestedActions = suggestedActions;
  }
}

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', error);

  // Extract context from request
  const context: KitchenErrorContext = {
    operation: req.method + ' ' + req.path,
    orderId: req.params.orderId || req.body?.orderId,
    stationId: req.params.stationId || req.body?.stationId,
    ingredientId: req.params.ingredientId || req.body?.ingredientId,
    userId: (req as any).user?.id,
    tenantId: (req as any).tenantId
  };

  // Zod validation errors
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: 'Dados inválidos',
      code: 'VALIDATION_FAILED',
      category: 'validation',
      severity: 'low',
      retryable: false,
      userMessage: 'Dados inválidos. Verifique as informações inseridas.',
      suggestedActions: [
        'Verificar dados inseridos',
        'Corrigir campos obrigatórios',
        'Seguir formato esperado'
      ],
      context,
      details: error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      })),
    });
  }

  // Kitchen-specific errors
  if (error instanceof KitchenError) {
    return res.status(getStatusCodeForError(error)).json({
      error: error.message,
      code: error.code,
      category: error.category,
      severity: error.severity,
      retryable: error.retryable,
      userMessage: error.userMessage,
      suggestedActions: error.suggestedActions,
      context: error.context,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    });
  }

  // Database errors
  if (error.code === '23505') { // Unique constraint violation
    return res.status(409).json({
      error: 'Recurso já existe',
      code: 'DUPLICATE_RESOURCE',
      category: 'business',
      severity: 'medium',
      retryable: false,
      userMessage: 'Um registro com estes dados já existe no sistema',
      suggestedActions: [
        'Verificar se o recurso já foi criado',
        'Usar dados únicos',
        'Atualizar recurso existente se necessário'
      ],
      context
    });
  }

  if (error.code === '23503') { // Foreign key constraint violation
    return res.status(400).json({
      error: 'Referência inválida',
      code: 'INVALID_REFERENCE',
      category: 'business',
      severity: 'medium',
      retryable: false,
      userMessage: 'O recurso referenciado não existe',
      suggestedActions: [
        'Verificar se o recurso referenciado existe',
        'Criar recurso dependente primeiro',
        'Verificar IDs fornecidos'
      ],
      context
    });
  }

  // Network/timeout errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    return res.status(503).json({
      error: 'Serviço temporariamente indisponível',
      code: 'SERVICE_UNAVAILABLE',
      category: 'network',
      severity: 'high',
      retryable: true,
      userMessage: 'Serviço temporariamente indisponível. Tente novamente em alguns momentos.',
      suggestedActions: [
        'Aguardar alguns segundos',
        'Tentar novamente',
        'Verificar conectividade'
      ],
      context
    });
  }

  // Authentication errors
  if (error.status === 401 || error.message.includes('Unauthorized')) {
    return res.status(401).json({
      error: 'Não autorizado',
      code: 'UNAUTHORIZED',
      category: 'permission',
      severity: 'high',
      retryable: false,
      userMessage: 'Sessão expirada. Faça login novamente.',
      suggestedActions: [
        'Fazer login novamente',
        'Verificar credenciais',
        'Contatar administrador se problema persistir'
      ],
      context
    });
  }

  // Rate limiting
  if (error.status === 429) {
    return res.status(429).json({
      error: 'Muitas requisições',
      code: 'RATE_LIMITED',
      category: 'system',
      severity: 'medium',
      retryable: true,
      userMessage: 'Muitas requisições. Aguarde um momento antes de tentar novamente.',
      suggestedActions: [
        'Aguardar alguns segundos',
        'Reduzir frequência de requisições',
        'Tentar novamente mais tarde'
      ],
      context
    });
  }

  // Default error
  const status = error.status || 500;
  res.status(status).json({
    error: error.message || 'Erro interno do servidor',
    code: 'INTERNAL_ERROR',
    category: 'system',
    severity: status >= 500 ? 'critical' : 'medium',
    retryable: status >= 500,
    userMessage: status >= 500 
      ? 'Erro interno do servidor. Nossa equipe foi notificada.'
      : error.message || 'Erro inesperado',
    suggestedActions: status >= 500 
      ? [
          'Tentar novamente em alguns minutos',
          'Contatar suporte se problema persistir',
          'Verificar se dados foram salvos corretamente'
        ]
      : [
          'Verificar dados da requisição',
          'Tentar novamente',
          'Contatar suporte se necessário'
        ],
    context,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
};

function getStatusCodeForError(error: KitchenError): number {
  switch (error.category) {
    case 'validation':
      return 400;
    case 'permission':
      return error.code === 'UNAUTHORIZED' ? 401 : 403;
    case 'business':
      return error.severity === 'critical' ? 422 : 400;
    case 'network':
      return 503;
    case 'system':
    default:
      return error.severity === 'critical' ? 500 : 400;
  }
}

// Kitchen-specific error creators
export const createRecipeError = (message: string, dishId: string, retryable = false) => {
  return new KitchenError(
    message,
    'RECIPE_ERROR',
    'high',
    'business',
    retryable,
    { operation: 'recipe_lookup', orderId: dishId },
    'Erro na receita. Verifique o prato selecionado.',
    [
      'Verificar se o prato existe no cardápio',
      'Contatar gerência para atualizar receitas',
      'Usar receita alternativa se disponível'
    ]
  );
};

export const createInventoryError = (message: string, ingredientId: string, retryable = false) => {
  return new KitchenError(
    message,
    'INVENTORY_ERROR',
    'high',
    'business',
    retryable,
    { operation: 'inventory_check', ingredientId },
    'Problema no estoque. Verifique disponibilidade.',
    [
      'Verificar estoque físico',
      'Usar ingrediente substituto',
      'Solicitar reposição urgente'
    ]
  );
};

export const createStationError = (message: string, stationId: string, retryable = true) => {
  return new KitchenError(
    message,
    'STATION_ERROR',
    'medium',
    'system',
    retryable,
    { operation: 'station_assignment', stationId },
    'Problema na estação. Tentando alternativa.',
    [
      'Tentar estação alternativa',
      'Verificar status do equipamento',
      'Redistribuir carga de trabalho'
    ]
  );
};

export { KitchenError };