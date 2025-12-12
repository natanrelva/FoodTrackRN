import { z } from 'zod';

// Notification Channel enum
export const NotificationChannelSchema = z.enum([
  'whatsapp',
  'sms', 
  'email',
  'push',
  'in_app'
]);

export type NotificationChannel = z.infer<typeof NotificationChannelSchema>;

// Notification Status enum
export const NotificationStatusSchema = z.enum([
  'pending',    // Created but not yet sent
  'sent',       // Successfully sent
  'delivered',  // Confirmed delivered (if supported by channel)
  'failed',     // Failed to send
  'retrying'    // Currently retrying after failure
]);

export type NotificationStatus = z.infer<typeof NotificationStatusSchema>;

// Notification Type enum
export const NotificationTypeSchema = z.enum([
  'order_confirmation',
  'status_update',
  'ready_for_pickup',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'delay_notification',
  'payment_reminder'
]);

export type NotificationType = z.infer<typeof NotificationTypeSchema>;

// Notification Model
export const NotificationSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  orderId: z.string().uuid(),
  customerId: z.string().uuid(),
  type: NotificationTypeSchema,
  channel: NotificationChannelSchema,
  status: NotificationStatusSchema,
  recipient: z.string().min(1), // Phone number, email, or user ID depending on channel
  subject: z.string().optional(), // For email notifications
  message: z.string().min(1),
  metadata: z.record(z.any()).optional(), // Additional data like template variables
  sentAt: z.date().optional(),
  deliveredAt: z.date().optional(),
  failedAt: z.date().optional(),
  errorMessage: z.string().optional(),
  retryCount: z.number().int().min(0).default(0),
  maxRetries: z.number().int().min(0).default(3),
  nextRetryAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Notification = z.infer<typeof NotificationSchema>;

// Create Notification Request Model
export const CreateNotificationRequestSchema = z.object({
  orderId: z.string().uuid(),
  customerId: z.string().uuid(),
  type: NotificationTypeSchema,
  channel: NotificationChannelSchema,
  recipient: z.string().min(1),
  subject: z.string().optional(),
  message: z.string().min(1),
  metadata: z.record(z.any()).optional(),
  maxRetries: z.number().int().min(0).default(3),
});

export type CreateNotificationRequest = z.infer<typeof CreateNotificationRequestSchema>;

// Notification Result Model
export const NotificationResultSchema = z.object({
  success: z.boolean(),
  notificationId: z.string().uuid().optional(),
  message: z.string().optional(),
  errorCode: z.string().optional(),
  retryAfter: z.number().optional(), // Seconds to wait before retry
});

export type NotificationResult = z.infer<typeof NotificationResultSchema>;

// Notification Filters Model
export const NotificationFiltersSchema = z.object({
  orderId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  type: z.array(NotificationTypeSchema).optional(),
  channel: z.array(NotificationChannelSchema).optional(),
  status: z.array(NotificationStatusSchema).optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

export type NotificationFilters = z.infer<typeof NotificationFiltersSchema>;

// Paginated Notifications Model
export const PaginatedNotificationsSchema = z.object({
  notifications: z.array(NotificationSchema),
  pagination: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().min(0),
    pages: z.number().int().min(0),
  }),
});

export type PaginatedNotifications = z.infer<typeof PaginatedNotificationsSchema>;

// Notification Template Model
export const NotificationTemplateSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  type: NotificationTypeSchema,
  channel: NotificationChannelSchema,
  name: z.string().min(1),
  subject: z.string().optional(), // For email templates
  template: z.string().min(1), // Template with placeholders like {{customerName}}
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type NotificationTemplate = z.infer<typeof NotificationTemplateSchema>;

// Notification Preferences Model (per customer)
export const NotificationPreferencesSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  customerId: z.string().uuid(),
  preferredChannels: z.array(NotificationChannelSchema).default(['whatsapp']),
  enabledTypes: z.array(NotificationTypeSchema).default([
    'order_confirmation',
    'status_update',
    'ready_for_pickup',
    'out_for_delivery',
    'delivered'
  ]),
  whatsappNumber: z.string().optional(),
  smsNumber: z.string().optional(),
  email: z.string().email().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>;

