// Models (with DB-specific schemas)
export { TenantSchema } from './models/tenant';
export type { Tenant } from './models/tenant';

export { UserSchema, CustomerSchema } from './models/user';
export type { User, Customer } from './models/user';

export { ProductSchema, CategorySchema } from './models/product';
export type { Product as DBProduct, Category as DBCategory } from './models/product';

export { 
  OrderSchema, 
  OrderItemSchema, 
  OrderItemExtraSchema,
  CreateOrderItemSchema,
  CreateOrderRequestSchema,
  OrderFiltersSchema,
  PaginatedOrdersSchema,
  OrderMetricsSchema,
  OrderTotalsSchema,
  ValidationResultSchema,
  AddressSchema,
  PaymentInfoSchema,
  DeliveryInfoSchema,
  OrderStatusSchema,
  ChannelTypeSchema,
  OrderValidationUtils,
  ORDER_STATUS_LABELS,
  CHANNEL_TYPE_LABELS,
  PAYMENT_METHOD_LABELS
} from './models/order';
export type { 
  Order, 
  OrderItem, 
  OrderItemExtra,
  CreateOrderItem,
  CreateOrderRequest,
  OrderFilters,
  PaginatedOrders,
  OrderMetrics,
  OrderTotals,
  ValidationResult,
  Address,
  PaymentInfo,
  DeliveryInfo,
  OrderStatus,
  ChannelType
} from './models/order';

export {
  NotificationSchema,
  CreateNotificationRequestSchema,
  NotificationResultSchema,
  NotificationFiltersSchema,
  PaginatedNotificationsSchema,
  NotificationTemplateSchema,
  NotificationPreferencesSchema,
  NotificationChannelSchema,
  NotificationStatusSchema,
  NotificationTypeSchema,
  NotificationUtils,
  NOTIFICATION_CHANNEL_LABELS,
  NOTIFICATION_STATUS_LABELS,
  NOTIFICATION_TYPE_LABELS,
  DEFAULT_NOTIFICATION_TEMPLATES
} from './models/notification';
export type {
  Notification,
  CreateNotificationRequest,
  NotificationResult,
  NotificationFilters,
  PaginatedNotifications,
  NotificationTemplate,
  NotificationPreferences,
  NotificationChannel,
  NotificationStatus,
  NotificationType
} from './models/notification';

// Kitchen Models
export {
  KitchenStatusSchema,
  OrderPrioritySchema,
  ItemStatusSchema,
  AllergenInfoSchema,
  StationAssignmentSchema,
  KitchenOrderItemSchema,
  KitchenOrderSchema,
  StationTypeSchema,
  StationStatusSchema,
  SpecializationSchema,
  EquipmentSchema,
  StaffMemberSchema,
  PreparationStationSchema,
  StationWorkloadSchema,
  KitchenStatusMapper,
  KITCHEN_STATUS_LABELS,
  STATION_TYPE_LABELS
} from './models/kitchen';
export type {
  KitchenStatus,
  OrderPriority,
  ItemStatus,
  AllergenInfo,
  StationAssignment,
  KitchenOrderItem,
  KitchenOrder,
  StationType,
  StationStatus,
  Specialization,
  Equipment,
  StaffMember,
  PreparationStation,
  StationWorkload
} from './models/kitchen';

// Recipe Models
export {
  MeasurementUnitSchema,
  DifficultyLevelSchema,
  AllergenSchema,
  NutritionalInfoSchema,
  IngredientSubstituteSchema,
  RecipeIngredientSchema,
  RecipeStepSchema,
  TemperatureRangeSchema,
  QualityCriteriaSchema,
  CommonIssueSchema,
  QualityStandardSchema,
  RecipeSchema,
  RecipeInstructionsSchema,
  CreateRecipeRequestSchema,
  RecipeUpdateSchema,
  RecipeValidationResultSchema,
  ModificationValidationSchema,
  IngredientListSchema,
  RecipeValidationUtils,
  MEASUREMENT_UNIT_LABELS,
  DIFFICULTY_LEVEL_LABELS
} from './models/recipe';
export type {
  MeasurementUnit,
  DifficultyLevel,
  Allergen,
  NutritionalInfo,
  IngredientSubstitute,
  RecipeIngredient,
  RecipeStep,
  TemperatureRange,
  QualityCriteria,
  CommonIssue,
  QualityStandard,
  Recipe,
  RecipeInstructions,
  CreateRecipeRequest,
  RecipeUpdate,
  RecipeValidationResult,
  ModificationValidation,
  IngredientList
} from './models/recipe';

// Inventory Models
export {
  IngredientCategorySchema,
  InventoryItemSchema,
  InventoryUpdateSchema,
  StockAlertSchema,
  ExpirationAlertSchema,
  AvailabilityCheckSchema,
  IngredientDeliverySchema,
  InventoryUsageSchema,
  CreateInventoryItemRequestSchema,
  UpdateInventoryItemRequestSchema,
  InventoryFiltersSchema,
  InventoryValidationUtils,
  INGREDIENT_CATEGORY_LABELS,
  STORAGE_TEMPERATURE_LABELS
} from './models/inventory';
export type {
  IngredientCategory,
  InventoryItem,
  InventoryUpdate,
  StockAlert,
  ExpirationAlert,
  AvailabilityCheck,
  IngredientDelivery,
  InventoryUsage,
  CreateInventoryItemRequest,
  UpdateInventoryItemRequest,
  InventoryFilters
} from './models/inventory';

// Utils
export * from './utils/auth';
export * from './utils/database';
export * from './utils/orderNumbering';
export * from './utils/kitchenValidation';

// Delivery Models
export {
  GeoLocationSchema,
  VehicleTypeSchema,
  AgentStatusSchema,
  DeliveryStatusSchema,
  DeliveryZoneSchema,
  NavigationStepSchema,
  TrafficDataSchema,
  RouteSchema,
  DeliveryAgentSchema,
  DeliveryIssueSchema,
  DeliveryConfirmationSchema,
  DeliverySchema,
  TimePeriodSchema,
  DeliveryMetricsSchema,
  AgentPerformanceSchema,
  DeliveryFiltersSchema,
  RouteConstraintsSchema,
  DeliveryStatusMapper,
  DeliveryValidationUtils,
  DELIVERY_STATUS_LABELS,
  AGENT_STATUS_LABELS,
  VEHICLE_TYPE_LABELS,
  isValidDeliveryStatus,
  isValidAgentStatus,
  isValidVehicleType
} from './models/delivery';
export type {
  GeoLocation,
  VehicleType,
  AgentStatus,
  DeliveryStatus,
  DeliveryZone,
  NavigationStep,
  TrafficData,
  Route,
  DeliveryAgent,
  DeliveryIssue,
  DeliveryConfirmation,
  Delivery,
  TimePeriod,
  DeliveryMetrics,
  AgentPerformance,
  DeliveryFilters,
  RouteConstraints
} from './models/delivery';

// Re-export frontend types
export * from '@foodtrack/types';