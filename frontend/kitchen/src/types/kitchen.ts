// Tipos específicos para a Kitchen App
import { Order } from '@foodtrack/types';

// Ingredientes e receitas
export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  cost: number;
  supplier?: string;
  expiryDate?: Date;
}

export interface Recipe {
  id: string;
  dishId: string;
  dishName: string;
  ingredients: RecipeIngredient[];
  instructions: string[];
  preparationTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  criteria?: QualityCriteria[];
}

export interface RecipeIngredient {
  ingredientId: string;
  name: string;
  quantity: number;
  unit: string;
}

export interface QualityCriteria {
  id: string;
  aspect: string;
  description: string;
  importance: 'low' | 'medium' | 'high';
}

// Estações de trabalho
export interface WorkStation {
  id: string;
  name: string;
  type: 'grill' | 'fryer' | 'prep' | 'assembly' | 'dessert';
  capacity: number;
  currentLoad: number;
  status: 'active' | 'maintenance' | 'offline';
  assignedStaff: Staff[];
  currentOrders: string[];
}

export interface Staff {
  id: string;
  name: string;
  role: 'chef' | 'cook' | 'prep' | 'assistant';
  stationId?: string;
  shift: 'morning' | 'afternoon' | 'night';
  skills: string[];
}

// Gestão de qualidade e atrasos
export interface QualityCheck {
  id: string;
  orderId: string;
  itemId: string;
  criteria: QualityCriteria[];
  passed: boolean;
  notes?: string;
  checkedBy: string;
  checkedAt: Date;
}

export interface DelayReport {
  id: string;
  orderId: string;
  expectedTime: Date;
  actualTime?: Date;
  delay: number; // em minutos
  reason: DelayReason;
  impact: 'low' | 'medium' | 'high';
  actions: string[];
}

export interface DelayReason {
  category: 'ingredient' | 'equipment' | 'staff' | 'complexity' | 'other';
  description: string;
  preventable: boolean;
}

// Prioridades e ajustes
export interface PriorityAdjustment {
  orderId: string;
  originalPriority: number;
  adjustedPriority: number;
  reason: string;
  adjustedBy: string;
  adjustedAt: Date;
}

export interface WorkloadSuggestion {
  type: 'redistribute' | 'priority_change' | 'staff_reassign';
  description: string;
  impact: 'low' | 'medium' | 'high';
  estimatedImprovement: number; // em minutos
}

export interface StationOverload {
  stationId: string;
  currentLoad: number;
  capacity: number;
  overloadPercentage: number;
  suggestedActions: WorkloadSuggestion[];
}

// Integração do sistema
export interface SystemIntegration {
  inventory: {
    connected: boolean;
    lastSync: Date;
    status: 'healthy' | 'warning' | 'error';
  };
  orders: {
    connected: boolean;
    lastSync: Date;
    status: 'healthy' | 'warning' | 'error';
  };
  pos: {
    connected: boolean;
    lastSync: Date;
    status: 'healthy' | 'warning' | 'error';
  };
}

// Rastreamento de status
export interface StatusTracker {
  orderId: string;
  currentStage: OrderStage;
  stages: OrderStageProgress[];
  estimatedCompletion: Date;
  actualCompletion?: Date;
}

export interface OrderStage {
  id: string;
  name: string;
  description: string;
  estimatedDuration: number;
  dependencies: string[];
}

export interface OrderStageProgress {
  stageId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'delayed';
  startedAt?: Date;
  completedAt?: Date;
  assignedTo?: string;
  notes?: string;
}

// Métricas da cozinha
export interface KitchenMetrics {
  averagePreparationTime: number;
  ordersCompleted: number;
  ordersInProgress: number;
  delayedOrders: number;
  qualityScore: number;
  efficiency: number;
  stationUtilization: Record<string, number>;
}

// Notificações
export interface KitchenNotification {
  id: string;
  type: 'new_order' | 'priority_change' | 'delay_alert' | 'quality_issue' | 'system_alert';
  title: string;
  message: string;
  orderId?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Date;
  readAt?: Date;
  actionRequired: boolean;
}

// Eventos de WebSocket específicos da cozinha
export interface KitchenSocketEvents {
  'new_order': Order;
  'order_priority_changed': { orderId: string; newPriority: number };
  'station_assignment': { orderId: string; stationId: string };
  'quality_check_required': { orderId: string; itemId: string };
  'delay_alert': DelayReport;
  'kitchen_metrics_update': KitchenMetrics;
}

// Configurações da cozinha
export interface KitchenConfig {
  autoAssignOrders: boolean;
  qualityChecksEnabled: boolean;
  delayThreshold: number; // em minutos
  notificationSound: boolean;
  displayMode: 'compact' | 'detailed';
  refreshInterval: number; // em segundos
}

// Filtros e visualização
export interface OrderFilters {
  status?: string[];
  priority?: 'low' | 'medium' | 'high'[];
  station?: string[];
  assignedTo?: string[];
  timeRange?: {
    start: Date;
    end: Date;
  };
}

export interface KitchenView {
  layout: 'grid' | 'list' | 'kanban';
  groupBy: 'status' | 'station' | 'priority' | 'time';
  sortBy: 'time' | 'priority' | 'complexity';
  showCompleted: boolean;
  autoRefresh: boolean;
}

// Tipos adicionais que estavam faltando
export interface KitchenOrder extends Order {
  priority: OrderPriority;
  status: KitchenStatus;
  items: KitchenOrderItem[];
  assignedStations: AssignedStation[];
  allergenAlerts: AllergenAlert[];
  estimatedCompletionTime: Date;
  actualCompletionTime?: Date;
}

