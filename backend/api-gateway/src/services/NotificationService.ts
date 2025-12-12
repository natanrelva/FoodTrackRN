import {
  Notification,
  CreateNotificationRequest,
  NotificationResult,
  NotificationChannel,
  NotificationStatus,
  NotificationType,
  NotificationPreferences,
  NotificationUtils,
  Order,
  OrderStatus,
  DEFAULT_NOTIFICATION_TEMPLATES
} from '@foodtrack/backend-shared';
import { NotificationRepository } from '../repositories/NotificationRepository';
import { CustomerRepository } from '../repositories/CustomerRepository';

export interface NotificationServiceConfig {
  whatsappApiUrl?: string;
  whatsappApiKey?: string;
  smsApiUrl?: string;
  smsApiKey?: string;
  emailApiUrl?: string;
  emailApiKey?: string;
  maxRetries?: number;
  retryDelayMinutes?: number;
}

export class NotificationService {
  private notificationRepository: NotificationRepository;
  private customerRepository: CustomerRepository;
  private config: NotificationServiceConfig;

  constructor(config: NotificationServiceConfig = {}) {
    this.notificationRepository = new NotificationRepository();
    this.customerRepository = new CustomerRepository();
    this.config = {
      maxRetries: 3,
      retryDelayMinutes: 5,
      ...config,
    };
  }

  /**
   * Sends order confirmation notification
   * Requirements: 3.1
   */
  async sendOrderConfirmation(order: Order): Promise<NotificationResult> {
    try {
      // Get customer preferences
      const preferences = await this.notificationRepository.getNotificationPreferences(
        order.customerId,
        order.tenantId
      );

      // Check if order confirmation notifications are enabled
      if (!NotificationUtils.isNotificationTypeEnabled('order_confirmation', preferences || undefined)) {
        return {
          success: true,
          message: 'Order confirmation notifications disabled for customer',
        };
      }

      // Determine the notification channel
      const channel = NotificationUtils.getPreferredChannel(preferences);
      
      // Get recipient address
      const recipient = NotificationUtils.getRecipientForChannel(
        channel,
        preferences,
        order.customer?.phone,
        order.customer?.email
      );

      if (!recipient) {
        return {
          success: false,
          message: `No recipient address found for channel ${channel}`,
          errorCode: 'NO_RECIPIENT',
        };
      }

      // Prepare template variables
      const templateVariables = {
        customerName: order.customer?.name || 'Customer',
        orderNumber: order.number,
        total: order.total.toFixed(2),
        estimatedTime: this.calculateEstimatedTime(order),
        items: order.items.map(item => `${item.quantity}x ${item.name}`).join(', '),
      };

      // Get notification template
      const template = NotificationUtils.getDefaultTemplate('order_confirmation', channel);
      const message = NotificationUtils.renderTemplate(template, templateVariables);

      // Create notification request
      const notificationRequest: CreateNotificationRequest = {
        orderId: order.id,
        customerId: order.customerId,
        type: 'order_confirmation',
        channel,
        recipient,
        message,
        metadata: templateVariables,
        maxRetries: this.config.maxRetries || 3,
      };

      // Add subject for email notifications
      if (channel === 'email') {
        notificationRequest.subject = `Order Confirmation - ${order.number}`;
      }

      // Create and send notification
      return await this.createAndSendNotification(notificationRequest, order.tenantId);
    } catch (error) {
      console.error('Error sending order confirmation:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        errorCode: 'SEND_ERROR',
      };
    }
  }

