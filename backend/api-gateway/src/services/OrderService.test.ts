import { 
  OrderValidationUtils, 
  OrderStatus, 
  CreateOrderRequest, 
  ChannelType,
  Order,
  OrderFilters,
  PaginatedOrders
} from '@foodtrack/backend-shared';
import * as fc from 'fast-check';
import { OrderService } from './OrderService';

// Mock the repositories
jest.mock('../repositories/OrderRepository');
jest.mock('../repositories/CustomerRepository');
jest.mock('../repositories/ProductRepository');
jest.mock('../repositories/AuditRepository');

// Simple test to verify order status management functionality
describe('Order Status Management', () => {
  test('should validate status transitions correctly', () => {
    // Valid transitions
    expect(OrderValidationUtils.isValidStatusTransition('pending', 'confirmed')).toBe(true);
    expect(OrderValidationUtils.isValidStatusTransition('confirmed', 'preparing')).toBe(true);
    expect(OrderValidationUtils.isValidStatusTransition('preparing', 'ready')).toBe(true);
    expect(OrderValidationUtils.isValidStatusTransition('ready', 'delivered')).toBe(true);
    expect(OrderValidationUtils.isValidStatusTransition('ready', 'delivering')).toBe(true);
    expect(OrderValidationUtils.isValidStatusTransition('delivering', 'delivered')).toBe(true);
    
    // Invalid transitions
    expect(OrderValidationUtils.isValidStatusTransition('pending', 'ready')).toBe(false);
    expect(OrderValidationUtils.isValidStatusTransition('delivered', 'preparing')).toBe(false);
    expect(OrderValidationUtils.isValidStatusTransition('cancelled', 'confirmed')).toBe(false);
    
    // Cancellation allowed from most states
    expect(OrderValidationUtils.isValidStatusTransition('pending', 'cancelled')).toBe(true);
    expect(OrderValidationUtils.isValidStatusTransition('confirmed', 'cancelled')).toBe(true);
    expect(OrderValidationUtils.isValidStatusTransition('preparing', 'cancelled')).toBe(true);
    expect(OrderValidationUtils.isValidStatusTransition('ready', 'cancelled')).toBe(true);
    expect(OrderValidationUtils.isValidStatusTransition('delivering', 'cancelled')).toBe(true);
    
    // Terminal states cannot transition
    expect(OrderValidationUtils.isValidStatusTransition('delivered', 'cancelled')).toBe(false);
    expect(OrderValidationUtils.isValidStatusTransition('cancelled', 'delivered')).toBe(false);
  });

  test('should validate status transition with proper error messages', () => {
    const validResult = OrderValidationUtils.validateStatusTransition('pending', 'confirmed');
    expect(validResult.isValid).toBe(true);
    expect(validResult.errors).toHaveLength(0);

    const invalidResult = OrderValidationUtils.validateStatusTransition('delivered', 'preparing');
    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.errors).toContain('Invalid status transition from delivered to preparing');
  });

  test('should validate order status enum values', () => {
    const validStatuses: OrderStatus[] = [
      'pending', 'confirmed', 'preparing', 'ready', 'delivering', 'delivered', 'cancelled'
    ];

    validStatuses.forEach(status => {
      const result = OrderValidationUtils.validateOrderStatus(status);
      expect(result.isValid).toBe(true);
    });

    const invalidResult = OrderValidationUtils.validateOrderStatus('invalid_status');
    expect(invalidResult.isValid).toBe(false);
  });
});