export interface KitchenOrderItem {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  status: ItemStatus;
  estimatedTime: number;
  actualTime?: number;
  modifications: string[];
  specialInstructions?: string;
  assignedStation?: string;
  requiredEquipment?: string[];
}

export interface AssignedStation {
  stationId: string;
  stationName: string;
  assignedAt: Date;
  estimatedDuration: number;
}

export interface AllergenAlert {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export type OrderPriority = 'low' | 'medium' | 'high' | 'urgent';
export type KitchenStatus = 'received' | 'in_preparation' | 'ready_for_plating' | 'plated' | 'ready_for_pickup' | 'on_hold' | 'cancelled';
export type ItemStatus = 'pending' | 'assigned' | 'in_progress' | 'ready' | 'completed' | 'on_hold';

// Tipos para estações e atribuições
export interface StationAssignment {
  orderId: string;
  stationId: string;
  assignedAt: Date;
  estimatedDuration: number;
  priority: number;
}

export interface StationAssignmentResult {
  assignments: StationAssignmentSuggestion[];
  overloadWarnings: OverloadWarning[];
  redistributionSuggestions: WorkloadRedistributionSuggestion[];
  crossTrainingSuggestions: CrossTrainingSuggestion[];
}

export interface StationAssignmentSuggestion {
  orderId: string;
  stationId: string;
  confidence: number;
  reasoning: string;
  estimatedDuration: number;
}

export interface OverloadWarning {
  stationId: string;
  currentLoad: number;
  capacity: number;
  severity: 'low' | 'medium' | 'high';
  message: string;
}

export interface WorkloadRedistributionSuggestion {
  fromStationId: string;
  toStationId: string;
  orderIds: string[];
  estimatedImprovement: number;
  reasoning: string;
}

export interface CrossTrainingSuggestion {
  staffId: string;
  currentStation: string;
  suggestedStation: string;
  skillGap: string[];
  trainingDuration: number;
  benefit: string;
}

// Tipos para inventário
export interface InventoryItem {
  id: string;
  name: string;
  currentStock: number;
  minimumStock: number;
  unit: string;
  cost: number;
  lastUpdated: Date;
}

// Tipos para workload
export interface StationWorkload {
  stationId: string;
  currentOrders: number;
  capacity: number;
  utilizationPercentage: number;
  estimatedCompletionTime: Date;
}

// Tipos para preparação
export interface PreparationStage {
  id: string;
  name: string;
  description: string;
  estimatedDuration: number;
  requiredSkills: string[];
  dependencies: string[];
}

export interface StatusUpdateLog {
  id: string;
  orderId: string;
  itemId?: string;
  oldStatus: string;
  newStatus: string;
  updatedBy: string;
  updatedAt: Date;
  notes?: string;
}

// Tipos para qualidade
export interface QualityIssue {
  id: string;
  orderId: string;
  itemId: string;
  type: 'temperature' | 'appearance' | 'taste' | 'texture' | 'other';
  severity: 'low' | 'medium' | 'high';
  description: string;
  reportedBy: string;
  reportedAt: Date;
  resolved: boolean;
  resolution?: string;
}

export interface QualityStandard {
  id: string;
  dishId: string;
  dishName: string;
  criteria: QualityCriteria[];
  createdAt: Date;
  updatedAt: Date;
}

// Tipos para estações estendidas
export interface ExtendedPreparationStation extends WorkStation {
  specializations: StationSpecialization[];
  equipment: Equipment[];
  performance: StationPerformance;
}

export interface StationSpecialization {
  type: string;
  proficiency: number;
  equipment: string[];
}

export interface Equipment {
  id: string;
  name: string;
  type: string;
  status: 'available' | 'in_use' | 'maintenance';
}

export interface StationPerformance {
  averageTime: number;
  efficiency: number;
  qualityScore: number;
  lastUpdated: Date;
}

// Tipos para instruções de estação
export interface StationInstructions {
  stationId: string;
  instructions: Instruction[];
  lastUpdated: Date;
}

export interface Instruction {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  type: 'safety' | 'quality' | 'efficiency' | 'general';
}

// Labels e constantes
export const KITCHEN_STATUS_LABELS: Record<KitchenStatus, string> = {
  received: 'Recebido',
  in_preparation: 'Em Preparo',
  ready_for_plating: 'Pronto para Empratar',
  plated: 'Empratado',
  ready_for_pickup: 'Pronto para Retirada',
  on_hold: 'Em Espera',
  cancelled: 'Cancelado'
};

export const STATUS_COLORS: Record<KitchenStatus, string> = {
  received: 'bg-blue-100 text-blue-800',
  in_preparation: 'bg-yellow-100 text-yellow-800',
  ready_for_plating: 'bg-orange-100 text-orange-800',
  plated: 'bg-green-100 text-green-800',
  ready_for_pickup: 'bg-purple-100 text-purple-800',
  on_hold: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800'
};

export const PRIORITY_COLORS: Record<OrderPriority, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800'
};

export const PRIORITY_LABELS: Record<OrderPriority, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente'
};

export const STATUS_LABELS: Record<KitchenStatus, string> = KITCHEN_STATUS_LABELS;

export const ITEM_STATUS_COLORS: Record<ItemStatus, string> = {
  pending: 'bg-gray-100 text-gray-800',
  assigned: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  ready: 'bg-green-100 text-green-800',
  completed: 'bg-purple-100 text-purple-800',
  on_hold: 'bg-orange-100 text-orange-800'
};

export const ITEM_STATUS_LABELS: Record<ItemStatus, string> = {
  pending: 'Pendente',
  assigned: 'Atribuído',
  in_progress: 'Em Progresso',
  ready: 'Pronto',
  completed: 'Concluído',
  on_hold: 'Em Espera'
};