  /**
   * Sends order status update notification
   * Requirements: 3.1, 3.4
   */
  async sendStatusUpdate(order: Order, previousStatus: OrderStatus): Promise<NotificationResult> {
    try {
      // Get customer preferences
      const preferences = await this.notificationRepository.getNotificationPreferences(
        order.customerId,
        order.tenantId
      );

      // Check if status update notifications are enabled
      if (!NotificationUtils.isNotificationTypeEnabled('status_update', preferences)) {
        return {
          success: true,
          message: 'Status update notifications disabled for customer',
        };
      }

      // Determine notification type based on new status
      let notificationType: NotificationType = 'status_update';
      if (order.status === 'ready') {
        notificationType = 'ready_for_pickup';
      } else if (order.status === 'delivering') {
        notificationType = 'out_for_delivery';
      } else if (order.status === 'delivered') {
        notificationType = 'delivered';
      } else if (order.status === 'cancelled') {
        notificationType = 'cancelled';
      }

      // Check if specific notification type is enabled
      if (!NotificationUtils.isNotificationTypeEnabled(notificationType, preferences)) {
        return {
          success: true,
          message: `${notificationType} notifications disabled for customer`,
        };
      }

      // Determine the notification channel
      const channel = NotificationUtils.getPreferredChannel(preferences);
      
      // Get recipient address
      const recipient = NotificationUtils.getRecipientForChannel(
        channel,
        preferences,
        order.customer?.phone,
        order.customer?.email
      );

      if (!recipient) {
        return {
          success: false,
          message: `No recipient address found for channel ${channel}`,
          errorCode: 'NO_RECIPIENT',
        };
      }

      // Prepare template variables
      const templateVariables = {
        customerName: order.customer?.name || 'Customer',
        orderNumber: order.number,
        status: this.getStatusDisplayName(order.status),
        previousStatus: this.getStatusDisplayName(previousStatus),
        estimatedTime: this.calculateEstimatedTime(order),
        reason: order.notes || '', // For cancellation notifications
      };

      // Get notification template
      const template = NotificationUtils.getDefaultTemplate(notificationType, channel);
      const message = NotificationUtils.renderTemplate(template, templateVariables);

      // Create notification request
      const notificationRequest: CreateNotificationRequest = {
        orderId: order.id,
        customerId: order.customerId,
        type: notificationType,
        channel,
        recipient,
        message,
        metadata: templateVariables,
        maxRetries: this.config.maxRetries || 3,
      };

      // Add subject for email notifications
      if (channel === 'email') {
        notificationRequest.subject = `Order ${order.number} - ${this.getStatusDisplayName(order.status)}`;
      }

      // Create and send notification
      return await this.createAndSendNotification(notificationRequest, order.tenantId);
    } catch (error) {
      console.error('Error sending status update:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        errorCode: 'SEND_ERROR',
      };
    }
  }

  /**
   * Sends delay notification when order is taking longer than expected
   * Requirements: 3.1, 3.4
   */
  async sendDelayNotification(order: Order): Promise<NotificationResult> {
    try {
      // Get customer preferences
      const preferences = await this.notificationRepository.getNotificationPreferences(
        order.customerId,
        order.tenantId
      );

      // Check if delay notifications are enabled
      if (!NotificationUtils.isNotificationTypeEnabled('delay_notification', preferences)) {
        return {
          success: true,
          message: 'Delay notifications disabled for customer',
        };
      }

      // Determine the notification channel
      const channel = NotificationUtils.getPreferredChannel(preferences);
      
      // Get recipient address
      const recipient = NotificationUtils.getRecipientForChannel(
        channel,
        preferences,
        order.customer?.phone,
        order.customer?.email
      );

      if (!recipient) {
        return {
          success: false,
          message: `No recipient address found for channel ${channel}`,
          errorCode: 'NO_RECIPIENT',
        };
      }

      // Calculate new estimated time (add 15-30 minutes buffer)
      const additionalMinutes = 20;
      const newEstimatedTime = this.calculateEstimatedTime(order) + additionalMinutes;

      // Prepare template variables
      const templateVariables = {
        customerName: order.customer?.name || 'Customer',
        orderNumber: order.number,
        newEstimatedTime: newEstimatedTime.toString(),
      };

      // Get notification template
      const template = NotificationUtils.getDefaultTemplate('delay_notification', channel);
      const message = NotificationUtils.renderTemplate(template, templateVariables);

      // Create notification request
      const notificationRequest: CreateNotificationRequest = {
        orderId: order.id,
        customerId: order.customerId,
        type: 'delay_notification',
        channel,
        recipient,
        message,
        metadata: templateVariables,
        maxRetries: this.config.maxRetries || 3,
      };

      // Add subject for email notifications
      if (channel === 'email') {
        notificationRequest.subject = `Order ${order.number} - Delay Update`;
      }

      // Create and send notification
      return await this.createAndSendNotification(notificationRequest, order.tenantId);
    } catch (error) {
      console.error('Error sending delay notification:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        errorCode: 'SEND_ERROR',
      };
    }
  }