// Type Guards
export const isValidNotificationChannel = (channel: string): channel is NotificationChannel => {
  return NotificationChannelSchema.safeParse(channel).success;
};

export const isValidNotificationStatus = (status: string): status is NotificationStatus => {
  return NotificationStatusSchema.safeParse(status).success;
};

export const isValidNotificationType = (type: string): type is NotificationType => {
  return NotificationTypeSchema.safeParse(type).success;
};

// Constants
export const NOTIFICATION_CHANNEL_LABELS: Record<NotificationChannel, string> = {
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  email: 'Email',
  push: 'Push Notification',
  in_app: 'In-App Notification',
};

export const NOTIFICATION_STATUS_LABELS: Record<NotificationStatus, string> = {
  pending: 'Pending',
  sent: 'Sent',
  delivered: 'Delivered',
  failed: 'Failed',
  retrying: 'Retrying',
};

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  order_confirmation: 'Order Confirmation',
  status_update: 'Status Update',
  ready_for_pickup: 'Ready for Pickup',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  delay_notification: 'Delay Notification',
  payment_reminder: 'Payment Reminder',
};

// Default notification templates
export const DEFAULT_NOTIFICATION_TEMPLATES: Record<NotificationType, Record<NotificationChannel, string>> = {
  order_confirmation: {
    whatsapp: 'Hi {{customerName}}! Your order #{{orderNumber}} has been confirmed. Total: R$ {{total}}. Estimated time: {{estimatedTime}} minutes.',
    sms: 'Order #{{orderNumber}} confirmed! Total: R$ {{total}}. Est. time: {{estimatedTime}} min.',
    email: 'Your order #{{orderNumber}} has been confirmed and is being prepared.',
    push: 'Order #{{orderNumber}} confirmed!',
    in_app: 'Your order has been confirmed and is being prepared.',
  },
  status_update: {
    whatsapp: 'Hi {{customerName}}! Your order #{{orderNumber}} status has been updated to: {{status}}.',
    sms: 'Order #{{orderNumber}} status: {{status}}',
    email: 'Your order #{{orderNumber}} status has been updated to {{status}}.',
    push: 'Order #{{orderNumber}} - {{status}}',
    in_app: 'Order status updated: {{status}}',
  },
  ready_for_pickup: {
    whatsapp: 'Hi {{customerName}}! Your order #{{orderNumber}} is ready for pickup! Please come to our location.',
    sms: 'Order #{{orderNumber}} ready for pickup!',
    email: 'Your order #{{orderNumber}} is ready for pickup.',
    push: 'Order #{{orderNumber}} ready for pickup!',
    in_app: 'Your order is ready for pickup!',
  },
  out_for_delivery: {
    whatsapp: 'Hi {{customerName}}! Your order #{{orderNumber}} is out for delivery. Expected arrival: {{estimatedTime}} minutes.',
    sms: 'Order #{{orderNumber}} out for delivery. ETA: {{estimatedTime}} min.',
    email: 'Your order #{{orderNumber}} is out for delivery.',
    push: 'Order #{{orderNumber}} out for delivery!',
    in_app: 'Your order is out for delivery!',
  },
  delivered: {
    whatsapp: 'Hi {{customerName}}! Your order #{{orderNumber}} has been delivered. Thank you for choosing us!',
    sms: 'Order #{{orderNumber}} delivered! Thank you!',
    email: 'Your order #{{orderNumber}} has been delivered. Thank you for your business!',
    push: 'Order #{{orderNumber}} delivered!',
    in_app: 'Your order has been delivered. Thank you!',
  },
  cancelled: {
    whatsapp: 'Hi {{customerName}}! Your order #{{orderNumber}} has been cancelled. {{reason}}',
    sms: 'Order #{{orderNumber}} cancelled. {{reason}}',
    email: 'Your order #{{orderNumber}} has been cancelled. {{reason}}',
    push: 'Order #{{orderNumber}} cancelled',
    in_app: 'Your order has been cancelled. {{reason}}',
  },
  delay_notification: {
    whatsapp: 'Hi {{customerName}}! Your order #{{orderNumber}} is taking longer than expected. New estimated time: {{newEstimatedTime}} minutes. Sorry for the delay!',
    sms: 'Order #{{orderNumber}} delayed. New ETA: {{newEstimatedTime}} min. Sorry!',
    email: 'Your order #{{orderNumber}} is delayed. New estimated time: {{newEstimatedTime}} minutes.',
    push: 'Order #{{orderNumber}} delayed',
    in_app: 'Your order is delayed. New estimated time: {{newEstimatedTime}} minutes.',
  },
  payment_reminder: {
    whatsapp: 'Hi {{customerName}}! Payment for order #{{orderNumber}} is still pending. Please complete payment to proceed.',
    sms: 'Payment pending for order #{{orderNumber}}. Please complete payment.',
    email: 'Payment reminder for order #{{orderNumber}}. Please complete your payment.',
    push: 'Payment pending for order #{{orderNumber}}',
    in_app: 'Payment pending. Please complete your payment.',
  },
};

