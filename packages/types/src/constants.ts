// Shared Constants for FoodTrack Integration System

// API Configuration
export const API_CONFIG = {
  VERSION: 'v1',
  BASE_PATH: '/api/v1',
  TIMEOUT: 30000, // 30 seconds
  MAX_RETRIES: 3,
} as const;

// WebSocket Configuration
export const WEBSOCKET_CONFIG = {
  RECONNECT_INTERVAL: 5000, // 5 seconds
  MAX_RECONNECT_ATTEMPTS: 10,
  HEARTBEAT_INTERVAL: 30000, // 30 seconds
  CONNECTION_TIMEOUT: 10000, // 10 seconds
} as const;

// Pagination Defaults
export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// Order Configuration
export const ORDER_CONFIG = {
  MAX_ITEMS_PER_ORDER: 50,
  MIN_ORDER_AMOUNT: 0.01,
  MAX_ORDER_AMOUNT: 10000,
  DEFAULT_PREPARATION_TIME: 30, // minutes
  MAX_PREPARATION_TIME: 180, // minutes
} as const;

// Product Configuration
export const PRODUCT_CONFIG = {
  MAX_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
  MIN_PRICE: 0.01,
  MAX_PRICE: 1000,
  MAX_EXTRAS_PER_PRODUCT: 20,
} as const;

// User Configuration
export const USER_CONFIG = {
  MIN_PASSWORD_LENGTH: 6,
  MAX_PASSWORD_LENGTH: 128,
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
  REFRESH_TOKEN_EXPIRY: 7 * 24 * 60 * 60 * 1000, // 7 days
} as const;

// File Upload Configuration
export const FILE_UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'text/plain'],
} as const;

// Validation Patterns
export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[\d\s\-\(\)]+$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  ZIP_CODE: /^\d{5}-?\d{3}$/,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
} as const;

// Error Codes
export const ERROR_CODES = {
  // Authentication Errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',

  // Validation Errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',

  // Business Logic Errors
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  INVALID_ORDER_STATUS: 'INVALID_ORDER_STATUS',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  CUSTOMER_NOT_FOUND: 'CUSTOMER_NOT_FOUND',

  // System Errors
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',

  // Multi-tenant Errors
  TENANT_NOT_FOUND: 'TENANT_NOT_FOUND',
  CROSS_TENANT_ACCESS: 'CROSS_TENANT_ACCESS',
  TENANT_SUSPENDED: 'TENANT_SUSPENDED',

  // WebSocket Errors
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  MESSAGE_INVALID: 'MESSAGE_INVALID',
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Cache Keys
export const CACHE_KEYS = {
  USER_SESSION: (userId: string) => `user:session:${userId}`,
  TENANT_CONFIG: (tenantId: string) => `tenant:config:${tenantId}`,
  PRODUCT_CATALOG: (tenantId: string) => `product:catalog:${tenantId}`,
  ORDER_METRICS: (tenantId: string) => `order:metrics:${tenantId}`,
  WEBSOCKET_ROOMS: (tenantId: string) => `ws:rooms:${tenantId}`,
} as const;

// Cache TTL (Time To Live) in seconds
export const CACHE_TTL = {
  SHORT: 300, // 5 minutes
  MEDIUM: 1800, // 30 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
} as const;

// Event Types for Analytics
export const ANALYTICS_EVENTS = {
  ORDER_CREATED: 'order_created',
  ORDER_COMPLETED: 'order_completed',
  ORDER_CANCELLED: 'order_cancelled',
  PRODUCT_VIEWED: 'product_viewed',
  PRODUCT_ADDED_TO_CART: 'product_added_to_cart',
  USER_REGISTERED: 'user_registered',
  USER_LOGIN: 'user_login',
  PAYMENT_COMPLETED: 'payment_completed',
  DELIVERY_COMPLETED: 'delivery_completed',
} as const;

// Notification Types
export const NOTIFICATION_TYPES = {
  ORDER_CONFIRMATION: 'order_confirmation',
  ORDER_STATUS_UPDATE: 'order_status_update',
  PAYMENT_CONFIRMATION: 'payment_confirmation',
  DELIVERY_UPDATE: 'delivery_update',
  SYSTEM_ALERT: 'system_alert',
  MARKETING: 'marketing',
} as const;

// Default Values
export const DEFAULTS = {
  CURRENCY: 'BRL',
  LANGUAGE: 'pt-BR',
  TIMEZONE: 'America/Sao_Paulo',
  DATE_FORMAT: 'DD/MM/YYYY',
  TIME_FORMAT: 'HH:mm',
  DECIMAL_PLACES: 2,
} as const;

// Feature Flags
export const FEATURE_FLAGS = {
  ENABLE_WEBSOCKETS: true,
  ENABLE_PUSH_NOTIFICATIONS: true,
  ENABLE_ANALYTICS: true,
  ENABLE_CACHING: true,
  ENABLE_RATE_LIMITING: true,
  ENABLE_AUDIT_LOGS: true,
} as const;

// Rate Limiting
export const RATE_LIMITS = {
  API_REQUESTS_PER_MINUTE: 100,
  LOGIN_ATTEMPTS_PER_HOUR: 5,
  ORDER_CREATION_PER_MINUTE: 10,
  WEBSOCKET_MESSAGES_PER_SECOND: 10,
} as const;

// Database Configuration
export const DATABASE_CONFIG = {
  CONNECTION_POOL_MIN: 2,
  CONNECTION_POOL_MAX: 10,
  QUERY_TIMEOUT: 30000, // 30 seconds
  IDLE_TIMEOUT: 300000, // 5 minutes
} as const;

// Monitoring and Health Check
export const HEALTH_CHECK = {
  INTERVAL: 30000, // 30 seconds
  TIMEOUT: 5000, // 5 seconds
  ENDPOINTS: {
    DATABASE: '/health/database',
    REDIS: '/health/redis',
    WEBSOCKET: '/health/websocket',
    OVERALL: '/health',
  },
} as const;

// Application Ports (for development)
export const APP_PORTS = {
  API_GATEWAY: 4000,
  CLIENT_APP: 3000,
  TENANT_APP: 3001,
  KITCHEN_APP: 3002,
  DELIVERY_APP: 3003,
  POSTGRES: 5432,
  REDIS: 6379,
  ADMINER: 8082,
} as const;

// Environment Types
export const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production',
  TEST: 'test',
} as const;

// Log Levels
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
  TRACE: 'trace',
} as const;