-- Create sequences for order numbering per tenant
-- This ensures thread-safe sequential order numbers

-- Function to get next order number for a tenant
CREATE OR REPLACE FUNCTION get_next_order_number(tenant_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    sequence_name TEXT;
    next_number INTEGER;
    order_number TEXT;
BEGIN
    -- Create sequence name based on tenant ID
    sequence_name := 'order_seq_' || REPLACE(tenant_uuid::TEXT, '-', '_');
    
    -- Create sequence if it doesn't exist
    EXECUTE format('CREATE SEQUENCE IF NOT EXISTS %I START 1001', sequence_name);
    
    -- Get next value from sequence
    EXECUTE format('SELECT nextval(%L)', sequence_name) INTO next_number;
    
    -- Format as order number
    order_number := '#' || next_number::TEXT;
    
    RETURN order_number;
END;
$$ LANGUAGE plpgsql;

-- Function to reset order sequence for a tenant (for testing purposes)
CREATE OR REPLACE FUNCTION reset_order_sequence(tenant_uuid UUID, start_value INTEGER DEFAULT 1001)
RETURNS VOID AS $$
DECLARE
    sequence_name TEXT;
BEGIN
    sequence_name := 'order_seq_' || REPLACE(tenant_uuid::TEXT, '-', '_');
    
    -- Drop and recreate sequence
    EXECUTE format('DROP SEQUENCE IF EXISTS %I', sequence_name);
    EXECUTE format('CREATE SEQUENCE %I START %s', sequence_name, start_value);
END;
$$ LANGUAGE plpgsql;

-- Function to get current order number for a tenant (without incrementing)
CREATE OR REPLACE FUNCTION get_current_order_number(tenant_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    sequence_name TEXT;
    current_number INTEGER;
    order_number TEXT;
BEGIN
    sequence_name := 'order_seq_' || REPLACE(tenant_uuid::TEXT, '-', '_');
    
    -- Check if sequence exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_class 
        WHERE relname = sequence_name AND relkind = 'S'
    ) THEN
        RETURN '#1001'; -- Default starting number
    END IF;
    
    -- Get current value from sequence (without incrementing)
    EXECUTE format('SELECT last_value FROM %I', sequence_name) INTO current_number;
    
    -- Format as order number
    order_number := '#' || current_number::TEXT;
    
    RETURN order_number;
END;
$$ LANGUAGE plpgsql;

-- Add index for faster order number lookups
CREATE INDEX IF NOT EXISTS idx_orders_tenant_number ON orders(tenant_id, number);

-- Add constraint to ensure order numbers are unique per tenant
ALTER TABLE orders DROP CONSTRAINT IF EXISTS unique_tenant_order_number;
ALTER TABLE orders ADD CONSTRAINT unique_tenant_order_number UNIQUE (tenant_id, number);