-- Production Contracts table (ADR-001 Implementation)
CREATE TABLE production_contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    contract_data JSONB NOT NULL,
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
    special_instructions TEXT[],
    allergen_alerts JSONB DEFAULT '[]',
    estimated_completion_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'assigned', 'in_preparation', 'ready', 'completed', 'cancelled')) DEFAULT 'pending',
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Kitchen Orders table
CREATE TABLE kitchen_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contract_id UUID NOT NULL REFERENCES production_contracts(id) ON DELETE CASCADE,
    assigned_station VARCHAR(100),
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'assigned', 'in_preparation', 'ready', 'completed', 'on_hold', 'cancelled')) DEFAULT 'pending',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    actual_preparation_time INTEGER, -- minutes
    quality_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Station Assignments table
CREATE TABLE station_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    kitchen_order_id UUID NOT NULL REFERENCES kitchen_orders(id) ON DELETE CASCADE,
    station_id VARCHAR(100) NOT NULL,
    station_name VARCHAR(255) NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    estimated_duration INTEGER NOT NULL, -- minutes
    items JSONB NOT NULL DEFAULT '[]',
    status VARCHAR(50) NOT NULL CHECK (status IN ('assigned', 'in_progress', 'completed', 'cancelled')) DEFAULT 'assigned',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recipes table
CREATE TABLE recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    dish_id UUID NOT NULL, -- References products.id
    name VARCHAR(255) NOT NULL,
    description TEXT,
    ingredients JSONB NOT NULL,
    instructions JSONB NOT NULL,
    preparation_time INTEGER NOT NULL, -- minutes
    cooking_time INTEGER NOT NULL, -- minutes
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')) DEFAULT 'medium',
    allergens JSONB DEFAULT '[]',
    nutritional_info JSONB,
    quality_standards JSONB DEFAULT '[]',
    servings INTEGER NOT NULL DEFAULT 1,
    tags JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, dish_id)
);

-- Indexes for performance
CREATE INDEX idx_production_contracts_tenant_id ON production_contracts(tenant_id);
CREATE INDEX idx_production_contracts_order_id ON production_contracts(order_id);
CREATE INDEX idx_production_contracts_status ON production_contracts(status);
CREATE INDEX idx_production_contracts_priority ON production_contracts(priority);
CREATE INDEX idx_production_contracts_estimated_time ON production_contracts(estimated_completion_time);

CREATE INDEX idx_kitchen_orders_tenant_id ON kitchen_orders(tenant_id);
CREATE INDEX idx_kitchen_orders_contract_id ON kitchen_orders(contract_id);
CREATE INDEX idx_kitchen_orders_status ON kitchen_orders(status);
CREATE INDEX idx_kitchen_orders_station ON kitchen_orders(assigned_station);

CREATE INDEX idx_station_assignments_tenant_id ON station_assignments(tenant_id);
CREATE INDEX idx_station_assignments_kitchen_order_id ON station_assignments(kitchen_order_id);
CREATE INDEX idx_station_assignments_station_id ON station_assignments(station_id);
CREATE INDEX idx_station_assignments_status ON station_assignments(status);

CREATE INDEX idx_recipes_tenant_id ON recipes(tenant_id);
CREATE INDEX idx_recipes_dish_id ON recipes(dish_id);
CREATE INDEX idx_recipes_active ON recipes(is_active);
CREATE INDEX idx_recipes_difficulty ON recipes(difficulty);

-- Updated at triggers
CREATE TRIGGER update_production_contracts_updated_at BEFORE UPDATE ON production_contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kitchen_orders_updated_at BEFORE UPDATE ON kitchen_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_station_assignments_updated_at BEFORE UPDATE ON station_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON recipes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();