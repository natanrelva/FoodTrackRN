// Main export file for @foodtrack/types package

// Core types and schemas (order matters to avoid circular dependencies)
export * from './status';
export * from './user';
export * from './product';
export * from './order';
export * from './websocket';
export * from './constants';

// Legacy types (for backward compatibility) - selective exports to avoid conflicts
export * from './navigation';
export * from './components';

// Admin types (excluding conflicting User type)
export type { Channel, MessageLog } from './admin';

// Kitchen types (excluding conflicting KitchenStatus)
export type {
  OrderPriority,
  ItemStatus,
  StationType,
  StationStatus,
  AllergenInfo,
  KitchenOrderItem,
  KitchenOrder,
  StationAssignment,
  PreparationStation,
  Recipe,
  InventoryItem,
  StationWorkload,
  RecipeInstructions,
  StockAlert,
  ExpirationAlert,
  AvailabilityCheck
} from './kitchen';

// Delivery types (excluding conflicting DeliveryStatus and DELIVERY_STATUS_LABELS)
export type {
  GeoLocation,
  VehicleType,
  AgentStatus,
  DeliveryZone,
  NavigationStep,
  TrafficData,
  Route,
  DeliveryAgent,
  DeliveryIssue,
  DeliveryConfirmation,
  Address,
  Delivery,
  TimePeriod,
  DeliveryMetrics,
  AgentPerformance,
  DeliveryFilters,
  RouteConstraints
} from './delivery';

// Re-export Zod for consumers
export { z } from 'zod';