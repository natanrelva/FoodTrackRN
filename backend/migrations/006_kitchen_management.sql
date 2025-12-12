-- Kitchen Management System Tables
-- Migration 006: Kitchen operations, stations, recipes, inventory, and quality control

-- Kitchen Orders table (extends orders with kitchen-specific data)
CREATE TABLE kitchen_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL CHECK (status IN (
        'received', 'in_preparation', 'ready_for_plating', 
        'plated', 'ready_for_pickup', 'on_hold', 'cancelled'
    )) DEFAULT 'received',
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
    special_instructions TEXT DEFAULT '',
    allergen_alerts JSONB DEFAULT '[]'::jsonb,
    estimated_completion_time TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_start_time TIMESTAMP WITH TIME ZONE,
    actual_completion_time TIMESTAMP WITH TIME ZONE,
    assigned_stations JSONB DEFAULT '[]'::jsonb, -- Array of station assignments
    items JSONB NOT NULL DEFAULT '[]'::jsonb, -- Kitchen-specific item data with modifications, allergens, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, order_id)
);

-- Preparation Stations table
CREATE TABLE preparation_stations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'grill', 'salad', 'dessert', 'beverage', 
        'appetizer', 'main_course', 'plating'
    )),
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    current_workload INTEGER NOT NULL DEFAULT 0 CHECK (current_workload >= 0),
    specializations JSONB DEFAULT '[]'::jsonb, -- Array of specialization objects
    equipment JSONB DEFAULT '[]'::jsonb, -- Array of equipment objects
    assigned_staff JSONB DEFAULT '[]'::jsonb, -- Array of staff member objects
    status VARCHAR(50) NOT NULL CHECK (status IN (
        'active', 'busy', 'overloaded', 'maintenance', 'offline'
    )) DEFAULT 'active',
    average_processing_time INTEGER NOT NULL DEFAULT 15 CHECK (average_processing_time > 0), -- minutes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

-- Recipes table
CREATE TABLE recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    dish_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    ingredients JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of recipe ingredient objects
    instructions JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of recipe step objects
    preparation_time INTEGER NOT NULL CHECK (preparation_time > 0), -- minutes
    cooking_time INTEGER NOT NULL CHECK (cooking_time > 0), -- minutes
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')) DEFAULT 'medium',
    allergens JSONB DEFAULT '[]'::jsonb, -- Array of allergen objects
    nutritional_info JSONB, -- Nutritional information object
    quality_standards JSONB DEFAULT '[]'::jsonb, -- Array of quality standard objects
    servings INTEGER NOT NULL DEFAULT 1 CHECK (servings > 0),
    tags JSONB DEFAULT '[]'::jsonb, -- Array of tag strings
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, dish_id)
);

-- Inventory Items table
CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'protein', 'vegetables', 'fruits', 'dairy', 'grains', 'spices',
        'condiments', 'beverages', 'frozen', 'canned', 'oils', 'herbs',
        'nuts', 'seafood', 'bakery'
    )),
    current_stock DECIMAL(10,3) NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
    unit VARCHAR(20) NOT NULL CHECK (unit IN (
        'g', 'kg', 'ml', 'l', 'cups', 'tbsp', 'tsp', 'pcs', 'oz', 'lbs'
    )),
    minimum_stock DECIMAL(10,3) NOT NULL DEFAULT 0 CHECK (minimum_stock >= 0),
    maximum_stock DECIMAL(10,3) NOT NULL DEFAULT 0 CHECK (maximum_stock >= 0),
    cost_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (cost_per_unit >= 0),
    supplier VARCHAR(255) NOT NULL,
    supplier_code VARCHAR(100),
    barcode VARCHAR(100),
    expiration_date DATE,
    batch_number VARCHAR(100),
    storage_location VARCHAR(255),
    storage_temperature VARCHAR(20) NOT NULL CHECK (storage_temperature IN (
        'room', 'refrigerated', 'frozen'
    )) DEFAULT 'room',
    is_active BOOLEAN DEFAULT true,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_stock_levels CHECK (minimum_stock <= maximum_stock)
);

