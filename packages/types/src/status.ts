// Status Types - Unified and Namespaced

// Order Status Types
export type AdminOrderStatus = 'pending' | 'preparing' | 'ready' | 'delivering' | 'delivered' | 'cancelled';
export type WebOrderStatus = 'awaiting_payment' | 'paid' | 'processing' | 'in_delivery' | 'delivered';

// Payment Types
export type PaymentMethod = 'pix' | 'credit' | 'debit' | 'money';
export type PaymentStatus = 'pending' | 'confirmed' | 'failed';

// Transaction Status
export type TransactionStatus = 'confirmed' | 'pending' | 'failed';

// Notification Status
export type NotificationStatus = 'sent' | 'failed';

// Channel Types
export type ChannelType = 'whatsapp' | 'instagram' | 'site' | 'ifood';

// Channel Status
export type ChannelStatus = 'connected' | 'disconnected';