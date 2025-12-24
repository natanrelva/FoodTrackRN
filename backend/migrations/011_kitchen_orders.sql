-- Kitchen Orders and Stations Tables
-- Migration: 011_kitchen_orders.sql

-- Create stations table
CREATE TABLE IF NOT EXISTS stations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('grill', 'fryer', 'assembly', 'cold', 'oven', 'prep')),
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    current_load INTEGER NOT NULL DEFAULT 0 CHECK (current_load >= 0),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT stations_load_capacity_check CHECK (current_load <= capacity),
    CONSTRAINT stations_tenant_name_unique UNIQUE (tenant_id, name)
);

-- Create kitchen_orders table
CREATE TABLE IF NOT EXISTS kitchen_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contract_id UUID NOT NULL REFERENCES production_contracts(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    priority VARCHAR(10) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    assigned_station UUID REFERENCES stations(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'preparing', 'ready', 'completed', 'failed')),
    estimated_completion_time TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT kitchen_orders_contract_unique UNIQUE (contract_id),
    CONSTRAINT kitchen_orders_order_unique UNIQUE (order_id)
);

-- Create kitchen_order_items table
CREATE TABLE IF NOT EXISTS kitchen_order_items (
    id UUID PRIMARY KEY,
    kitchen_order_id UUID NOT NULL REFERENCES kitchen_orders(id) ON DELETE CASCADE,
    production_item_id UUID NOT NULL,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    recipe_id UUID,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    modifications JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'completed', 'failed')),
    estimated_time INTEGER CHECK (estimated_time > 0),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_kitchen_orders_tenant_id ON kitchen_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_orders_status ON kitchen_orders(status);
CREATE INDEX IF NOT EXISTS idx_kitchen_orders_priority ON kitchen_orders(priority);
CREATE INDEX IF NOT EXISTS idx_kitchen_orders_assigned_station ON kitchen_orders(assigned_station);
CREATE INDEX IF NOT EXISTS idx_kitchen_orders_contract_id ON kitchen_orders(contract_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_orders_order_id ON kitchen_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_orders_created_at ON kitchen_orders(created_at);

CREATE INDEX IF NOT EXISTS idx_kitchen_order_items_kitchen_order_id ON kitchen_order_items(kitchen_order_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_order_items_product_id ON kitchen_order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_order_items_status ON kitchen_order_items(status);

CREATE INDEX IF NOT EXISTS idx_stations_tenant_id ON stations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stations_type ON stations(type);
CREATE INDEX IF NOT EXISTS idx_stations_active ON stations(active);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_kitchen_orders_tenant_status_priority ON kitchen_orders(tenant_id, status, priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_kitchen_orders_station_status ON kitchen_orders(assigned_station, status) WHERE assigned_station IS NOT NULL;

-- Insert default stations for existing tenants
INSERT INTO stations (tenant_id, name, type, capacity, current_load, active)
SELECT 
    t.id as tenant_id,
    'Grill Station' as name,
    'grill' as type,
    3 as capacity,
    0 as current_load,
    true as active
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM stations s 
    WHERE s.tenant_id = t.id AND s.name = 'Grill Station'
);

INSERT INTO stations (tenant_id, name, type, capacity, current_load, active)
SELECT 
    t.id as tenant_id,
    'Fryer Station' as name,
    'fryer' as type,
    2 as capacity,
    0 as current_load,
    true as active
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM stations s 
    WHERE s.tenant_id = t.id AND s.name = 'Fryer Station'
);

INSERT INTO stations (tenant_id, name, type, capacity, current_load, active)
SELECT 
    t.id as tenant_id,
    'Assembly Station' as name,
    'assembly' as type,
    4 as capacity,
    0 as current_load,
    true as active
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM stations s 
    WHERE s.tenant_id = t.id AND s.name = 'Assembly Station'
);

INSERT INTO stations (tenant_id, name, type, capacity, current_load, active)
SELECT 
    t.id as tenant_id,
    'Cold Station' as name,
    'cold' as type,
    2 as capacity,
    0 as current_load,
    true as active
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM stations s 
    WHERE s.tenant_id = t.id AND s.name = 'Cold Station'
);

-- Add triggers to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_kitchen_orders_updated_at 
    BEFORE UPDATE ON kitchen_orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stations_updated_at 
    BEFORE UPDATE ON stations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add function to automatically update station loads
CREATE OR REPLACE FUNCTION update_station_load()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle INSERT (new assignment)
    IF TG_OP = 'INSERT' AND NEW.assigned_station IS NOT NULL THEN
        UPDATE stations 
        SET current_load = current_load + 1 
        WHERE id = NEW.assigned_station;
    END IF;
    
    -- Handle UPDATE (station change)
    IF TG_OP = 'UPDATE' THEN
        -- Decrease load on old station
        IF OLD.assigned_station IS NOT NULL AND 
           (NEW.assigned_station IS NULL OR NEW.assigned_station != OLD.assigned_station) THEN
            UPDATE stations 
            SET current_load = GREATEST(current_load - 1, 0) 
            WHERE id = OLD.assigned_station;
        END IF;
        
        -- Increase load on new station
        IF NEW.assigned_station IS NOT NULL AND 
           (OLD.assigned_station IS NULL OR NEW.assigned_station != OLD.assigned_station) THEN
            UPDATE stations 
            SET current_load = current_load + 1 
            WHERE id = NEW.assigned_station;
        END IF;
    END IF;
    
    -- Handle DELETE (remove assignment)
    IF TG_OP = 'DELETE' AND OLD.assigned_station IS NOT NULL THEN
        UPDATE stations 
        SET current_load = GREATEST(current_load - 1, 0) 
        WHERE id = OLD.assigned_station;
        RETURN OLD;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Create trigger for automatic station load management
CREATE TRIGGER kitchen_orders_station_load_trigger
    AFTER INSERT OR UPDATE OR DELETE ON kitchen_orders
    FOR EACH ROW EXECUTE FUNCTION update_station_load();

COMMIT;