-- Inventory Updates table (for tracking stock changes)
CREATE TABLE inventory_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('usage', 'delivery', 'adjustment', 'waste', 'transfer')),
    quantity DECIMAL(10,3) NOT NULL, -- Can be negative for usage/waste
    reason TEXT NOT NULL,
    performed_by UUID NOT NULL REFERENCES users(id),
    batch_number VARCHAR(100),
    expiration_date DATE,
    cost DECIMAL(10,2) CHECK (cost >= 0),
    notes TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stock Alerts table
CREATE TABLE stock_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN (
        'low_stock', 'out_of_stock', 'expiring_soon', 'expired', 'overstock'
    )),
    current_stock DECIMAL(10,3) NOT NULL CHECK (current_stock >= 0),
    minimum_stock DECIMAL(10,3) NOT NULL CHECK (minimum_stock >= 0),
    expiration_date DATE,
    days_until_expiration INTEGER,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quality Reports table (for tracking quality issues and resolutions)
CREATE TABLE quality_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    kitchen_order_id UUID REFERENCES kitchen_orders(id) ON DELETE CASCADE,
    item_id UUID, -- Reference to specific item in order
    issue_type VARCHAR(50) NOT NULL CHECK (issue_type IN (
        'temperature', 'appearance', 'taste', 'texture', 'presentation',
        'ingredient_missing', 'contamination', 'other'
    )),
    description TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('minor', 'major', 'critical')),
    reported_by VARCHAR(255) NOT NULL,
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    station_id UUID REFERENCES preparation_stations(id),
    suggested_action VARCHAR(50) NOT NULL CHECK (suggested_action IN (
        'remake', 'adjust', 'continue', 'discard', 'manager_review'
    )),
    photos JSONB DEFAULT '[]'::jsonb, -- Array of photo URLs
    resolution TEXT,
    action_taken VARCHAR(20) CHECK (action_taken IN (
        'remade', 'adjusted', 'continued', 'discarded', 'escalated'
    )),
    resolved_by VARCHAR(255),
    resolved_at TIMESTAMP WITH TIME ZONE,
    remake_order_id UUID REFERENCES orders(id),
    customer_notified BOOLEAN DEFAULT false,
    customer_satisfied BOOLEAN,
    additional_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Status Update Logs table (for audit trail of status changes)
CREATE TABLE status_update_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    kitchen_order_id UUID REFERENCES kitchen_orders(id) ON DELETE CASCADE,
    item_id UUID, -- Reference to specific item in order
    previous_status VARCHAR(50) NOT NULL,
    new_status VARCHAR(50) NOT NULL,
    updated_by VARCHAR(255) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    station_id UUID REFERENCES preparation_stations(id),
    notes TEXT,
    estimated_delay INTEGER CHECK (estimated_delay >= 0), -- minutes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Delay Notifications table
CREATE TABLE delay_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    kitchen_order_id UUID REFERENCES kitchen_orders(id) ON DELETE CASCADE,
    delay_minutes INTEGER NOT NULL CHECK (delay_minutes > 0),
    reason TEXT NOT NULL,
    notified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notification_method VARCHAR(20) NOT NULL CHECK (notification_method IN ('sms', 'email', 'app', 'call')),
    customer_response VARCHAR(20) CHECK (customer_response IN ('acknowledged', 'cancelled', 'modified')),
    new_estimated_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Remake Requests table
CREATE TABLE remake_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    original_order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    original_item_id UUID, -- Reference to specific item in original order
    reason TEXT NOT NULL,
    requested_by VARCHAR(255) NOT NULL,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'high',
    status VARCHAR(20) NOT NULL CHECK (status IN (
        'pending', 'approved', 'in_progress', 'completed', 'cancelled'
    )) DEFAULT 'pending',
    approved_by VARCHAR(255),
    approved_at TIMESTAMP WITH TIME ZONE,
    new_order_id UUID REFERENCES orders(id),
    estimated_time INTEGER CHECK (estimated_time > 0), -- minutes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ingredient Deliveries table (for tracking deliveries and quality checks)
