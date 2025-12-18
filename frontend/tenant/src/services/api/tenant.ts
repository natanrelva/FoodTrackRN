import type {
  Product,
  Order,
  CreateProductRequest,
  UpdateProductRequest,
  OrderFilters,
  PaginatedOrders,
  OrderMetrics,
  UpdateOrderStatusRequest,
  Category
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
    role: string;
    tenantId: string;
  };
}

interface LoginRequest {
  email: string;
  password: string;
}

interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  averageTicket: number;
  ordersToday: number;
  revenueToday: number;
  ordersByStatus: Record<string, number>;
  recentOrders: Order[];
  topProducts: Array<{
    product: Product;
    quantity: number;
    revenue: number;
  }>;
}

class TenantApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem('tenantAuthToken');
  }

  setAuthToken(token: string) {
    this.token = token;
    localStorage.setItem('tenantAuthToken', token);
  }

  clearAuthToken() {
    this.token = null;
    localStorage.removeItem('tenantAuthToken');
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
  async login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/tenant/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async refreshToken(refreshToken: string): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/tenant/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  async logout(): Promise<ApiResponse<void>> {
    const result = await this.request<void>('/tenant/auth/logout', {
      method: 'POST',
    });
    this.clearAuthToken();
    return result;
  }

  // Dashboard API
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    return this.request<DashboardStats>('/tenant/dashboard/stats');
  }

  async getOrderMetrics(
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<ApiResponse<OrderMetrics>> {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom.toISOString());
    if (dateTo) params.append('dateTo', dateTo.toISOString());
    
    const endpoint = `/tenant/dashboard/metrics${params.toString() ? `?${params.toString()}` : ''}`;
    return this.request<OrderMetrics>(endpoint);
  }

  // Order Management API
  async getOrders(filters?: Partial<OrderFilters>): Promise<ApiResponse<PaginatedOrders>> {
    const params = new URLSearchParams();
    
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
    
    const endpoint = `/tenant/orders${params.toString() ? `?${params.toString()}` : ''}`;
    return this.request<PaginatedOrders>(endpoint);
  }

  async getOrder(orderId: string): Promise<ApiResponse<Order>> {
    return this.request<Order>(`/tenant/orders/${orderId}`);
  }

  async updateOrderStatus(
    orderId: string,
    statusData: UpdateOrderStatusRequest
  ): Promise<ApiResponse<Order>> {
    return this.request<Order>(`/tenant/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify(statusData),
    });
  }

  async cancelOrder(orderId: string, reason?: string): Promise<ApiResponse<Order>> {
    return this.request<Order>(`/tenant/orders/${orderId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // Product Catalog Management API
  async getProducts(category?: string): Promise<ApiResponse<Product[]>> {
    const params = new URLSearchParams();
    if (category) {
      params.append('category', category);
    }
    
    const endpoint = `/tenant/products${params.toString() ? `?${params.toString()}` : ''}`;
    return this.request<Product[]>(endpoint);
  }

  async getProduct(productId: string): Promise<ApiResponse<Product>> {
    return this.request<Product>(`/tenant/products/${productId}`);
  }

  async createProduct(productData: CreateProductRequest): Promise<ApiResponse<Product>> {
    return this.request<Product>('/tenant/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  }

  async updateProduct(
    productId: string,
    productData: UpdateProductRequest
  ): Promise<ApiResponse<Product>> {
    return this.request<Product>(`/tenant/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(productData),
    });
  }

  async deleteProduct(productId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/tenant/products/${productId}`, {
      method: 'DELETE',
    });
  }

  async toggleProductAvailability(
    productId: string,
    available: boolean
  ): Promise<ApiResponse<Product>> {
    return this.request<Product>(`/tenant/products/${productId}/availability`, {
      method: 'PATCH',
      body: JSON.stringify({ available }),
    });
  }

  // Category Management API
  async getCategories(): Promise<ApiResponse<Category[]>> {
    return this.request<Category[]>('/tenant/categories');
  }

  async createCategory(categoryData: Omit<Category, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Category>> {
    return this.request<Category>('/tenant/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    });
  }

  async updateCategory(
    categoryId: string,
    categoryData: Partial<Omit<Category, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>>
  ): Promise<ApiResponse<Category>> {
    return this.request<Category>(`/tenant/categories/${categoryId}`, {
      method: 'PUT',
      body: JSON.stringify(categoryData),
    });
  }

  async deleteCategory(categoryId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/tenant/categories/${categoryId}`, {
      method: 'DELETE',
    });
  }

  // Analytics API
  async getSalesReport(
    dateFrom: Date,
    dateTo: Date,
    groupBy: 'day' | 'week' | 'month' = 'day'
  ): Promise<ApiResponse<Array<{
    date: string;
    orders: number;
    revenue: number;
    averageTicket: number;
  }>>> {
    const params = new URLSearchParams({
      dateFrom: dateFrom.toISOString(),
      dateTo: dateTo.toISOString(),
      groupBy,
    });
    
    return this.request<Array<{
      date: string;
      orders: number;
      revenue: number;
      averageTicket: number;
    }>>(`/tenant/analytics/sales?${params.toString()}`);
  }

  async getProductPerformance(
    dateFrom: Date,
    dateTo: Date
  ): Promise<ApiResponse<Array<{
    product: Product;
    quantity: number;
    revenue: number;
    averageRating?: number;
  }>>> {
    const params = new URLSearchParams({
      dateFrom: dateFrom.toISOString(),
      dateTo: dateTo.toISOString(),
    });
    
    return this.request<Array<{
      product: Product;
      quantity: number;
      revenue: number;
      averageRating?: number;
    }>>(`/tenant/analytics/products?${params.toString()}`);
  }

  async getCustomerInsights(
    dateFrom: Date,
    dateTo: Date
  ): Promise<ApiResponse<{
    totalCustomers: number;
    newCustomers: number;
    returningCustomers: number;
    averageOrderValue: number;
    topCustomers: Array<{
      customerId: string;
      customerName: string;
      totalOrders: number;
      totalSpent: number;
    }>;
  }>> {
    const params = new URLSearchParams({
      dateFrom: dateFrom.toISOString(),
      dateTo: dateTo.toISOString(),
    });
    
    return this.request<{
      totalCustomers: number;
      newCustomers: number;
      returningCustomers: number;
      averageOrderValue: number;
      topCustomers: Array<{
        customerId: string;
        customerName: string;
        totalOrders: number;
        totalSpent: number;
      }>;
    }>(`/tenant/analytics/customers?${params.toString()}`);
  }

  // Settings API
  async getTenantSettings(): Promise<ApiResponse<{
    businessName: string;
    businessAddress: string;
    businessPhone: string;
    businessEmail: string;
    deliveryFee: number;
    minimumOrderValue: number;
    operatingHours: Array<{
      day: string;
      open: string;
      close: string;
      closed: boolean;
    }>;
    paymentMethods: string[];
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
  }>> {
    return this.request<{
      businessName: string;
      businessAddress: string;
      businessPhone: string;
      businessEmail: string;
      deliveryFee: number;
      minimumOrderValue: number;
      operatingHours: Array<{
        day: string;
        open: string;
        close: string;
        closed: boolean;
      }>;
      paymentMethods: string[];
      notifications: {
        email: boolean;
        sms: boolean;
        push: boolean;
      };
    }>('/tenant/settings');
  }

  async updateTenantSettings(settings: any): Promise<ApiResponse<any>> {
    return this.request<any>('/tenant/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  // WebSocket Token API
  async getWebSocketToken(): Promise<ApiResponse<{ token: string; url: string }>> {
    return this.request<{ token: string; url: string }>('/tenant/websocket/token');
  }
}

// Create and export a singleton instance
export const tenantApi = new TenantApiClient();

// Export the class for testing or custom instances
export { TenantApiClient };

// Helper functions for common operations
export const TenantApiHelpers = {
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

  // Format currency values
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  },

  // Format date for display
  formatDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(dateObj);
  },

  // Calculate percentage change
  calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  },

  // Validate product data
  validateProductData(product: CreateProductRequest | UpdateProductRequest): string[] {
    const errors: string[] = [];
    
    if ('name' in product && (!product.name || product.name.trim().length === 0)) {
      errors.push('Product name is required');
    }
    
    if ('price' in product && (product.price === undefined || product.price <= 0)) {
      errors.push('Product price must be greater than 0');
    }
    
    if ('category' in product && (!product.category || product.category.trim().length === 0)) {
      errors.push('Product category is required');
    }
    
    return errors;
  },

  // Generate order status color
  getOrderStatusColor(status: string): string {
    const statusColors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      preparing: 'bg-orange-100 text-orange-800',
      ready: 'bg-purple-100 text-purple-800',
      delivering: 'bg-indigo-100 text-indigo-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  },
};