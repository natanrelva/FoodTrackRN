-- Analytics enhancements for orders table
-- Add columns for better analytics and performance tracking

-- Add estimated completion time for performance analysis
ALTER TABLE orders ADD COLUMN estimated_completion_time TIMESTAMP WITH TIME ZONE;

-- Add actual completion time for performance comparison
ALTER TABLE orders ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;

-- Add preparation started time for kitchen analytics
ALTER TABLE orders ADD COLUMN preparation_started_at TIMESTAMP WITH TIME ZONE;

-- Add delivery started time for delivery analytics
ALTER TABLE orders ADD COLUMN delivery_started_at TIMESTAMP WITH TIME ZONE;

-- Add special instructions field
ALTER TABLE orders ADD COLUMN special_instructions TEXT;

-- Add order source tracking for better channel analytics
ALTER TABLE orders ADD COLUMN source_details JSONB DEFAULT '{}';

-- Add customer satisfaction rating (1-5)
ALTER TABLE orders ADD COLUMN customer_rating INTEGER CHECK (customer_rating >= 1 AND customer_rating <= 5);

-- Add customer feedback
ALTER TABLE orders ADD COLUMN customer_feedback TEXT;

-- Update orders status to include 'draft' status
ALTER TABLE orders DROP CONSTRAINT orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
    CHECK (status IN ('draft', 'pending', 'confirmed', 'preparing', 'ready', 'delivering', 'delivered', 'cancelled'));

-- Create indexes for analytics performance
CREATE INDEX idx_orders_estimated_completion_time ON orders(estimated_completion_time);
CREATE INDEX idx_orders_completed_at ON orders(completed_at);
CREATE INDEX idx_orders_preparation_started_at ON orders(preparation_started_at);
CREATE INDEX idx_orders_delivery_started_at ON orders(delivery_started_at);
CREATE INDEX idx_orders_customer_rating ON orders(customer_rating);
CREATE INDEX idx_orders_channel ON orders(channel);
CREATE INDEX idx_orders_status_created_at ON orders(status, created_at);

-- Create a view for analytics queries
CREATE OR REPLACE VIEW order_analytics_view AS
SELECT 
    o.id,
    o.tenant_id,
    o.number,
    o.status,
    o.channel,
    o.total,
    o.subtotal,
    o.delivery_fee,
    o.discount,
    o.customer_rating,
    o.created_at,
    o.updated_at,
    o.estimated_completion_time,
    o.completed_at,
    o.preparation_started_at,
    o.delivery_started_at,
    c.name as customer_name,
    c.phone as customer_phone,
    -- Calculate preparation time in minutes
    CASE 
        WHEN o.preparation_started_at IS NOT NULL AND o.completed_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (o.completed_at - o.preparation_started_at)) / 60
        ELSE NULL 
    END as actual_preparation_time_minutes,
    -- Calculate total order time in minutes
    CASE 
        WHEN o.completed_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (o.completed_at - o.created_at)) / 60
        ELSE NULL 
    END as total_order_time_minutes,
    -- Check if order was delayed
    CASE 
        WHEN o.estimated_completion_time IS NOT NULL AND o.completed_at IS NOT NULL
        THEN o.completed_at > o.estimated_completion_time
        ELSE FALSE
    END as was_delayed,
    -- Calculate delay in minutes
    CASE 
        WHEN o.estimated_completion_time IS NOT NULL AND o.completed_at IS NOT NULL AND o.completed_at > o.estimated_completion_time
        THEN EXTRACT(EPOCH FROM (o.completed_at - o.estimated_completion_time)) / 60
        ELSE 0
    END as delay_minutes
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.id;

-- Create materialized view for daily analytics (for performance)
CREATE MATERIALIZED VIEW daily_order_stats AS
SELECT 
    tenant_id,
    DATE(created_at) as order_date,
    COUNT(*) as total_orders,
    COUNT(CASE WHEN status = 'delivered' THEN 1 END) as completed_orders,
    SUM(CASE WHEN status = 'delivered' THEN total ELSE 0 END) as total_revenue,
    AVG(CASE WHEN status = 'delivered' THEN total ELSE NULL END) as avg_order_value,
    COUNT(CASE WHEN was_delayed THEN 1 END) as delayed_orders,
    AVG(CASE WHEN actual_preparation_time_minutes IS NOT NULL THEN actual_preparation_time_minutes END) as avg_preparation_time,
    COUNT(DISTINCT customer_id) as unique_customers
FROM order_analytics_view
GROUP BY tenant_id, DATE(created_at);

-- Create index on materialized view
CREATE INDEX idx_daily_order_stats_tenant_date ON daily_order_stats(tenant_id, order_date);

-- Create function to refresh daily stats
CREATE OR REPLACE FUNCTION refresh_daily_order_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_order_stats;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON COLUMN orders.estimated_completion_time IS 'Estimated time when the order should be completed';
COMMENT ON COLUMN orders.completed_at IS 'Actual time when the order was completed';
COMMENT ON COLUMN orders.preparation_started_at IS 'Time when kitchen started preparing the order';
COMMENT ON COLUMN orders.delivery_started_at IS 'Time when delivery was started';
COMMENT ON COLUMN orders.customer_rating IS 'Customer satisfaction rating (1-5)';
COMMENT ON COLUMN orders.customer_feedback IS 'Customer feedback text';
COMMENT ON VIEW order_analytics_view IS 'Comprehensive view for order analytics with calculated metrics';
COMMENT ON MATERIALIZED VIEW daily_order_stats IS 'Daily aggregated order statistics for performance';