CREATE TABLE ingredient_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    supplier VARCHAR(255) NOT NULL,
    delivery_date DATE NOT NULL,
    invoice_number VARCHAR(100),
    total_cost DECIMAL(10,2) NOT NULL CHECK (total_cost >= 0),
    items JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of delivery item objects
    received_by UUID NOT NULL REFERENCES users(id),
    quality_approved BOOLEAN DEFAULT false,
    quality_approved_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Preparation Stages table (for detailed tracking of preparation progress)
CREATE TABLE preparation_stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    kitchen_order_id UUID REFERENCES kitchen_orders(id) ON DELETE CASCADE,
    item_id UUID NOT NULL, -- Reference to specific item in order
    stage VARCHAR(20) NOT NULL CHECK (stage IN ('prep', 'cooking', 'plating', 'quality_check', 'ready')),
    status VARCHAR(20) NOT NULL CHECK (status IN (
        'pending', 'in_progress', 'completed', 'on_hold', 'failed'
    )) DEFAULT 'pending',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    estimated_duration INTEGER NOT NULL CHECK (estimated_duration > 0), -- minutes
    actual_duration INTEGER CHECK (actual_duration > 0), -- minutes
    station_id UUID NOT NULL REFERENCES preparation_stations(id),
    assigned_to VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance optimization
CREATE INDEX idx_kitchen_orders_tenant_id ON kitchen_orders(tenant_id);
CREATE INDEX idx_kitchen_orders_order_id ON kitchen_orders(order_id);
CREATE INDEX idx_kitchen_orders_status ON kitchen_orders(status);
CREATE INDEX idx_kitchen_orders_priority ON kitchen_orders(priority);
CREATE INDEX idx_kitchen_orders_estimated_completion ON kitchen_orders(estimated_completion_time);
CREATE INDEX idx_kitchen_orders_created_at ON kitchen_orders(created_at);

CREATE INDEX idx_preparation_stations_tenant_id ON preparation_stations(tenant_id);
CREATE INDEX idx_preparation_stations_type ON preparation_stations(type);
CREATE INDEX idx_preparation_stations_status ON preparation_stations(status);

CREATE INDEX idx_recipes_tenant_id ON recipes(tenant_id);
CREATE INDEX idx_recipes_dish_id ON recipes(dish_id);
CREATE INDEX idx_recipes_is_active ON recipes(is_active);

CREATE INDEX idx_inventory_items_tenant_id ON inventory_items(tenant_id);
CREATE INDEX idx_inventory_items_category ON inventory_items(category);
CREATE INDEX idx_inventory_items_is_active ON inventory_items(is_active);
CREATE INDEX idx_inventory_items_current_stock ON inventory_items(current_stock);
CREATE INDEX idx_inventory_items_expiration_date ON inventory_items(expiration_date);
CREATE INDEX idx_inventory_items_barcode ON inventory_items(barcode) WHERE barcode IS NOT NULL;

