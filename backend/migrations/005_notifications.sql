-- Notifications system tables
-- This migration enhances the existing notifications table and adds new notification features

-- First, add customer_id column to notifications table if it doesn't exist
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE CASCADE;

-- Update the existing notifications table structure
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS subject VARCHAR(255),
ADD COLUMN IF NOT EXISTS metadata JSONB,
ADD COLUMN IF NOT EXISTS failed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP WITH TIME ZONE;

-- Update the status constraint to include new statuses
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_status_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_status_check 
CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'retrying'));

-- Update the type constraint to include new types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('order_confirmation', 'status_update', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'cancelled', 'delay_notification', 'payment_reminder'));

-- Update the channel constraint to include new channels
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_channel_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_channel_check 
CHECK (channel IN ('whatsapp', 'sms', 'email', 'push', 'in_app'));

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    preferred_channels JSONB NOT NULL DEFAULT '["whatsapp"]'::jsonb,
    enabled_types JSONB NOT NULL DEFAULT '["order_confirmation", "status_update", "ready_for_pickup", "out_for_delivery", "delivered"]'::jsonb,
    whatsapp_number VARCHAR(20),
    sms_number VARCHAR(20),
    email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, customer_id)
);

-- Create notification templates table (for custom templates)
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'order_confirmation',
        'status_update',
        'ready_for_pickup', 
        'out_for_delivery',
        'delivered',
        'cancelled',
        'delay_notification',
        'payment_reminder'
    )),
    channel VARCHAR(20) NOT NULL CHECK (channel IN (
        'whatsapp',
        'sms',
        'email',
        'push', 
        'in_app'
    )),
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(255), -- For email templates
    template TEXT NOT NULL, -- Template with placeholders like {{customerName}}
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, type, channel)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_order_id ON notifications(order_id);
CREATE INDEX IF NOT EXISTS idx_notifications_customer_id ON notifications(customer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_channel ON notifications(channel);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_next_retry_at ON notifications(next_retry_at) WHERE next_retry_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_retry_queue ON notifications(tenant_id, status, retry_count, next_retry_at) WHERE status IN ('failed', 'retrying');

CREATE INDEX IF NOT EXISTS idx_notification_preferences_tenant_customer ON notification_preferences(tenant_id, customer_id);

CREATE INDEX IF NOT EXISTS idx_notification_templates_tenant_type_channel ON notification_templates(tenant_id, type, channel);
CREATE INDEX IF NOT EXISTS idx_notification_templates_active ON notification_templates(tenant_id, is_active) WHERE is_active = true;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notifications_updated_at();

CREATE TRIGGER trigger_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_notifications_updated_at();

CREATE TRIGGER trigger_notification_templates_updated_at
    BEFORE UPDATE ON notification_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_notifications_updated_at();

-- Add some sample notification templates for the default tenant
-- (This would typically be done through the application, but adding here for development)
INSERT INTO notification_templates (tenant_id, type, channel, name, subject, template, is_active) 
SELECT 
    t.id as tenant_id,
    'order_confirmation' as type,
    'whatsapp' as channel,
    'Order Confirmation WhatsApp' as name,
    NULL as subject,
    'Hi {{customerName}}! Your order #{{orderNumber}} has been confirmed. Total: R$ {{total}}. Estimated time: {{estimatedTime}} minutes.' as template,
    true as is_active
FROM tenants t
WHERE t.name = 'Demo Restaurant'
ON CONFLICT (tenant_id, type, channel) DO NOTHING;

INSERT INTO notification_templates (tenant_id, type, channel, name, subject, template, is_active)
SELECT 
    t.id as tenant_id,
    'ready_for_pickup' as type,
    'whatsapp' as channel,
    'Ready for Pickup WhatsApp' as name,
    NULL as subject,
    'Hi {{customerName}}! Your order #{{orderNumber}} is ready for pickup! Please come to our location.' as template,
    true as is_active
FROM tenants t
WHERE t.name = 'Demo Restaurant'
ON CONFLICT (tenant_id, type, channel) DO NOTHING;

INSERT INTO notification_templates (tenant_id, type, channel, name, subject, template, is_active)
SELECT 
    t.id as tenant_id,
    'delivered' as type,
    'whatsapp' as channel,
    'Order Delivered WhatsApp' as name,
    NULL as subject,
    'Hi {{customerName}}! Your order #{{orderNumber}} has been delivered. Thank you for choosing us!' as template,
    true as is_active
FROM tenants t
WHERE t.name = 'Demo Restaurant'
ON CONFLICT (tenant_id, type, channel) DO NOTHING;

-- Add email templates
INSERT INTO notification_templates (tenant_id, type, channel, name, subject, template, is_active)
SELECT 
    t.id as tenant_id,
    'order_confirmation' as type,
    'email' as channel,
    'Order Confirmation Email' as name,
    'Order Confirmation - {{orderNumber}}' as subject,
    'Dear {{customerName}},\n\nYour order #{{orderNumber}} has been confirmed and is being prepared.\n\nOrder Details:\n{{items}}\n\nTotal: R$ {{total}}\nEstimated completion time: {{estimatedTime}} minutes\n\nThank you for your business!' as template,
    true as is_active
FROM tenants t
WHERE t.name = 'Demo Restaurant'
ON CONFLICT (tenant_id, type, channel) DO NOTHING;