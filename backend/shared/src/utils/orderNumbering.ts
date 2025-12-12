/**
 * Order Numbering Utilities
 * 
 * Provides utilities for managing order numbers including validation,
 * formatting, and sequence management.
 */

export class OrderNumberingUtils {
  /**
   * Validates if a string is a valid order number format
   * Expected format: #1001, #1002, etc.
   */
  static isValidOrderNumber(orderNumber: string): boolean {
    const orderNumberRegex = /^#\d{4,}$/;
    return orderNumberRegex.test(orderNumber);
  }

  /**
   * Extracts the numeric part from an order number
   * Example: "#1001" -> 1001
   */
  static extractOrderSequence(orderNumber: string): number | null {
    if (!this.isValidOrderNumber(orderNumber)) {
      return null;
    }
    
    const numericPart = orderNumber.substring(1);
    return parseInt(numericPart, 10);
  }

  /**
   * Formats a sequence number into an order number
   * Example: 1001 -> "#1001"
   */
  static formatOrderNumber(sequence: number): string {
    if (sequence < 1) {
      throw new Error('Order sequence must be positive');
    }
    
    return `#${sequence}`;
  }

  /**
   * Validates order number format and throws descriptive error
   */
  static validateOrderNumber(orderNumber: string): void {
    if (!orderNumber) {
      throw new Error('Order number is required');
    }

    if (!this.isValidOrderNumber(orderNumber)) {
      throw new Error('Invalid order number format. Expected format: #1001');
    }

    const sequence = this.extractOrderSequence(orderNumber);
    if (!sequence || sequence < 1001) {
      throw new Error('Order number sequence must be 1001 or higher');
    }
  }

  /**
   * Generates a sequence name for database sequences based on tenant ID
   */
  static generateSequenceName(tenantId: string): string {
    // Replace hyphens with underscores for valid PostgreSQL identifier
    const cleanTenantId = tenantId.replace(/-/g, '_');
    return `order_seq_${cleanTenantId}`;
  }

  /**
   * Validates tenant ID format for sequence generation
   */
  static validateTenantId(tenantId: string): void {
    if (!tenantId) {
      throw new Error('Tenant ID is required for order numbering');
    }

    // Basic UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tenantId)) {
      throw new Error('Invalid tenant ID format');
    }
  }

  /**
   * Compares two order numbers and returns comparison result
   * Returns: -1 if first < second, 0 if equal, 1 if first > second
   */
  static compareOrderNumbers(orderNumber1: string, orderNumber2: string): number {
    this.validateOrderNumber(orderNumber1);
    this.validateOrderNumber(orderNumber2);

    const seq1 = this.extractOrderSequence(orderNumber1)!;
    const seq2 = this.extractOrderSequence(orderNumber2)!;

    if (seq1 < seq2) return -1;
    if (seq1 > seq2) return 1;
    return 0;
  }

  /**
   * Gets the next expected order number given the current one
   */
  static getNextOrderNumber(currentOrderNumber: string): string {
    this.validateOrderNumber(currentOrderNumber);
    
    const currentSequence = this.extractOrderSequence(currentOrderNumber)!;
    return this.formatOrderNumber(currentSequence + 1);
  }

  /**
   * Gets the previous order number given the current one
   */
  static getPreviousOrderNumber(currentOrderNumber: string): string {
    this.validateOrderNumber(currentOrderNumber);
    
    const currentSequence = this.extractOrderSequence(currentOrderNumber)!;
    if (currentSequence <= 1001) {
      throw new Error('Cannot get previous order number for the first order');
    }
    
    return this.formatOrderNumber(currentSequence - 1);
  }

  /**
   * Checks if an order number is within a valid range
   */
  static isOrderNumberInRange(orderNumber: string, minSequence: number = 1001, maxSequence: number = 999999): boolean {
    if (!this.isValidOrderNumber(orderNumber)) {
      return false;
    }

    const sequence = this.extractOrderSequence(orderNumber);
    return sequence !== null && sequence >= minSequence && sequence <= maxSequence;
  }
}

/**
 * Error classes for order numbering
 */
export class OrderNumberingError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'OrderNumberingError';
  }
}

export class OrderNumberConflictError extends OrderNumberingError {
  constructor(orderNumber: string) {
    super(`Order number ${orderNumber} already exists`, 'ORDER_NUMBER_CONFLICT');
  }
}

export class InvalidOrderNumberError extends OrderNumberingError {
  constructor(orderNumber: string) {
    super(`Invalid order number format: ${orderNumber}`, 'INVALID_ORDER_NUMBER');
  }
}

export class SequenceGenerationError extends OrderNumberingError {
  constructor(tenantId: string, originalError?: Error) {
    super(
      `Failed to generate order sequence for tenant ${tenantId}: ${originalError?.message || 'Unknown error'}`,
      'SEQUENCE_GENERATION_ERROR'
    );
  }
}