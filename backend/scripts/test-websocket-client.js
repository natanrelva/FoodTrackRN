const { io } = require('socket.io-client');

// Test WebSocket client for FoodTrack
class WebSocketTestClient {
  constructor(url = 'http://localhost:4001') {
    this.url = url;
    this.socket = null;
    this.connected = false;
  }

  connect(auth = {}) {
    console.log(`🔌 Connecting to ${this.url}...`);
    
    this.socket = io(this.url, {
      auth: {
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
        userType: 'kitchen',
        ...auth
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
    return this;
  }

  setupEventHandlers() {
    this.socket.on('connect', () => {
      console.log('✅ Connected to WebSocket server');
      console.log(`Socket ID: ${this.socket.id}`);
      this.connected = true;
    });

    this.socket.on('connected', (data) => {
      console.log('📡 Server welcome message:', data);
    });

    this.socket.on('authenticated', (data) => {
      console.log('🔐 Authentication result:', data);
    });

    this.socket.on('subscribed', (data) => {
      console.log('📺 Subscribed to room:', data);
    });

    this.socket.on('unsubscribed', (data) => {
      console.log('📺 Unsubscribed from room:', data);
    });

    // Domain event handlers
    this.socket.on('domain_event', (data) => {
      console.log('🎯 Domain event received:', data);
    });

    this.socket.on('kitchen_update', (data) => {
      console.log('👨‍🍳 Kitchen update:', data);
    });

    this.socket.on('order_update', (data) => {
      console.log('📦 Order update:', data);
    });

    this.socket.on('dashboard_update', (data) => {
      console.log('📊 Dashboard update:', data);
    });

    this.socket.on('production_contract_update', (data) => {
      console.log('📋 Production contract update:', data);
    });

    this.socket.on('supply_update', (data) => {
      console.log('📦 Supply update:', data);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected:', reason);
      this.connected = false;
    });

    this.socket.on('error', (error) => {
      console.error('🔥 Socket error:', error);
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔥 Connection error:', error);
    });
  }

  // Authentication
  authenticate(data) {
    console.log('🔐 Authenticating with:', data);
    this.socket.emit('authenticate', data);
  }

  // Subscription methods
  subscribeToTenant(tenantId) {
    console.log(`📊 Subscribing to tenant: ${tenantId}`);
    this.socket.emit('subscribe:tenant', tenantId);
  }

  subscribeToKitchen(tenantId) {
    console.log(`👨‍🍳 Subscribing to kitchen: ${tenantId}`);
    this.socket.emit('subscribe:kitchen', tenantId);
  }

  subscribeToOrder(orderId) {
    console.log(`📦 Subscribing to order: ${orderId}`);
    this.socket.emit('subscribe:order', orderId);
  }

  subscribeToCustomer(customerId) {
    console.log(`👤 Subscribing to customer: ${customerId}`);
    this.socket.emit('subscribe:customer', customerId);
  }

  // Kitchen operations
  getKitchenOrders(tenantId) {
    console.log(`👨‍🍳 Getting kitchen orders for tenant: ${tenantId}`);
    this.socket.emit('kitchen:get_orders', { tenantId }, (response) => {
      console.log('Kitchen orders response:', response);
    });
  }

  updateKitchenOrderStatus(orderId, tenantId, status, assignedStation) {
    console.log(`👨‍🍳 Updating kitchen order ${orderId} to ${status}`);
    this.socket.emit('kitchen:update_order_status', {
      orderId,
      tenantId,
      status,
      assignedStation
    }, (response) => {
      console.log('Update status response:', response);
    });
  }

  getStations(tenantId) {
    console.log(`🏭 Getting stations for tenant: ${tenantId}`);
    this.socket.emit('kitchen:get_stations', { tenantId }, (response) => {
      console.log('Stations response:', response);
    });
  }

  // Order operations
  getOrderDetails(orderId, tenantId) {
    console.log(`📦 Getting order details: ${orderId}`);
    this.socket.emit('order:get_details', { orderId, tenantId }, (response) => {
      console.log('Order details response:', response);
    });
  }

  trackOrder(orderId, tenantId) {
    console.log(`🔍 Tracking order: ${orderId}`);
    this.socket.emit('customer:track_order', { orderId, tenantId }, (response) => {
      console.log('Track order response:', response);
    });
  }

  // Tenant operations
  getTenantStats(tenantId) {
    console.log(`📊 Getting tenant stats: ${tenantId}`);
    this.socket.emit('tenant:get_stats', { tenantId }, (response) => {
      console.log('Tenant stats response:', response);
    });
  }

  getKitchenStatus(tenantId) {
    console.log(`👨‍🍳 Getting kitchen status: ${tenantId}`);
    this.socket.emit('tenant:get_kitchen_status', { tenantId }, (response) => {
      console.log('Kitchen status response:', response);
    });
  }

  // Utility methods
  ping() {
    console.log('🏓 Sending ping...');
    this.socket.emit('ping');
  }

  healthCheck() {
    console.log('🏥 Health check...');
    this.socket.emit('health_check', (response) => {
      console.log('Health check response:', response);
    });
  }

  disconnect() {
    if (this.socket) {
      console.log('👋 Disconnecting...');
      this.socket.disconnect();
    }
  }
}

// Test scenarios
async function runTests() {
  const tenantId = '550e8400-e29b-41d4-a716-446655440000';
  
  console.log('🧪 Starting WebSocket tests...\n');

  // Test 1: Kitchen client
  console.log('=== Test 1: Kitchen Client ===');
  const kitchenClient = new WebSocketTestClient().connect({
    tenantId,
    userType: 'kitchen',
    userId: 'kitchen-user-1'
  });

  await new Promise(resolve => setTimeout(resolve, 1000));

  if (kitchenClient.connected) {
    kitchenClient.subscribeToKitchen(tenantId);
    kitchenClient.getKitchenOrders(tenantId);
    kitchenClient.getStations(tenantId);
  }

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 2: Tenant dashboard client
  console.log('\n=== Test 2: Tenant Dashboard Client ===');
  const tenantClient = new WebSocketTestClient().connect({
    tenantId,
    userType: 'tenant',
    userId: 'tenant-admin-1'
  });

  await new Promise(resolve => setTimeout(resolve, 1000));

  if (tenantClient.connected) {
    tenantClient.subscribeToTenant(tenantId);
    tenantClient.getTenantStats(tenantId);
    tenantClient.getKitchenStatus(tenantId);
  }

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 3: Customer client
  console.log('\n=== Test 3: Customer Client ===');
  const customerClient = new WebSocketTestClient().connect({
    tenantId,
    userType: 'customer',
    userId: 'customer-1'
  });

  await new Promise(resolve => setTimeout(resolve, 1000));

  if (customerClient.connected) {
    customerClient.subscribeToCustomer('customer-1');
    // Use an existing order ID for tracking
    customerClient.trackOrder('a119921c-6f44-4828-8076-b1ab5ba53834', tenantId);
  }

  // Keep connections alive for a bit to see real-time updates
  console.log('\n⏳ Keeping connections alive for 10 seconds to observe real-time updates...');
  await new Promise(resolve => setTimeout(resolve, 10000));

  // Cleanup
  console.log('\n🧹 Cleaning up connections...');
  kitchenClient.disconnect();
  tenantClient.disconnect();
  customerClient.disconnect();

  console.log('✅ WebSocket tests completed!');
  process.exit(0);
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { WebSocketTestClient };