  /**
   * Gets notification history for an order
   * Requirements: 3.1
   */
  async getNotificationHistory(orderId: string, tenantId: string): Promise<Notification[]> {
    return await this.notificationRepository.findByOrderId(orderId, tenantId);
  }

  /**
   * Retries failed notifications for an order
   * Requirements: 3.4
   */
  async retryFailedNotifications(orderId: string, tenantId: string): Promise<NotificationResult[]> {
    try {
      const notifications = await this.notificationRepository.findByOrderId(orderId, tenantId);
      const failedNotifications = notifications.filter(
        n => n.status === 'failed' && n.retryCount < n.maxRetries
      );

      const results: NotificationResult[] = [];

      for (const notification of failedNotifications) {
        try {
          const result = await this.sendNotification(notification);
          results.push(result);
        } catch (error) {
          results.push({
            success: false,
            notificationId: notification.id,
            message: error instanceof Error ? error.message : 'Retry failed',
            errorCode: 'RETRY_ERROR',
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error retrying failed notifications:', error);
      return [{
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        errorCode: 'RETRY_ERROR',
      }];
    }
  }

  /**
   * Creates and sends a notification
   */
  private async createAndSendNotification(
    notificationRequest: CreateNotificationRequest,
    tenantId: string
  ): Promise<NotificationResult> {
    try {
      // Validate notification request
      const validation = NotificationUtils.validateNotificationRequest(notificationRequest);
      if (!validation.isValid) {
        return {
          success: false,
          message: `Validation failed: ${validation.errors.join(', ')}`,
          errorCode: 'VALIDATION_ERROR',
        };
      }

      // Create notification record
      const notification = await this.notificationRepository.create(notificationRequest, tenantId);

      // Send the notification
      const sendResult = await this.sendNotification(notification);

      return {
        ...sendResult,
        notificationId: notification.id,
      };
    } catch (error) {
      console.error('Error creating and sending notification:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        errorCode: 'CREATE_ERROR',
      };
    }
  }

  /**
   * Sends a notification via the appropriate channel
   */
  private async sendNotification(notification: Notification): Promise<NotificationResult> {
    try {
      let result: NotificationResult;

      switch (notification.channel) {
        case 'whatsapp':
          result = await this.sendWhatsAppNotification(notification);
          break;
        case 'sms':
          result = await this.sendSMSNotification(notification);
          break;
        case 'email':
          result = await this.sendEmailNotification(notification);
          break;
        case 'push':
          result = await this.sendPushNotification(notification);
          break;
        case 'in_app':
          result = await this.sendInAppNotification(notification);
          break;
        default:
          result = {
            success: false,
            message: `Unsupported notification channel: ${notification.channel}`,
            errorCode: 'UNSUPPORTED_CHANNEL',
          };
      }

      // Update notification status based on result
      if (result.success) {
        await this.notificationRepository.updateStatus(
          notification.id,
          'sent',
          notification.tenantId
        );
      } else {
        await this.handleNotificationFailure(notification, result.message || 'Unknown error');
      }

      return result;
    } catch (error) {
      console.error('Error sending notification:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      await this.handleNotificationFailure(notification, errorMessage);
      
      return {
        success: false,
        message: errorMessage,
        errorCode: 'SEND_ERROR',
      };
    }
  }

  /**
   * Handles notification failure and retry logic
   */
  private async handleNotificationFailure(notification: Notification, errorMessage: string): Promise<void> {
    try {
      if (notification.retryCount < notification.maxRetries) {
        // Schedule retry
        const nextRetryAt = NotificationUtils.calculateNextRetryTime(
          notification.retryCount,
          this.config.retryDelayMinutes
        );
        
        await this.notificationRepository.incrementRetryCount(
          notification.id,
          notification.tenantId,
          nextRetryAt
        );
      } else {
        // Mark as permanently failed
        await this.notificationRepository.updateStatus(
          notification.id,
          'failed',
          notification.tenantId,
          errorMessage
        );
      }
    } catch (error) {
      console.error('Error handling notification failure:', error);
    }
  }

  /**
   * Sends WhatsApp notification (mock implementation)
   */
  private async sendWhatsAppNotification(notification: Notification): Promise<NotificationResult> {
    // Mock implementation - in production, integrate with WhatsApp Business API
    console.log(`[MOCK] Sending WhatsApp to ${notification.recipient}: ${notification.message}`);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Simulate 95% success rate
    if (Math.random() < 0.95) {
      return {
        success: true,
        message: 'WhatsApp message sent successfully',
      };
    } else {
      return {
        success: false,
        message: 'WhatsApp API temporarily unavailable',
        errorCode: 'WHATSAPP_API_ERROR',
        retryAfter: 300, // 5 minutes
      };
    }
  }

  /**
   * Sends SMS notification (mock implementation)
   */
  private async sendSMSNotification(notification: Notification): Promise<NotificationResult> {
    // Mock implementation - in production, integrate with SMS provider (Twilio, etc.)
    console.log(`[MOCK] Sending SMS to ${notification.recipient}: ${notification.message}`);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Simulate 98% success rate
    if (Math.random() < 0.98) {
      return {
        success: true,
        message: 'SMS sent successfully',
      };
    } else {
      return {
        success: false,
        message: 'SMS provider error',
        errorCode: 'SMS_API_ERROR',
        retryAfter: 180, // 3 minutes
      };
    }
  }

  /**
   * Sends email notification (mock implementation)
   */
  private async sendEmailNotification(notification: Notification): Promise<NotificationResult> {
    // Mock implementation - in production, integrate with email service (SendGrid, etc.)
    console.log(`[MOCK] Sending email to ${notification.recipient}`);
    console.log(`Subject: ${notification.subject}`);
    console.log(`Message: ${notification.message}`);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Simulate 99% success rate
    if (Math.random() < 0.99) {
      return {
        success: true,
        message: 'Email sent successfully',
      };
    } else {
      return {
        success: false,
        message: 'Email service temporarily unavailable',
        errorCode: 'EMAIL_API_ERROR',
        retryAfter: 600, // 10 minutes
      };
    }
  }

  /**
   * Sends push notification (mock implementation)
   */
  private async sendPushNotification(notification: Notification): Promise<NotificationResult> {
    // Mock implementation - in production, integrate with push service (FCM, APNS)
    console.log(`[MOCK] Sending push notification to ${notification.recipient}: ${notification.message}`);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 50));
    
    return {
      success: true,
      message: 'Push notification sent successfully',
    };
  }

  /**
   * Sends in-app notification (mock implementation)
   */
  private async sendInAppNotification(notification: Notification): Promise<NotificationResult> {
    // Mock implementation - in production, store in database for real-time display
    console.log(`[MOCK] Creating in-app notification for ${notification.recipient}: ${notification.message}`);
    
    return {
      success: true,
      message: 'In-app notification created successfully',
    };
  }

  /**
   * Calculates estimated time for order completion
   */
  private calculateEstimatedTime(order: Order): number {
    if (order.estimatedCompletionTime) {
      const now = new Date();
      const estimatedTime = new Date(order.estimatedCompletionTime);
      const diffMinutes = Math.max(0, Math.floor((estimatedTime.getTime() - now.getTime()) / (1000 * 60)));
      return diffMinutes;
    }

    // Fallback calculation based on order items
    const preparationTime = order.items.reduce((total, item) => {
      return total + (item.preparationTime || 15) * item.quantity;
    }, 0);

    const deliveryTime = order.delivery.type === 'delivery' ? (order.delivery.estimatedTime || 30) : 0;
    return preparationTime + deliveryTime + 10; // Add 10 minutes buffer
  }

  /**
   * Gets display name for order status
   */
  private getStatusDisplayName(status: OrderStatus): string {
    const statusLabels: Record<OrderStatus, string> = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      preparing: 'Being Prepared',
      ready: 'Ready for Pickup',
      delivering: 'Out for Delivery',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
    };

    return statusLabels[status] || status;
  }

  /**
   * Updates notification preferences for a customer
   */
  async updateNotificationPreferences(
    customerId: string,
    tenantId: string,
    preferences: Partial<Omit<NotificationPreferences, 'id' | 'tenantId' | 'customerId' | 'createdAt' | 'updatedAt'>>
  ): Promise<NotificationPreferences> {
    // Get existing preferences or create default
    const existing = await this.notificationRepository.getNotificationPreferences(customerId, tenantId);
    
    const updatedPreferences: Omit<NotificationPreferences, 'id' | 'createdAt' | 'updatedAt'> = {
      tenantId,
      customerId,
      preferredChannels: preferences.preferredChannels || existing?.preferredChannels || ['whatsapp'],
      enabledTypes: preferences.enabledTypes || existing?.enabledTypes || [
        'order_confirmation',
        'status_update',
        'ready_for_pickup',
        'out_for_delivery',
        'delivered'
      ],
      whatsappNumber: preferences.whatsappNumber || existing?.whatsappNumber,
      smsNumber: preferences.smsNumber || existing?.smsNumber,
      email: preferences.email || existing?.email,
    };

    return await this.notificationRepository.upsertNotificationPreferences(updatedPreferences);
  }

  /**
   * Gets notification preferences for a customer
   */
  async getNotificationPreferences(customerId: string, tenantId: string): Promise<NotificationPreferences | null> {
    return await this.notificationRepository.getNotificationPreferences(customerId, tenantId);
  }

  /**
   * Sends delay notification for kitchen orders
   */
  async sendKitchenDelayNotification(delayInfo: {
    orderId: string;
    orderNumber: string;
    customerName: string;
    delayMinutes: number;
    reason: string;
    newEstimatedTime: Date;
  }): Promise<NotificationResult> {
    try {
      // Mock implementation - in production, would get customer preferences and send notification
      console.log(`[KITCHEN] Delay notification for order ${delayInfo.orderNumber}:`);
      console.log(`Customer: ${delayInfo.customerName}`);
      console.log(`Delay: ${delayInfo.delayMinutes} minutes`);
      console.log(`Reason: ${delayInfo.reason}`);
      console.log(`New estimated time: ${delayInfo.newEstimatedTime.toLocaleTimeString()}`);
      
      // Simulate notification sending
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return {
        success: true,
        message: 'Delay notification sent successfully',
      };
    } catch (error) {
      console.error('Error sending delay notification:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        errorCode: 'DELAY_NOTIFICATION_ERROR',
      };
    }
  }

  /**
   * Notifies delivery system of order ready for pickup
   */
  async notifyDeliverySystem(deliveryInfo: {
    orderId: string;
    orderNumber: string;
    estimatedPickupTime: Date;
    specialInstructions?: string;
  }): Promise<NotificationResult> {
    try {
      // Mock implementation - in production, would integrate with delivery system API
      console.log(`[KITCHEN] Delivery notification for order ${deliveryInfo.orderNumber}:`);
      console.log(`Order ID: ${deliveryInfo.orderId}`);
      console.log(`Estimated pickup: ${deliveryInfo.estimatedPickupTime.toLocaleTimeString()}`);
      if (deliveryInfo.specialInstructions) {
        console.log(`Special instructions: ${deliveryInfo.specialInstructions}`);
      }
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 150));
      
      return {
        success: true,
        message: 'Delivery system notified successfully',
      };
    } catch (error) {
      console.error('Error notifying delivery system:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        errorCode: 'DELIVERY_NOTIFICATION_ERROR',
      };
    }
  }

  /**
   * Processes notifications that need to be retried (background job)
   */
  async processRetryQueue(tenantId: string): Promise<void> {
    try {
      const notificationsToRetry = await this.notificationRepository.findNotificationsForRetry(tenantId);
      
      for (const notification of notificationsToRetry) {
        try {
          await this.sendNotification(notification);
        } catch (error) {
          console.error(`Error retrying notification ${notification.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error processing retry queue:', error);
    }
  }
}