// **Feature: order-management, Property 1: Order Creation Integrity**
describe('Property 1: Order Creation Integrity', () => {
  let orderService: OrderService;
  let mockOrderRepository: any;
  let mockCustomerRepository: any;
  let mockProductRepository: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create service instance
    orderService = new OrderService();
    
    // Get mock instances - these are the actual mock instances created by Jest
    mockOrderRepository = (orderService as any).orderRepository;
    mockCustomerRepository = (orderService as any).customerRepository;
    mockProductRepository = (orderService as any).productRepository;
  });

  // Property test generators
  const generateValidCreateOrderRequest = (): fc.Arbitrary<CreateOrderRequest> => {
    return fc.record({
      customerId: fc.uuid(),
      items: fc.array(
        fc.record({
          productId: fc.uuid(),
          quantity: fc.integer({ min: 1, max: 10 }),
          extras: fc.array(fc.constantFrom('Extra Cheese', 'Extra Sauce'), { maxLength: 2 }),
          notes: fc.option(fc.string({ maxLength: 100 }), { nil: undefined })
        }),
        { minLength: 1, maxLength: 5 }
      ),
      channel: fc.constantFrom('whatsapp', 'instagram', 'website', 'ifood', 'uber_eats', 'rappi') as fc.Arbitrary<ChannelType>,
      delivery: fc.record({
        type: fc.constantFrom('pickup', 'delivery'),
        fee: fc.float({ min: 0, max: 50, noNaN: true }),
        estimatedTime: fc.option(fc.integer({ min: 15, max: 120 }), { nil: undefined }),
        instructions: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
        address: fc.option(
          fc.record({
            street: fc.string({ minLength: 1, maxLength: 100 }),
            number: fc.string({ minLength: 1, maxLength: 10 }),
            complement: fc.option(fc.string({ maxLength: 50 }), { nil: undefined }),
            neighborhood: fc.string({ minLength: 1, maxLength: 50 }),
            city: fc.string({ minLength: 1, maxLength: 50 }),
            state: fc.string({ minLength: 2, maxLength: 2 }),
            zipCode: fc.string({ minLength: 8, maxLength: 9 })
          }),
          { nil: undefined }
        )
      }),
      notes: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
      couponCode: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined })
    });
  };

  const generateTenantId = (): fc.Arbitrary<string> => fc.uuid();

  // Mock data generators
  const generateMockCustomer = (customerId: string) => ({
    id: customerId,
    name: 'Test Customer',
    email: 'test@example.com',
    phone: '+1234567890',
    tenantId: 'test-tenant'
  });

  const generateMockProduct = (productId: string) => ({
    id: productId,
    name: 'Test Product',
    description: 'Test Description',
    price: 10.99,
    active: true,
    stock: 100,
    extras: [
      { name: 'Extra Cheese', price: 2.50 },
      { name: 'Extra Sauce', price: 1.00 }
    ]
  });

  const generateMockOrder = (orderData: any, tenantId: string) => ({
    id: fc.sample(fc.uuid(), 1)[0],
    number: '#1001',
    tenantId,
    customerId: orderData.customerId,
    customer: generateMockCustomer(orderData.customerId),
    items: orderData.items.map((item: any) => ({
      id: fc.sample(fc.uuid(), 1)[0],
      productId: item.productId,
      name: 'Test Product',
      description: 'Test Description',
      price: 10.99,
      quantity: item.quantity,
      extras: item.extras.map((extraName: string) => ({
        name: extraName,
        price: 2.50
      })),
      notes: item.notes
    })),
    status: 'pending' as OrderStatus,
    channel: orderData.channel,
    payment: {
      method: 'pix' as const,
      status: 'pending' as const,
      amount: 50.00
    },
    delivery: orderData.delivery,
    subtotal: 45.00,
    deliveryFee: orderData.delivery.fee,
    discount: 0,
    total: 45.00 + orderData.delivery.fee,
    notes: orderData.notes,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  /**
   * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**
   * 
   * Property: For any valid order creation request, the system should:
   * - Create an order with unique sequential number (1.1, 1.3)
   * - Validate all required fields including customer information, items, and payment details (1.2)
   * - Persist complete data immediately (1.4)
   * - Verify product availability (1.5)
   */
  test('should maintain order creation integrity for all valid inputs', async () => {
    await fc.assert(
      fc.asyncProperty(
        generateValidCreateOrderRequest(),
        generateTenantId(),
        async (orderRequest: CreateOrderRequest, tenantId: string) => {
          // Setup mocks for this test case
          const mockCustomer = generateMockCustomer(orderRequest.customerId);
          const mockProducts = orderRequest.items.map(item => generateMockProduct(item.productId));
          const mockOrder = generateMockOrder(orderRequest, tenantId);

          // Mock repository responses
          mockCustomerRepository.findById = jest.fn().mockResolvedValue(mockCustomer);
          
          // Mock product repository to return valid products for each item
          mockProductRepository.findById = jest.fn().mockImplementation((productId: string) => {
            const product = mockProducts.find(p => p.id === productId);
            return Promise.resolve(product);
          });

          // Mock order repository to return created order with sequential number
          mockOrderRepository.createWithAutoNumber = jest.fn().mockResolvedValue(mockOrder);
          mockOrderRepository.generateOrderNumber = jest.fn().mockResolvedValue('#1001');

          // Execute the order creation
          const result = await orderService.createOrder(orderRequest, tenantId);

          // Verify order creation integrity properties
          
          // 1.1 & 1.3: Order created with unique sequential number
          expect(result).toBeDefined();
          expect(result.number).toBeDefined();
          expect(result.number).toMatch(/^#\d+$/); // Sequential number format
          expect(result.tenantId).toBe(tenantId);

          // 1.2: All required fields validated and present
          expect(result.customerId).toBe(orderRequest.customerId);
          expect(result.customer).toBeDefined();
          expect(result.items).toHaveLength(orderRequest.items.length);
          expect(result.channel).toBe(orderRequest.channel);
          expect(result.payment).toBeDefined();
          expect(result.delivery).toBeDefined();
          expect(result.status).toBe('pending');

          // 1.4: Complete data persistence (verified by repository call)
          expect(mockOrderRepository.createWithAutoNumber).toHaveBeenCalledTimes(1);
          const persistedData = mockOrderRepository.createWithAutoNumber.mock.calls[0][0];
          expect(persistedData.tenantId).toBe(tenantId);
          expect(persistedData.customerId).toBe(orderRequest.customerId);
          expect(persistedData.items).toHaveLength(orderRequest.items.length);

          // 1.5: Product validation occurred
          expect(mockProductRepository.findById).toHaveBeenCalledTimes(orderRequest.items.length);
          orderRequest.items.forEach(item => {
            expect(mockProductRepository.findById).toHaveBeenCalledWith(item.productId, tenantId);
          });

          // Additional integrity checks
          expect(result.subtotal).toBeGreaterThanOrEqual(0);
          expect(result.total).toBeGreaterThanOrEqual(0);
          expect(result.deliveryFee).toBeGreaterThanOrEqual(0);
          expect(result.discount).toBeGreaterThanOrEqual(0);
          expect(result.createdAt).toBeDefined();
          expect(result.updatedAt).toBeDefined();
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design
    );
  });
});

// **Feature: order-management, Property 3: Data Retrieval Completeness**
describe('Property 3: Data Retrieval Completeness', () => {
  let orderService: OrderService;
  let mockOrderRepository: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create service instance
    orderService = new OrderService();
    
    // Get mock instances
    mockOrderRepository = (orderService as any).orderRepository;
  });

  // Property test generators
  const generateOrderFilters = (): fc.Arbitrary<Partial<OrderFilters>> => {
    return fc.record({
      status: fc.option(
        fc.array(fc.constantFrom('pending', 'confirmed', 'preparing', 'ready', 'delivering', 'delivered', 'cancelled') as fc.Arbitrary<OrderStatus>, { minLength: 1, maxLength: 3 }),
        { nil: undefined }
      ),
      channel: fc.option(
        fc.array(fc.constantFrom('whatsapp', 'instagram', 'website', 'ifood', 'uber_eats', 'rappi') as fc.Arbitrary<ChannelType>, { minLength: 1, maxLength: 3 }),
        { nil: undefined }
      ),
      dateFrom: fc.option(fc.date({ min: new Date('2023-01-01'), max: new Date('2024-12-31') }).filter(d => !isNaN(d.getTime())), { nil: undefined }),
      dateTo: fc.option(fc.date({ min: new Date('2023-01-01'), max: new Date('2024-12-31') }).filter(d => !isNaN(d.getTime())), { nil: undefined }),
      customerId: fc.option(fc.uuid(), { nil: undefined }),
      search: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
      // page and limit should not be undefined since they have defaults in the schema
      page: fc.option(fc.integer({ min: 1, max: 10 }), { nil: undefined }),
      limit: fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined })
    }, { requiredKeys: [] });
  };

  const generateMockOrders = (count: number, tenantId: string, filters?: Partial<OrderFilters>): Order[] => {
    const orders: Order[] = [];
    
    for (let i = 0; i < count; i++) {
      const order: Order = {
        id: fc.sample(fc.uuid(), 1)[0],
        tenantId: tenantId,
        number: `#${1001 + i}`,
        customerId: fc.sample(fc.uuid(), 1)[0],
        customer: {
          id: fc.sample(fc.uuid(), 1)[0],
          name: `Customer ${i + 1}`,
          email: `customer${i + 1}@example.com`,
          phone: `+123456789${i}`
        },
        items: [{
          id: fc.sample(fc.uuid(), 1)[0],
          productId: fc.sample(fc.uuid(), 1)[0],
          name: `Product ${i + 1}`,
          description: `Description ${i + 1}`,
          price: 10.99 + i,
          quantity: 1 + (i % 3),
          extras: [],
          preparationTime: 15 + (i % 10)
        }],
        status: filters?.status?.[0] || (['pending', 'confirmed', 'preparing', 'ready'] as OrderStatus[])[i % 4],
        channel: filters?.channel?.[0] || (['whatsapp', 'website', 'ifood'] as ChannelType[])[i % 3],
        payment: {
          method: 'pix',
          status: 'confirmed',
          amount: 15.99 + i
        },
        delivery: {
          type: 'delivery',
          fee: 5.00,
          estimatedTime: 30 + (i % 20),
          address: {
            street: `Street ${i + 1}`,
            number: `${100 + i}`,
            neighborhood: `Neighborhood ${i + 1}`,
            city: 'Test City',
            state: 'TS',
            zipCode: `12345-${String(i).padStart(3, '0')}`
          }
        },
        subtotal: 10.99 + i,
        deliveryFee: 5.00,
        discount: 0,
        total: 15.99 + i,
        notes: i % 2 === 0 ? `Notes for order ${i + 1}` : undefined,
        estimatedCompletionTime: new Date(Date.now() + (30 + i * 5) * 60000),
        actualCompletionTime: i % 3 === 0 ? new Date(Date.now() + (25 + i * 5) * 60000) : undefined,
        createdAt: new Date(Date.now() - i * 3600000), // Spread orders over time
        updatedAt: new Date(Date.now() - i * 1800000)
      };
      orders.push(order);
    }
    
    return orders;
  };

  const generatePaginatedResponse = (orders: Order[], page: number, limit: number): PaginatedOrders => {
    const total = orders.length;
    const pages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = Math.min(startIndex + limit, total);
    const paginatedOrders = orders.slice(startIndex, endIndex);

    return {
      orders: paginatedOrders,
      pagination: {
        page,
        limit,
        total,
        pages
      }
    };
  };

  /**
   * **Validates: Requirements 2.1, 2.4, 2.5, 3.2**
   * 
   * Property: For any order query with filters, the system should:
   * - Return orders filtered by status, channel, or date range (2.1)
   * - Show all relevant order details including customer, items, and payment information (2.4)
   * - Support pagination for large result sets (2.5)
   * - Return complete order information including current status and estimated times (3.2)
   */
  test('should maintain data retrieval completeness for all filter combinations', async () => {
    await fc.assert(
      fc.asyncProperty(
        generateOrderFilters(),
        fc.uuid(), // tenantId
        fc.integer({ min: 0, max: 50 }), // number of orders to generate
        async (filters: Partial<OrderFilters>, tenantId: string, orderCount: number) => {
          // Normalize filters with defaults (same as OrderRepository does)
          const normalizedFilters: OrderFilters = {
            ...filters,
            page: filters.page ?? 1,
            limit: filters.limit ?? 20
          };

          // Generate mock orders that match the filters
          const mockOrders = generateMockOrders(orderCount, tenantId, filters);
          const mockPaginatedResponse = generatePaginatedResponse(mockOrders, normalizedFilters.page, normalizedFilters.limit);

          // Mock repository response
          mockOrderRepository.findAll = jest.fn().mockResolvedValue(mockPaginatedResponse);

          // Execute the query
          const result = await orderService.getOrders(normalizedFilters, tenantId);

          // Verify data retrieval completeness properties

          // 2.1: Filtering support - repository called with correct filters
          expect(mockOrderRepository.findAll).toHaveBeenCalledTimes(1);
          expect(mockOrderRepository.findAll).toHaveBeenCalledWith(tenantId, normalizedFilters);

          // 2.4 & 3.2: Complete order details returned
          expect(result).toBeDefined();
          expect(result.orders).toBeDefined();
          
          result.orders.forEach(order => {
            // Verify all required order fields are present and complete
            expect(order.id).toBeDefined();
            expect(order.tenantId).toBe(tenantId);
            expect(order.number).toBeDefined();
            expect(order.number).toMatch(/^#\d+$/);
            expect(order.customerId).toBeDefined();
            
            // Customer information completeness (2.4)
            if (order.customer) {
              expect(order.customer.id).toBeDefined();
              expect(order.customer.name).toBeDefined();
              expect(order.customer.phone).toBeDefined();
            }
            
            // Items information completeness (2.4)
            expect(order.items).toBeDefined();
            expect(Array.isArray(order.items)).toBe(true);
            expect(order.items.length).toBeGreaterThan(0);
            
            order.items.forEach(item => {
              expect(item.id).toBeDefined();
              expect(item.productId).toBeDefined();
              expect(item.name).toBeDefined();
              expect(item.price).toBeGreaterThan(0);
              expect(item.quantity).toBeGreaterThan(0);
              expect(Array.isArray(item.extras)).toBe(true);
            });
            
            // Payment information completeness (2.4)
            expect(order.payment).toBeDefined();
            expect(order.payment.method).toBeDefined();
            expect(order.payment.status).toBeDefined();
            expect(order.payment.amount).toBeGreaterThan(0);
            
            // Delivery information completeness (2.4)
            expect(order.delivery).toBeDefined();
            expect(order.delivery.type).toBeDefined();
            expect(order.delivery.fee).toBeGreaterThanOrEqual(0);
            
            // Status and timing information completeness (3.2)
            expect(order.status).toBeDefined();
            expect(['pending', 'confirmed', 'preparing', 'ready', 'delivering', 'delivered', 'cancelled']).toContain(order.status);
            expect(order.channel).toBeDefined();
            expect(['whatsapp', 'instagram', 'website', 'ifood', 'uber_eats', 'rappi']).toContain(order.channel);
            
            // Financial information completeness
            expect(order.subtotal).toBeGreaterThanOrEqual(0);
            expect(order.deliveryFee).toBeGreaterThanOrEqual(0);
            expect(order.discount).toBeGreaterThanOrEqual(0);
            expect(order.total).toBeGreaterThan(0);
            
            // Timestamp completeness (3.2)
            expect(order.createdAt).toBeDefined();
            expect(order.createdAt).toBeInstanceOf(Date);
            expect(order.updatedAt).toBeDefined();
            expect(order.updatedAt).toBeInstanceOf(Date);
          });

          // 2.5: Pagination support verification
          expect(result.pagination).toBeDefined();
          expect(result.pagination.page).toBe(normalizedFilters.page);
          expect(result.pagination.limit).toBe(normalizedFilters.limit);
          expect(result.pagination.total).toBeGreaterThanOrEqual(0);
          
          expect(result.pagination.pages).toBeGreaterThanOrEqual(0);
          
          // Verify pagination logic consistency
          const expectedPages = Math.ceil(result.pagination.total / result.pagination.limit);
          expect(result.pagination.pages).toBe(expectedPages);
          
          // Verify returned orders count respects pagination
          const expectedOrdersCount = Math.min(
            result.pagination.limit,
            Math.max(0, result.pagination.total - (result.pagination.page - 1) * result.pagination.limit)
          );
          
          expect(result.orders.length).toBeLessThanOrEqual(expectedOrdersCount);
          
          // If there are orders, verify they don't exceed the limit
          if (result.orders.length > 0) {
            expect(result.orders.length).toBeLessThanOrEqual(result.pagination.limit);
          }
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design
    );
  });

  /**
   * Additional property test for single order retrieval completeness (3.2)
   */
  test('should return complete order information for individual order retrieval', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // orderId
        fc.uuid(), // tenantId
        async (orderId: string, tenantId: string) => {
          // Generate a complete mock order
          const mockOrder = generateMockOrders(1, tenantId)[0];
          mockOrder.id = orderId;

          // Mock repository response
          mockOrderRepository.findById = jest.fn().mockResolvedValue(mockOrder);

          // Execute the query
          const result = await orderService.getOrderById(orderId, tenantId);

          // Verify complete order information is returned (3.2)
          expect(result).toBeDefined();
          expect(result.id).toBe(orderId);
          expect(result.tenantId).toBe(tenantId);
          
          // Verify all essential fields are complete
          expect(result.number).toBeDefined();
          expect(result.customerId).toBeDefined();
          expect(result.items).toBeDefined();
          expect(result.items.length).toBeGreaterThan(0);
          expect(result.status).toBeDefined();
          expect(result.channel).toBeDefined();
          expect(result.payment).toBeDefined();
          expect(result.delivery).toBeDefined();
          expect(result.createdAt).toBeDefined();
          expect(result.updatedAt).toBeDefined();
          
          // Verify repository was called correctly
          expect(mockOrderRepository.findById).toHaveBeenCalledTimes(1);
          expect(mockOrderRepository.findById).toHaveBeenCalledWith(orderId, tenantId);
        }
      ),
      { numRuns: 100 }
    );
  });
});