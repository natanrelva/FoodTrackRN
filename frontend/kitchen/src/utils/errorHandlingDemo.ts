// Demo script to show error handling capabilities
import { ErrorHandler, classifyError, ERROR_CODES } from './errorHandler';
import { RetryManager, RETRY_CONFIGS } from './retryLogic';
import OfflineManager from './offlineManager';

export function demonstrateErrorHandling() {
  console.log('🔧 Kitchen Error Handling System Demo');
  console.log('=====================================');

  // 1. Error Classification Demo
  console.log('\n1. Error Classification:');
  
  const networkError = new TypeError('fetch failed');
  const kitchenError = classifyError(networkError, { operation: 'order_fetch' });
  console.log(`Network Error: ${kitchenError.code} (${kitchenError.severity}) - ${kitchenError.userMessage}`);
  
  const recipeError = new Error('Recipe not found');
  const recipeKitchenError = classifyError(recipeError, { operation: 'recipe_lookup', orderId: 'dish-123' });
  console.log(`Recipe Error: ${recipeKitchenError.code} (${recipeKitchenError.severity}) - ${recipeKitchenError.userMessage}`);

  // 2. Error Handler Demo
  console.log('\n2. Error Handler:');
  const errorHandler = ErrorHandler.getInstance();
  
  errorHandler.handleError(networkError, { operation: 'demo_network' });
  errorHandler.handleError(recipeError, { operation: 'demo_recipe' });
  
  console.log(`Total errors logged: ${errorHandler.getErrorLog().length}`);
  console.log(`Network errors: ${errorHandler.getErrorsByCategory('network').length}`);
  console.log(`Business errors: ${errorHandler.getErrorsByCategory('business').length}`);

  // 3. Retry Logic Demo
  console.log('\n3. Retry Logic:');
  // const retryManager = RetryManager.getInstance();
  
  console.log('Retry Configurations:');
  console.log(`- Order Status Update: ${RETRY_CONFIGS.ORDER_STATUS_UPDATE.maxAttempts} attempts`);
  console.log(`- Inventory Update: ${RETRY_CONFIGS.INVENTORY_UPDATE.maxAttempts} attempts`);
  console.log(`- Recipe Fetch: ${RETRY_CONFIGS.RECIPE_FETCH.maxAttempts} attempts`);
  console.log(`- Station Assignment: ${RETRY_CONFIGS.STATION_ASSIGNMENT.maxAttempts} attempts`);

  // 4. Offline Manager Demo
  console.log('\n4. Offline Manager:');
  const offlineManager = OfflineManager.getInstance();
  
  console.log(`Connection Status: ${offlineManager.getConnectionStatus() ? 'Online' : 'Offline'}`);
  
  // Add some pending actions
  offlineManager.addPendingAction({
    type: 'order_status_update',
    data: { orderId: 'demo-order-1', status: 'ready' },
    maxRetries: 3
  });
  
  offlineManager.addPendingAction({
    type: 'inventory_update',
    data: { ingredientId: 'demo-ingredient-1', quantity: 5, orderId: 'demo-order-1' },
    maxRetries: 3
  });
  
  console.log(`Pending Actions: ${offlineManager.getPendingActions().length}`);
  
  const storageUsage = offlineManager.getStorageUsage();
  console.log(`Storage Usage: ${storageUsage.used} bytes used, ${storageUsage.available} bytes available`);

  // 5. Error Codes Demo
  console.log('\n5. Available Error Codes:');
  Object.entries(ERROR_CODES).forEach(([key, value]) => {
    console.log(`- ${key}: ${value}`);
  });

  console.log('\n✅ Error Handling System Demo Complete!');
  console.log('The system provides:');
  console.log('- Comprehensive error classification and handling');
  console.log('- Automatic retry logic with exponential backoff');
  console.log('- Offline capability with action queuing');
  console.log('- Fallback mechanisms for critical failures');
  console.log('- User-friendly error messages and suggestions');
}

// Async demo for retry functionality
export async function demonstrateRetryLogic() {
  console.log('\n🔄 Retry Logic Demo');
  console.log('==================');

  const retryManager = RetryManager.getInstance();
  
  // Simulate a flaky operation that succeeds on the 3rd try
  let attemptCount = 0;
  const flakyOperation = async () => {
    attemptCount++;
    console.log(`Attempt ${attemptCount}`);
    
    if (attemptCount < 3) {
      throw new TypeError('Network connection failed');
    }
    
    return 'Operation successful!';
  };

  try {
    const result = await retryManager.executeWithRetry(
      flakyOperation,
      'demo-operation',
      {
        maxAttempts: 5,
        baseDelay: 100,
        backoffFactor: 2,
        onRetry: (attempt, error) => {
          console.log(`Retry ${attempt}: ${error.message}`);
        }
      }
    );
    
    console.log(`✅ ${result}`);
  } catch (error) {
    console.log(`❌ Operation failed: ${error}`);
  }
}

// Demo for offline functionality
export async function demonstrateOfflineCapabilities() {
  console.log('\n📱 Offline Capabilities Demo');
  console.log('============================');

  const offlineManager = OfflineManager.getInstance();
  
  // Cache some data
  await offlineManager.cacheData({
    orders: [
      { 
        id: 'order-1', 
        orderId: 'ORD-001',
        status: 'in_preparation' as const, 
        items: [], 
        priority: 'medium' as const,
        specialInstructions: '',
        allergenAlerts: [],
        estimatedCompletionTime: new Date().toISOString(),
        assignedStations: []
      },
      { 
        id: 'order-2', 
        orderId: 'ORD-002',
        status: 'ready_for_pickup' as const, 
        items: [], 
        priority: 'high' as const,
        specialInstructions: '',
        allergenAlerts: [],
        estimatedCompletionTime: new Date().toISOString(),
        assignedStations: []
      }
    ],
    inventory: [
      { 
        id: 'ingredient-1', 
        name: 'Tomatoes', 
        currentStock: 50,
        category: 'vegetable',
        unit: 'kg',
        minimumStock: 10,
        supplier: 'Local Farm'
      },
      { 
        id: 'ingredient-2', 
        name: 'Cheese', 
        currentStock: 25,
        category: 'dairy',
        unit: 'kg',
        minimumStock: 5,
        supplier: 'Dairy Co'
      }
    ]
  });
  
  console.log('✅ Data cached for offline use');
  
  // Simulate offline operations
  offlineManager.updateOrderStatusOffline('order-1', 'ready_for_pickup');
  offlineManager.updateInventoryOffline('ingredient-1', 5, 'order-1');
  offlineManager.assignStationOffline('order-2', 'station-grill');
  
  console.log(`📝 ${offlineManager.getPendingActions().length} actions queued for sync`);
  
  // Show pending actions
  offlineManager.getPendingActions().forEach((action, index) => {
    console.log(`${index + 1}. ${action.type} - ${JSON.stringify(action.data)}`);
  });
  
  console.log('✅ Offline operations queued successfully');
}