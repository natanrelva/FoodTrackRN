export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryCondition?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
  onMaxAttemptsReached?: (error: any) => void;
}

export interface RetryState {
  attempt: number;
  lastError: any;
  isRetrying: boolean;
  nextRetryAt: Date | null;
}

export class RetryManager {
  private static instance: RetryManager;
  private activeRetries = new Map<string, RetryState>();

  static getInstance(): RetryManager {
    if (!RetryManager.instance) {
      RetryManager.instance = new RetryManager();
    }
    return RetryManager.instance;
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationId: string,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    const config: RetryOptions = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffFactor: 2,
      retryCondition: (error) => this.isRetryableError(error),
      ...options
    };

    let attempt = 1;
    let lastError: any;

    while (attempt <= config.maxAttempts) {
      try {
        // Update retry state
        this.updateRetryState(operationId, {
          attempt,
          lastError,
          isRetrying: attempt > 1,
          nextRetryAt: null
        });

        const result = await operation();
        
        // Clear retry state on success
        this.clearRetryState(operationId);
        
        return result;
      } catch (error) {
        lastError = error;
        
        // Check if we should retry
        if (attempt >= config.maxAttempts || !config.retryCondition!(error)) {
          this.clearRetryState(operationId);
          
          if (config.onMaxAttemptsReached) {
            config.onMaxAttemptsReached(error);
          }
          
          throw error;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffFactor, attempt - 1),
          config.maxDelay
        );

        const nextRetryAt = new Date(Date.now() + delay);
        
        // Update retry state
        this.updateRetryState(operationId, {
          attempt,
          lastError: error,
          isRetrying: true,
          nextRetryAt
        });

        // Call retry callback
        if (config.onRetry) {
          config.onRetry(attempt, error);
        }

        console.log(`Retry attempt ${attempt}/${config.maxAttempts} for ${operationId} in ${delay}ms`);
        
        // Wait before retrying
        await this.delay(delay);
        
        attempt++;
      }
    }

    throw lastError;
  }

  private isRetryableError(error: any): boolean {
    // Network errors are generally retryable
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return true;
    }

    // Timeout errors are retryable
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      return true;
    }

    // Server errors (5xx) are retryable
    if (error.status >= 500 && error.status < 600) {
      return true;
    }

    // Rate limiting (429) is retryable
    if (error.status === 429) {
      return true;
    }

    // Specific kitchen system errors that are retryable
    const retryableMessages = [
      'Station temporarily unavailable',
      'System overload',
      'Inventory sync in progress',
      'Connection lost'
    ];

    return retryableMessages.some(msg => 
      error.message && error.message.includes(msg)
    );
  }

  private updateRetryState(operationId: string, state: RetryState): void {
    this.activeRetries.set(operationId, state);
  }

  private clearRetryState(operationId: string): void {
    this.activeRetries.delete(operationId);
  }

  getRetryState(operationId: string): RetryState | null {
    return this.activeRetries.get(operationId) || null;
  }

  getAllActiveRetries(): Map<string, RetryState> {
    return new Map(this.activeRetries);
  }

  cancelRetry(operationId: string): void {
    this.clearRetryState(operationId);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Specialized retry configurations for different kitchen operations
export const RETRY_CONFIGS = {
  ORDER_STATUS_UPDATE: {
    maxAttempts: 5,
    baseDelay: 500,
    maxDelay: 5000,
    backoffFactor: 1.5
  },
  
  INVENTORY_UPDATE: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2
  },
  
  RECIPE_FETCH: {
    maxAttempts: 3,
    baseDelay: 2000,
    maxDelay: 15000,
    backoffFactor: 2
  },
  
  STATION_ASSIGNMENT: {
    maxAttempts: 4,
    baseDelay: 1000,
    maxDelay: 8000,
    backoffFactor: 1.8
  },
  
  QUALITY_REPORT: {
    maxAttempts: 2,
    baseDelay: 2000,
    maxDelay: 10000,
    backoffFactor: 2
  },
  
  WEBSOCKET_RECONNECT: {
    maxAttempts: 10,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 1.5
  }
} as const;

// Utility functions for common retry scenarios
export const retryOrderOperation = async <T>(
  operation: () => Promise<T>,
  orderId: string,
  operationType: string
): Promise<T> => {
  const retryManager = RetryManager.getInstance();
  const operationId = `order_${operationType}_${orderId}`;
  
  return retryManager.executeWithRetry(
    operation,
    operationId,
    {
      ...RETRY_CONFIGS.ORDER_STATUS_UPDATE,
      onRetry: (attempt, error) => {
        console.log(`Retrying ${operationType} for order ${orderId}, attempt ${attempt}:`, error.message);
      },
      onMaxAttemptsReached: (error) => {
        console.error(`Failed to ${operationType} for order ${orderId} after max attempts:`, error);
      }
    }
  );
};

export const retryInventoryOperation = async <T>(
  operation: () => Promise<T>,
  ingredientId: string,
  operationType: string
): Promise<T> => {
  const retryManager = RetryManager.getInstance();
  const operationId = `inventory_${operationType}_${ingredientId}`;
  
  return retryManager.executeWithRetry(
    operation,
    operationId,
    {
      ...RETRY_CONFIGS.INVENTORY_UPDATE,
      onRetry: (attempt, error) => {
        console.log(`Retrying ${operationType} for ingredient ${ingredientId}, attempt ${attempt}:`, error.message);
      }
    }
  );
};

export const retryStationOperation = async <T>(
  operation: () => Promise<T>,
  stationId: string,
  operationType: string
): Promise<T> => {
  const retryManager = RetryManager.getInstance();
  const operationId = `station_${operationType}_${stationId}`;
  
  return retryManager.executeWithRetry(
    operation,
    operationId,
    {
      ...RETRY_CONFIGS.STATION_ASSIGNMENT,
      onRetry: (attempt, error) => {
        console.log(`Retrying ${operationType} for station ${stationId}, attempt ${attempt}:`, error.message);
      }
    }
  );
};

export const retryRecipeOperation = async <T>(
  operation: () => Promise<T>,
  dishId: string
): Promise<T> => {
  const retryManager = RetryManager.getInstance();
  const operationId = `recipe_fetch_${dishId}`;
  
  return retryManager.executeWithRetry(
    operation,
    operationId,
    {
      ...RETRY_CONFIGS.RECIPE_FETCH,
      onRetry: (attempt, error) => {
        console.log(`Retrying recipe fetch for dish ${dishId}, attempt ${attempt}:`, error.message);
      }
    }
  );
};

export default RetryManager;