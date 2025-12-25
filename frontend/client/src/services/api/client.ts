import type {
  Product,
  Order,
  CreateOrderRequest,
  CustomerInfo,
  CartItem,
  OrderFilters,
  PaginatedOrders
} from '@foodtrack/types';

// Base API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// API Response types
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

interface AuthResponse {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

interface RegisterRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

class ClientApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem('authToken');
  }

  setAuthToken(token: string) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  clearAuthToken() {
    this.token = null;
    localStorage.removeItem('authToken');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}/api${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: response.status.toString(),
            message: data.message || 'Request failed',
            details: data.details,
          },
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network error occurred',
        },
      };
    }
  }

  // Authentication API
  async register(userData: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async refreshToken(refreshToken: string): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  async logout(): Promise<ApiResponse<void>> {
    const result = await this.request<void>('/auth/logout', {
      method: 'POST',
    });
    this.clearAuthToken();
    return result;
  }

  // Product Catalog API
  async getProducts(category?: string): Promise<ApiResponse<Product[]>> {
    const params = new URLSearchParams();
    if (category) {
      params.append('category', category);
    }
    
    const endpoint = `/products${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await this.request<{ products: Product[]; total: number; page: number; limit: number; totalPages: number }>(endpoint);
    
    // Extract products array from the paginated response
    if (response.success && response.data) {
      return {
        success: true,
        data: response.data.products,
      };
    }
    
    return response as ApiResponse<Product[]>;
  }

  async getProduct(productId: string): Promise<ApiResponse<Product>> {
    return this.request<Product>(`/products/${productId}`);
  }

  async getCategories(): Promise<ApiResponse<string[]>> {
    return this.request<string[]>('/products/categories');
  }

  // Order Management API
  async createOrder(orderData: CreateOrderRequest): Promise<ApiResponse<Order>> {
    return this.request<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  async getOrder(orderId: string): Promise<ApiResponse<Order>> {
    return this.request<Order>(`/orders/${orderId}`);
  }

  async getCustomerOrders(
    customerId: string,
    filters?: Partial<OrderFilters>
  ): Promise<ApiResponse<PaginatedOrders>> {
    const params = new URLSearchParams();
    params.append('customerId', customerId);
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v.toString()));
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }
    
    const endpoint = `/orders?${params.toString()}`;
    return this.request<PaginatedOrders>(endpoint);
  }

  // Customer Management API
  async createCustomer(customerData: Omit<CustomerInfo, 'id'>): Promise<ApiResponse<CustomerInfo>> {
    return this.request<CustomerInfo>('/customers', {
      method: 'POST',
      body: JSON.stringify(customerData),
    });
  }

  async getCustomer(customerId: string): Promise<ApiResponse<CustomerInfo>> {
    return this.request<CustomerInfo>(`/customers/${customerId}`);
  }

  async updateCustomer(
    customerId: string,
    customerData: Partial<Omit<CustomerInfo, 'id'>>
  ): Promise<ApiResponse<CustomerInfo>> {
    return this.request<CustomerInfo>(`/customers/${customerId}`, {
      method: 'PUT',
      body: JSON.stringify(customerData),
    });
  }

  // Cart Validation API
  async validateCart(cartItems: CartItem[]): Promise<ApiResponse<{
    valid: boolean;
    errors: string[];
    updatedItems: CartItem[];
  }>> {
    return this.request<{
      valid: boolean;
      errors: string[];
      updatedItems: CartItem[];
    }>('/cart/validate', {
      method: 'POST',
      body: JSON.stringify({ items: cartItems }),
    });
  }

  // WebSocket Token API
  async getWebSocketToken(): Promise<ApiResponse<{ token: string; url: string }>> {
    return this.request<{ token: string; url: string }>('/websocket/token');
  }
}

// Create and export a singleton instance
export const clientApi = new ClientApiClient();

// Export the class for testing or custom instances
export { ClientApiClient };

// Helper functions for common operations
export const ClientApiHelpers = {
  // Format API errors for display
  formatError(error: ApiResponse<any>['error']): string {
    if (!error) return 'Unknown error occurred';
    return error.message || `Error ${error.code}`;
  },

  // Check if response is successful and has data
  isSuccessWithData<T>(response: ApiResponse<T>): response is ApiResponse<T> & { data: T } {
    return response.success && response.data !== undefined;
  },

  // Extract data from successful response or throw error
  unwrapResponse<T>(response: ApiResponse<T>): T {
    if (this.isSuccessWithData(response)) {
      return response.data;
    }
    throw new Error(this.formatError(response.error));
  },

  // Retry logic for failed requests
  async withRetry<T>(
    operation: () => Promise<ApiResponse<T>>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<ApiResponse<T>> {
    let lastError: ApiResponse<T>['error'];
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await operation();
      
      if (result.success) {
        return result;
      }
      
      lastError = result.error;
      
      // Don't retry on client errors (4xx)
      if (result.error?.code.startsWith('4')) {
        break;
      }
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
    
    return {
      success: false,
      error: lastError || { code: 'RETRY_FAILED', message: 'All retry attempts failed' },
    };
  },

  // Convert CartItem to CreateOrderItemRequest
  cartItemToOrderItem(cartItem: CartItem) {
    return {
      productId: cartItem.productId,
      quantity: cartItem.quantity,
      extras: cartItem.extras.map(extra => extra.id),
      modifications: cartItem.modifications,
      notes: cartItem.notes,
    };
  },

  // Calculate cart total
  calculateCartTotal(cartItems: CartItem[]): number {
    return cartItems.reduce((total, item) => {
      const itemPrice = item.price * item.quantity;
      const extrasPrice = item.extras.reduce((sum, extra) => sum + extra.price, 0) * item.quantity;
      return total + itemPrice + extrasPrice;
    }, 0);
  },

  // Validate email format
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Validate phone format (Brazilian format)
  isValidPhone(phone: string): boolean {
    const phoneRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;
    return phoneRegex.test(phone);
  },

  // Format phone number
  formatPhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    } else if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  },
};