CREATE INDEX idx_inventory_updates_tenant_id ON inventory_updates(tenant_id);
CREATE INDEX idx_inventory_updates_inventory_item_id ON inventory_updates(inventory_item_id);
CREATE INDEX idx_inventory_updates_order_id ON inventory_updates(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX idx_inventory_updates_type ON inventory_updates(type);
CREATE INDEX idx_inventory_updates_timestamp ON inventory_updates(timestamp);

CREATE INDEX idx_stock_alerts_tenant_id ON stock_alerts(tenant_id);
CREATE INDEX idx_stock_alerts_inventory_item_id ON stock_alerts(inventory_item_id);
CREATE INDEX idx_stock_alerts_alert_type ON stock_alerts(alert_type);
CREATE INDEX idx_stock_alerts_severity ON stock_alerts(severity);
CREATE INDEX idx_stock_alerts_is_resolved ON stock_alerts(is_resolved);
CREATE INDEX idx_stock_alerts_created_at ON stock_alerts(created_at);

CREATE INDEX idx_quality_reports_tenant_id ON quality_reports(tenant_id);
CREATE INDEX idx_quality_reports_order_id ON quality_reports(order_id);
CREATE INDEX idx_quality_reports_kitchen_order_id ON quality_reports(kitchen_order_id) WHERE kitchen_order_id IS NOT NULL;
CREATE INDEX idx_quality_reports_severity ON quality_reports(severity);
CREATE INDEX idx_quality_reports_reported_at ON quality_reports(reported_at);
CREATE INDEX idx_quality_reports_station_id ON quality_reports(station_id) WHERE station_id IS NOT NULL;

CREATE INDEX idx_status_update_logs_tenant_id ON status_update_logs(tenant_id);
CREATE INDEX idx_status_update_logs_order_id ON status_update_logs(order_id);
CREATE INDEX idx_status_update_logs_kitchen_order_id ON status_update_logs(kitchen_order_id) WHERE kitchen_order_id IS NOT NULL;
CREATE INDEX idx_status_update_logs_updated_at ON status_update_logs(updated_at);
CREATE INDEX idx_status_update_logs_station_id ON status_update_logs(station_id) WHERE station_id IS NOT NULL;

CREATE INDEX idx_delay_notifications_tenant_id ON delay_notifications(tenant_id);
CREATE INDEX idx_delay_notifications_order_id ON delay_notifications(order_id);
CREATE INDEX idx_delay_notifications_kitchen_order_id ON delay_notifications(kitchen_order_id) WHERE kitchen_order_id IS NOT NULL;
CREATE INDEX idx_delay_notifications_notified_at ON delay_notifications(notified_at);

CREATE INDEX idx_remake_requests_tenant_id ON remake_requests(tenant_id);
CREATE INDEX idx_remake_requests_original_order_id ON remake_requests(original_order_id);
CREATE INDEX idx_remake_requests_status ON remake_requests(status);
CREATE INDEX idx_remake_requests_priority ON remake_requests(priority);
CREATE INDEX idx_remake_requests_requested_at ON remake_requests(requested_at);

CREATE INDEX idx_ingredient_deliveries_tenant_id ON ingredient_deliveries(tenant_id);
CREATE INDEX idx_ingredient_deliveries_delivery_date ON ingredient_deliveries(delivery_date);
CREATE INDEX idx_ingredient_deliveries_supplier ON ingredient_deliveries(supplier);
CREATE INDEX idx_ingredient_deliveries_quality_approved ON ingredient_deliveries(quality_approved);

CREATE INDEX idx_preparation_stages_tenant_id ON preparation_stages(tenant_id);
CREATE INDEX idx_preparation_stages_order_id ON preparation_stages(order_id);
CREATE INDEX idx_preparation_stages_kitchen_order_id ON preparation_stages(kitchen_order_id) WHERE kitchen_order_id IS NOT NULL;
CREATE INDEX idx_preparation_stages_item_id ON preparation_stages(item_id);
CREATE INDEX idx_preparation_stages_stage ON preparation_stages(stage);
CREATE INDEX idx_preparation_stages_status ON preparation_stages(status);
CREATE INDEX idx_preparation_stages_station_id ON preparation_stages(station_id);

-- Composite indexes for common queries
CREATE INDEX idx_kitchen_orders_tenant_status_priority ON kitchen_orders(tenant_id, status, priority);
CREATE INDEX idx_inventory_items_tenant_category_active ON inventory_items(tenant_id, category, is_active);
CREATE INDEX idx_stock_alerts_tenant_unresolved ON stock_alerts(tenant_id, is_resolved, severity) WHERE is_resolved = false;
CREATE INDEX idx_quality_reports_tenant_unresolved ON quality_reports(tenant_id, resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX idx_preparation_stages_order_status ON preparation_stages(order_id, status, stage);

-- Updated at triggers for all tables
CREATE TRIGGER update_kitchen_orders_updated_at 
    BEFORE UPDATE ON kitchen_orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_preparation_stations_updated_at 
    BEFORE UPDATE ON preparation_stations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipes_updated_at 
    BEFORE UPDATE ON recipes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_items_updated_at 
    BEFORE UPDATE ON inventory_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quality_reports_updated_at 
    BEFORE UPDATE ON quality_reports 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_remake_requests_updated_at 
    BEFORE UPDATE ON remake_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ingredient_deliveries_updated_at 
    BEFORE UPDATE ON ingredient_deliveries 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_preparation_stages_updated_at 
    BEFORE UPDATE ON preparation_stages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Functions for kitchen operations

-- Function to automatically create kitchen order when order is confirmed
CREATE OR REPLACE FUNCTION create_kitchen_order_on_confirmation()
RETURNS TRIGGER AS $
DECLARE
    estimated_time TIMESTAMP WITH TIME ZONE;
    total_prep_time INTEGER := 0;
    item JSONB;
BEGIN
    -- Only create kitchen order when status changes to 'confirmed'
    IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
        
        -- Calculate estimated completion time based on items
        -- This is a simplified calculation - in practice, you'd look up recipe times
        FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
        LOOP
            total_prep_time := total_prep_time + COALESCE((item->>'preparation_time')::INTEGER, 15);
        END LOOP;
        
        estimated_time := NOW() + (total_prep_time || ' minutes')::INTERVAL;
        
        -- Insert kitchen order
        INSERT INTO kitchen_orders (
            tenant_id,
            order_id,
            status,
            priority,
            special_instructions,
            estimated_completion_time,
            items
        ) VALUES (
            NEW.tenant_id,
            NEW.id,
            'received',
            CASE 
                WHEN NEW.channel = 'uber_eats' OR NEW.channel = 'ifood' THEN 'high'
                ELSE 'medium'
            END,
            COALESCE(NEW.notes, ''),
            estimated_time,
            NEW.items
        )
        ON CONFLICT (tenant_id, order_id) DO NOTHING;
        
    END IF;
    
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Create trigger for automatic kitchen order creation
CREATE TRIGGER trigger_create_kitchen_order_on_confirmation
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION create_kitchen_order_on_confirmation();

-- Function to update inventory when kitchen order is completed
CREATE OR REPLACE FUNCTION update_inventory_on_completion()
RETURNS TRIGGER AS $
DECLARE
    item JSONB;
    recipe_record RECORD;
    ingredient JSONB;
BEGIN
    -- Only process when status changes to completed states
    IF NEW.status IN ('ready_for_pickup', 'plated') AND 
       (OLD.status IS NULL OR OLD.status NOT IN ('ready_for_pickup', 'plated')) THEN
        
        -- Process each item in the order
        FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
        LOOP
            -- Find recipe for this dish
            SELECT * INTO recipe_record 
            FROM recipes 
            WHERE tenant_id = NEW.tenant_id 
            AND dish_id = (item->>'productId')::UUID 
            AND is_active = true;
            
            IF FOUND THEN
                -- Update inventory for each ingredient
                FOR ingredient IN SELECT * FROM jsonb_array_elements(recipe_record.ingredients)
                LOOP
                    -- Record inventory usage
                    INSERT INTO inventory_updates (
                        tenant_id,
                        inventory_item_id,
                        order_id,
                        type,
                        quantity,
                        reason,
                        performed_by,
                        timestamp
                    )
                    SELECT 
                        NEW.tenant_id,
                        ii.id,
                        (SELECT id FROM orders WHERE tenant_id = NEW.tenant_id AND id = NEW.order_id),
                        'usage',
                        -((ingredient->>'quantity')::DECIMAL * (item->>'quantity')::INTEGER),
                        'Automatic usage from kitchen order completion',
                        (SELECT id FROM users WHERE tenant_id = NEW.tenant_id AND role = 'admin' LIMIT 1),
                        NOW()
                    FROM inventory_items ii
                    WHERE ii.tenant_id = NEW.tenant_id 
                    AND ii.id = (ingredient->>'ingredientId')::UUID
                    AND ii.is_active = true;
                    
                    -- Update current stock
                    UPDATE inventory_items 
                    SET 
                        current_stock = current_stock - ((ingredient->>'quantity')::DECIMAL * (item->>'quantity')::INTEGER),
                        last_updated = NOW()
                    WHERE tenant_id = NEW.tenant_id 
                    AND id = (ingredient->>'ingredientId')::UUID
                    AND is_active = true;
                END LOOP;
            END IF;
        END LOOP;
        
    END IF;
    
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Create trigger for automatic inventory updates
CREATE TRIGGER trigger_update_inventory_on_completion
    AFTER UPDATE ON kitchen_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_on_completion();

-- Function to generate stock alerts
CREATE OR REPLACE FUNCTION generate_stock_alerts()
RETURNS VOID AS $
DECLARE
    item_record RECORD;
    alert_severity VARCHAR(20);
    alert_type VARCHAR(20);
BEGIN
    -- Clear existing unresolved alerts to regenerate them
    DELETE FROM stock_alerts WHERE is_resolved = false;
    
    -- Generate alerts for all inventory items
    FOR item_record IN 
        SELECT * FROM inventory_items WHERE is_active = true
    LOOP
        -- Determine alert type and severity
        IF item_record.current_stock = 0 THEN
            alert_type := 'out_of_stock';
            alert_severity := 'critical';
        ELSIF item_record.current_stock <= item_record.minimum_stock * 0.25 THEN
            alert_type := 'low_stock';
            alert_severity := 'high';
        ELSIF item_record.current_stock <= item_record.minimum_stock * 0.5 THEN
            alert_type := 'low_stock';
            alert_severity := 'medium';
        ELSIF item_record.current_stock <= item_record.minimum_stock THEN
            alert_type := 'low_stock';
            alert_severity := 'low';
        ELSIF item_record.current_stock > item_record.maximum_stock THEN
            alert_type := 'overstock';
            alert_severity := 'low';
        ELSE
            -- Check expiration
            IF item_record.expiration_date IS NOT NULL THEN
                IF item_record.expiration_date < CURRENT_DATE THEN
                    alert_type := 'expired';
                    alert_severity := 'critical';
                ELSIF item_record.expiration_date <= CURRENT_DATE + INTERVAL '3 days' THEN
                    alert_type := 'expiring_soon';
                    alert_severity := 'high';
                ELSIF item_record.expiration_date <= CURRENT_DATE + INTERVAL '7 days' THEN
                    alert_type := 'expiring_soon';
                    alert_severity := 'medium';
                ELSE
                    CONTINUE; -- No alert needed
                END IF;
            ELSE
                CONTINUE; -- No alert needed
            END IF;
        END IF;
        
        -- Insert alert
        INSERT INTO stock_alerts (
            tenant_id,
            inventory_item_id,
            item_name,
            alert_type,
            current_stock,
            minimum_stock,
            expiration_date,
            days_until_expiration,
            severity
        ) VALUES (
            item_record.tenant_id,
            item_record.id,
            item_record.name,
            alert_type,
            item_record.current_stock,
            item_record.minimum_stock,
            item_record.expiration_date,
            CASE 
                WHEN item_record.expiration_date IS NOT NULL 
                THEN (item_record.expiration_date - CURRENT_DATE)::INTEGER
                ELSE NULL 
            END,
            alert_severity
        );
        
    END LOOP;
END;
$ LANGUAGE plpgsql;

-- Create a function to be called periodically to update stock alerts
-- This would typically be called by a cron job or scheduled task
CREATE OR REPLACE FUNCTION refresh_stock_alerts()
RETURNS VOID AS $
BEGIN
    PERFORM generate_stock_alerts();
END;
$ LANGUAGE plpgsql;