// Utility functions
export class NotificationUtils {
  /**
   * Renders a notification template with provided variables
   */
  static renderTemplate(template: string, variables: Record<string, any>): string {
    let rendered = template;
    
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      rendered = rendered.replace(new RegExp(placeholder, 'g'), String(value));
    });
    
    return rendered;
  }

  /**
   * Gets the default template for a notification type and channel
   */
  static getDefaultTemplate(type: NotificationType, channel: NotificationChannel): string {
    return DEFAULT_NOTIFICATION_TEMPLATES[type]?.[channel] || '';
  }

  /**
   * Determines the preferred notification channel for a customer
   */
  static getPreferredChannel(preferences?: NotificationPreferences | null): NotificationChannel {
    if (!preferences || preferences.preferredChannels.length === 0) {
      return 'whatsapp'; // Default fallback
    }
    
    return preferences.preferredChannels[0];
  }

  /**
   * Checks if a notification type is enabled for a customer
   */
  static isNotificationTypeEnabled(
    type: NotificationType, 
    preferences?: NotificationPreferences | null
  ): boolean {
    if (!preferences) {
      return true; // Default to enabled if no preferences set
    }
    
    return preferences.enabledTypes.includes(type);
  }

  /**
   * Gets the recipient address for a given channel and customer preferences
   */
  static getRecipientForChannel(
    channel: NotificationChannel, 
    preferences?: NotificationPreferences | null,
    fallbackPhone?: string,
    fallbackEmail?: string
  ): string | null {
    if (!preferences) {
      // Use fallback values
      if (channel === 'whatsapp' || channel === 'sms') {
        return fallbackPhone || null;
      }
      if (channel === 'email') {
        return fallbackEmail || null;
      }
      return null;
    }

    switch (channel) {
      case 'whatsapp':
        return preferences.whatsappNumber || fallbackPhone || null;
      case 'sms':
        return preferences.smsNumber || fallbackPhone || null;
      case 'email':
        return preferences.email || fallbackEmail || null;
      case 'push':
      case 'in_app':
        return preferences.customerId; // Use customer ID for push/in-app
      default:
        return null;
    }
  }

  /**
   * Calculates the next retry time based on exponential backoff
   */
  static calculateNextRetryTime(retryCount: number, baseDelayMinutes: number = 5): Date {
    const delayMinutes = baseDelayMinutes * Math.pow(2, retryCount); // Exponential backoff
    const maxDelayMinutes = 60; // Cap at 1 hour
    const actualDelayMinutes = Math.min(delayMinutes, maxDelayMinutes);
    
    return new Date(Date.now() + actualDelayMinutes * 60 * 1000);
  }

  /**
   * Validates notification data
   */
  static validateNotificationRequest(data: unknown): { isValid: boolean; errors: string[] } {
    const result = CreateNotificationRequestSchema.safeParse(data);
    return {
      isValid: result.success,
      errors: result.success ? [] : result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
    };
  }
}