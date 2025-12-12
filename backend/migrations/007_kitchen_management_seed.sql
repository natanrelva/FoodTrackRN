-- Kitchen Management Seed Data
-- Migration 007: Sample data for kitchen management system

-- Insert sample preparation stations for the demo tenant
INSERT INTO preparation_stations (id, tenant_id, name, type, capacity, specializations, equipment, status, average_processing_time) VALUES 
    (
        '550e8400-e29b-41d4-a716-446655440100',
        '550e8400-e29b-41d4-a716-446655440000', -- Demo tenant
        'Grill Station 1',
        'grill',
        4,
        '[{"type": "grilling", "level": "advanced"}, {"type": "meat_preparation", "level": "intermediate"}]'::jsonb,
        '[{"id": "550e8400-e29b-41d4-a716-446655440200", "name": "Commercial Grill", "type": "grill", "status": "operational"}]'::jsonb,
        'active',
        12
    ),
    (
        '550e8400-e29b-41d4-a716-446655440101',
        '550e8400-e29b-41d4-a716-446655440000',
        'Salad Station',
        'salad',
        2,
        '[{"type": "cold_preparation", "level": "intermediate"}, {"type": "vegetable_cutting", "level": "advanced"}]'::jsonb,
        '[{"id": "550e8400-e29b-41d4-a716-446655440201", "name": "Prep Counter", "type": "counter", "status": "operational"}]'::jsonb,
        'active',
        8
    ),
    (
        '550e8400-e29b-41d4-a716-446655440102',
        '550e8400-e29b-41d4-a716-446655440000',
        'Pizza Station',
        'main_course',
        3,
        '[{"type": "pizza_making", "level": "expert"}, {"type": "oven_operation", "level": "advanced"}]'::jsonb,
        '[{"id": "550e8400-e29b-41d4-a716-446655440202", "name": "Pizza Oven", "type": "oven", "status": "operational"}]'::jsonb,
        'active',
        20
    ),
    (
        '550e8400-e29b-41d4-a716-446655440103',
        '550e8400-e29b-41d4-a716-446655440000',
        'Beverage Station',
        'beverage',
        1,
        '[{"type": "beverage_preparation", "level": "basic"}]'::jsonb,
        '[{"id": "550e8400-e29b-41d4-a716-446655440203", "name": "Beverage Dispenser", "type": "dispenser", "status": "operational"}]'::jsonb,
        'active',
        2
    ),
    (
        '550e8400-e29b-41d4-a716-446655440104',
        '550e8400-e29b-41d4-a716-446655440000',
        'Plating Station',
        'plating',
        2,
        '[{"type": "plating", "level": "intermediate"}, {"type": "presentation", "level": "advanced"}]'::jsonb,
        '[{"id": "550e8400-e29b-41d4-a716-446655440204", "name": "Plating Counter", "type": "counter", "status": "operational"}]'::jsonb,
        'active',
        5
    );

-- Insert sample recipes for existing products
INSERT INTO recipes (id, tenant_id, dish_id, name, description, ingredients, instructions, preparation_time, cooking_time, difficulty, allergens, nutritional_info, servings) VALUES 
    (
        '550e8400-e29b-41d4-a716-446655440300',
        '550e8400-e29b-41d4-a716-446655440000',
        '550e8400-e29b-41d4-a716-446655440020', -- X-Burger Clássico
        'X-Burger Clássico Recipe',
        'Classic burger with beef patty, cheese, lettuce, tomato and special sauce',
        '[
            {"ingredientId": "550e8400-e29b-41d4-a716-446655440400", "name": "Ground Beef", "quantity": 150, "unit": "g", "isOptional": false, "substitutes": []},
            {"ingredientId": "550e8400-e29b-41d4-a716-446655440401", "name": "Cheddar Cheese", "quantity": 30, "unit": "g", "isOptional": false, "substitutes": []},
            {"ingredientId": "550e8400-e29b-41d4-a716-446655440402", "name": "Lettuce", "quantity": 20, "unit": "g", "isOptional": false, "substitutes": []},
            {"ingredientId": "550e8400-e29b-41d4-a716-446655440403", "name": "Tomato", "quantity": 40, "unit": "g", "isOptional": false, "substitutes": []},
            {"ingredientId": "550e8400-e29b-41d4-a716-446655440404", "name": "Burger Bun", "quantity": 1, "unit": "pcs", "isOptional": false, "substitutes": []},
            {"ingredientId": "550e8400-e29b-41d4-a716-446655440405", "name": "Special Sauce", "quantity": 15, "unit": "ml", "isOptional": false, "substitutes": []}
        ]'::jsonb,
        '[
            {"stepNumber": 1, "instruction": "Season the ground beef with salt and pepper, form into patty", "duration": 3, "equipment": ["mixing_bowl"], "notes": "Make patty slightly larger than bun as it will shrink"},
            {"stepNumber": 2, "instruction": "Preheat grill to medium-high heat", "duration": 2, "temperature": 200, "equipment": ["grill"], "notes": "Ensure grill is clean and oiled"},
            {"stepNumber": 3, "instruction": "Grill patty for 4-5 minutes on first side", "duration": 5, "temperature": 200, "equipment": ["grill"], "notes": "Do not press down on patty"},
            {"stepNumber": 4, "instruction": "Flip patty and add cheese, cook 3-4 minutes more", "duration": 4, "temperature": 200, "equipment": ["grill"], "notes": "Cheese should melt completely"},
            {"stepNumber": 5, "instruction": "Toast bun halves on grill for 1 minute", "duration": 1, "equipment": ["grill"], "notes": "Watch carefully to avoid burning"},
            {"stepNumber": 6, "instruction": "Assemble burger: bottom bun, sauce, lettuce, tomato, patty with cheese, top bun", "duration": 2, "equipment": ["plate"], "notes": "Serve immediately while hot"}
        ]'::jsonb,
        10,
        15,
        'medium',
        '[{"type": "dairy", "severity": "moderate"}, {"type": "gluten", "severity": "moderate"}]'::jsonb,
        '{"calories": 520, "protein": 28, "carbs": 35, "fat": 32, "fiber": 3, "sodium": 890}'::jsonb,
        1
    ),
    (
        '550e8400-e29b-41d4-a716-446655440301',
        '550e8400-e29b-41d4-a716-446655440000',
        '550e8400-e29b-41d4-a716-446655440021', -- Pizza Margherita
        'Pizza Margherita Recipe',
        'Classic Italian pizza with tomato sauce, mozzarella and fresh basil',
        '[
            {"ingredientId": "550e8400-e29b-41d4-a716-446655440410", "name": "Pizza Dough", "quantity": 250, "unit": "g", "isOptional": false, "substitutes": []},
            {"ingredientId": "550e8400-e29b-41d4-a716-446655440411", "name": "Tomato Sauce", "quantity": 80, "unit": "ml", "isOptional": false, "substitutes": []},
            {"ingredientId": "550e8400-e29b-41d4-a716-446655440412", "name": "Mozzarella Cheese", "quantity": 120, "unit": "g", "isOptional": false, "substitutes": []},
            {"ingredientId": "550e8400-e29b-41d4-a716-446655440413", "name": "Fresh Basil", "quantity": 10, "unit": "g", "isOptional": false, "substitutes": []},
            {"ingredientId": "550e8400-e29b-41d4-a716-446655440414", "name": "Olive Oil", "quantity": 10, "unit": "ml", "isOptional": false, "substitutes": []}
        ]'::jsonb,
        '[
            {"stepNumber": 1, "instruction": "Preheat pizza oven to maximum temperature", "duration": 5, "temperature": 450, "equipment": ["pizza_oven"], "notes": "Oven should be very hot for authentic pizza"},
            {"stepNumber": 2, "instruction": "Roll out pizza dough to 12-inch circle", "duration": 3, "equipment": ["rolling_pin", "floured_surface"], "notes": "Keep dough thin but not torn"},
            {"stepNumber": 3, "instruction": "Spread tomato sauce evenly, leaving 1-inch border", "duration": 2, "equipment": ["ladle"], "notes": "Do not over-sauce"},
            {"stepNumber": 4, "instruction": "Distribute mozzarella cheese evenly over sauce", "duration": 2, "equipment": [], "notes": "Use fresh mozzarella for best results"},
            {"stepNumber": 5, "instruction": "Bake pizza for 10-12 minutes until crust is golden", "duration": 12, "temperature": 450, "equipment": ["pizza_oven"], "notes": "Rotate halfway through cooking"},
            {"stepNumber": 6, "instruction": "Remove from oven, add fresh basil and drizzle with olive oil", "duration": 1, "equipment": [], "notes": "Serve immediately while cheese is melted"}
        ]'::jsonb,
        10,
        25,
        'medium',
        '[{"type": "dairy", "severity": "moderate"}, {"type": "gluten", "severity": "moderate"}]'::jsonb,
        '{"calories": 680, "protein": 32, "carbs": 78, "fat": 28, "fiber": 4, "sodium": 1240}'::jsonb,
        1
    ),
    (
        '550e8400-e29b-41d4-a716-446655440302',
        '550e8400-e29b-41d4-a716-446655440000',
        '550e8400-e29b-41d4-a716-446655440025', -- Salada Caesar
        'Caesar Salad Recipe',
        'Fresh romaine lettuce with caesar dressing, croutons and parmesan',
        '[
            {"ingredientId": "550e8400-e29b-41d4-a716-446655440420", "name": "Romaine Lettuce", "quantity": 200, "unit": "g", "isOptional": false, "substitutes": []},
            {"ingredientId": "550e8400-e29b-41d4-a716-446655440421", "name": "Caesar Dressing", "quantity": 60, "unit": "ml", "isOptional": false, "substitutes": []},
            {"ingredientId": "550e8400-e29b-41d4-a716-446655440422", "name": "Croutons", "quantity": 30, "unit": "g", "isOptional": false, "substitutes": []},
            {"ingredientId": "550e8400-e29b-41d4-a716-446655440423", "name": "Parmesan Cheese", "quantity": 25, "unit": "g", "isOptional": false, "substitutes": []}
        ]'::jsonb,
        '[
            {"stepNumber": 1, "instruction": "Wash and dry romaine lettuce thoroughly", "duration": 3, "equipment": ["salad_spinner"], "notes": "Lettuce must be completely dry"},
            {"stepNumber": 2, "instruction": "Chop lettuce into bite-sized pieces", "duration": 2, "equipment": ["knife", "cutting_board"], "notes": "Cut just before serving to maintain crispness"},
            {"stepNumber": 3, "instruction": "Place lettuce in large mixing bowl", "duration": 1, "equipment": ["mixing_bowl"], "notes": "Use chilled bowl if possible"},
            {"stepNumber": 4, "instruction": "Add caesar dressing and toss gently", "duration": 1, "equipment": ["tongs"], "notes": "Coat all leaves evenly"},
            {"stepNumber": 5, "instruction": "Add croutons and grated parmesan, toss lightly", "duration": 1, "equipment": ["tongs"], "notes": "Add just before serving to keep croutons crispy"}
        ]'::jsonb,
        8,
        0,
        'easy',
        '[{"type": "dairy", "severity": "mild"}, {"type": "gluten", "severity": "mild"}]'::jsonb,
        '{"calories": 320, "protein": 12, "carbs": 18, "fat": 24, "fiber": 6, "sodium": 680}'::jsonb,
        1
    );

-- Insert sample inventory items
INSERT INTO inventory_items (id, tenant_id, name, category, current_stock, unit, minimum_stock, maximum_stock, cost_per_unit, supplier, supplier_code, barcode, storage_temperature) VALUES 
    -- Burger ingredients
    ('550e8400-e29b-41d4-a716-446655440400', '550e8400-e29b-41d4-a716-446655440000', 'Ground Beef', 'protein', 5000, 'g', 1000, 10000, 0.018, 'Meat Supplier Ltd', 'BEEF001', '1234567890123', 'refrigerated'),
    ('550e8400-e29b-41d4-a716-446655440401', '550e8400-e29b-41d4-a716-446655440000', 'Cheddar Cheese', 'dairy', 2000, 'g', 500, 5000, 0.025, 'Dairy Co', 'CHED001', '1234567890124', 'refrigerated'),
    ('550e8400-e29b-41d4-a716-446655440402', '550e8400-e29b-41d4-a716-446655440000', 'Lettuce', 'vegetables', 3000, 'g', 500, 5000, 0.008, 'Fresh Produce Inc', 'LETT001', '1234567890125', 'refrigerated'),
    ('550e8400-e29b-41d4-a716-446655440403', '550e8400-e29b-41d4-a716-446655440000', 'Tomato', 'vegetables', 4000, 'g', 800, 8000, 0.012, 'Fresh Produce Inc', 'TOMA001', '1234567890126', 'room'),
    ('550e8400-e29b-41d4-a716-446655440404', '550e8400-e29b-41d4-a716-446655440000', 'Burger Bun', 'bakery', 100, 'pcs', 20, 200, 0.50, 'Bakery Supply Co', 'BUNS001', '1234567890127', 'room'),
    ('550e8400-e29b-41d4-a716-446655440405', '550e8400-e29b-41d4-a716-446655440000', 'Special Sauce', 'condiments', 2000, 'ml', 500, 5000, 0.015, 'Sauce Makers Ltd', 'SAUC001', '1234567890128', 'refrigerated'),
    
    -- Pizza ingredients
    ('550e8400-e29b-41d4-a716-446655440410', '550e8400-e29b-41d4-a716-446655440000', 'Pizza Dough', 'bakery', 5000, 'g', 1000, 10000, 0.008, 'Bakery Supply Co', 'DOUG001', '1234567890130', 'refrigerated'),
    ('550e8400-e29b-41d4-a716-446655440411', '550e8400-e29b-41d4-a716-446655440000', 'Tomato Sauce', 'condiments', 3000, 'ml', 500, 5000, 0.012, 'Sauce Makers Ltd', 'TOMS001', '1234567890131', 'room'),
    ('550e8400-e29b-41d4-a716-446655440412', '550e8400-e29b-41d4-a716-446655440000', 'Mozzarella Cheese', 'dairy', 3000, 'g', 600, 6000, 0.022, 'Dairy Co', 'MOZZ001', '1234567890132', 'refrigerated'),
    ('550e8400-e29b-41d4-a716-446655440413', '550e8400-e29b-41d4-a716-446655440000', 'Fresh Basil', 'herbs', 200, 'g', 50, 500, 0.080, 'Herb Garden Co', 'BASI001', '1234567890133', 'refrigerated'),
    ('550e8400-e29b-41d4-a716-446655440414', '550e8400-e29b-41d4-a716-446655440000', 'Olive Oil', 'oils', 1000, 'ml', 200, 2000, 0.035, 'Oil Suppliers Inc', 'OLIV001', '1234567890134', 'room'),
    
    -- Salad ingredients
    ('550e8400-e29b-41d4-a716-446655440420', '550e8400-e29b-41d4-a716-446655440000', 'Romaine Lettuce', 'vegetables', 2000, 'g', 400, 4000, 0.010, 'Fresh Produce Inc', 'ROMA001', '1234567890140', 'refrigerated'),
    ('550e8400-e29b-41d4-a716-446655440421', '550e8400-e29b-41d4-a716-446655440000', 'Caesar Dressing', 'condiments', 1500, 'ml', 300, 3000, 0.025, 'Sauce Makers Ltd', 'CAES001', '1234567890141', 'refrigerated'),
    ('550e8400-e29b-41d4-a716-446655440422', '550e8400-e29b-41d4-a716-446655440000', 'Croutons', 'bakery', 800, 'g', 200, 2000, 0.018, 'Bakery Supply Co', 'CROU001', '1234567890142', 'room'),
    ('550e8400-e29b-41d4-a716-446655440423', '550e8400-e29b-41d4-a716-446655440000', 'Parmesan Cheese', 'dairy', 1000, 'g', 200, 2000, 0.045, 'Dairy Co', 'PARM001', '1234567890143', 'refrigerated'),
    
    -- Common ingredients
    ('550e8400-e29b-41d4-a716-446655440430', '550e8400-e29b-41d4-a716-446655440000', 'Salt', 'spices', 2000, 'g', 500, 5000, 0.002, 'Spice World', 'SALT001', '1234567890150', 'room'),
    ('550e8400-e29b-41d4-a716-446655440431', '550e8400-e29b-41d4-a716-446655440000', 'Black Pepper', 'spices', 500, 'g', 100, 1000, 0.025, 'Spice World', 'PEPP001', '1234567890151', 'room'),
    ('550e8400-e29b-41d4-a716-446655440432', '550e8400-e29b-41d4-a716-446655440000', 'Vegetable Oil', 'oils', 2000, 'ml', 500, 5000, 0.008, 'Oil Suppliers Inc', 'VEGO001', '1234567890152', 'room');

-- Generate some stock alerts for demonstration
INSERT INTO stock_alerts (tenant_id, inventory_item_id, item_name, alert_type, current_stock, minimum_stock, severity) VALUES 
    ('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440413', 'Fresh Basil', 'low_stock', 200, 50, 'medium'),
    ('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440431', 'Black Pepper', 'low_stock', 500, 100, 'low');

-- Create a sample kitchen order for demonstration
-- First, let's create a sample customer order
INSERT INTO customers (id, tenant_id, name, email, phone, address) VALUES (
    '550e8400-e29b-41d4-a716-446655440031',
    '550e8400-e29b-41d4-a716-446655440000',
    'Maria Santos',
    'maria@email.com',
    '(11) 99888-7777',
    '{
        "street": "Rua das Flores",
        "number": "789",
        "complement": "Casa 2",
        "neighborhood": "Vila Nova",
        "city": "São Paulo",
        "state": "SP",
        "zipCode": "01234-567",
        "coordinates": {"lat": -23.5505, "lng": -46.6333}
    }'::jsonb
) ON CONFLICT (tenant_id, phone) DO NOTHING;

-- Create a sample order
INSERT INTO orders (id, tenant_id, number, customer_id, items, status, channel, payment, delivery, subtotal, total, notes) VALUES (
    '550e8400-e29b-41d4-a716-446655440500',
    '550e8400-e29b-41d4-a716-446655440000',
    '#1002',
    '550e8400-e29b-41d4-a716-446655440031',
    '[
        {
            "id": "item1",
            "productId": "550e8400-e29b-41d4-a716-446655440020",
            "name": "X-Burger Clássico",
            "price": 24.90,
            "quantity": 2,
            "extras": [{"name": "Bacon", "price": 5.00}],
            "notes": "Sem cebola"
        },
        {
            "id": "item2", 
            "productId": "550e8400-e29b-41d4-a716-446655440022",
            "name": "Refrigerante Lata",
            "price": 5.50,
            "quantity": 2,
            "extras": [],
            "notes": ""
        }
    ]'::jsonb,
    'confirmed',
    'whatsapp',
    '{"method": "pix", "status": "paid", "amount": 70.80}'::jsonb,
    '{"type": "delivery", "address": {"street": "Rua das Flores", "number": "789"}, "fee": 5.00}'::jsonb,
    65.80,
    70.80,
    'Entregar no portão'
);

-- The kitchen order will be automatically created by the trigger when the order status is 'confirmed'
-- Let's also manually create one for demonstration
INSERT INTO kitchen_orders (id, tenant_id, order_id, status, priority, special_instructions, estimated_completion_time, items) VALUES (
    '550e8400-e29b-41d4-a716-446655440600',
    '550e8400-e29b-41d4-a716-446655440000',
    '550e8400-e29b-41d4-a716-446655440500',
    'received',
    'medium',
    'Sem cebola no burger. Entregar no portão.',
    NOW() + INTERVAL '25 minutes',
    '[
        {
            "id": "item1",
            "productId": "550e8400-e29b-41d4-a716-446655440020",
            "name": "X-Burger Clássico",
            "quantity": 2,
            "modifications": ["sem cebola", "bacon extra"],
            "allergens": ["dairy", "gluten"],
            "preparationNotes": "Cliente pediu sem cebola",
            "status": "pending",
            "estimatedTime": 15,
            "stationId": "550e8400-e29b-41d4-a716-446655440100"
        },
        {
            "id": "item2",
            "productId": "550e8400-e29b-41d4-a716-446655440022", 
            "name": "Refrigerante Lata",
            "quantity": 2,
            "modifications": [],
            "allergens": [],
            "preparationNotes": "",
            "status": "pending",
            "estimatedTime": 1,
            "stationId": "550e8400-e29b-41d4-a716-446655440103"
        }
    ]'::jsonb
) ON CONFLICT (tenant_id, order_id) DO NOTHING;

-- Create some sample status update logs
INSERT INTO status_update_logs (tenant_id, order_id, kitchen_order_id, previous_status, new_status, updated_by, station_id, notes) VALUES 
    (
        '550e8400-e29b-41d4-a716-446655440000',
        '550e8400-e29b-41d4-a716-446655440500',
        '550e8400-e29b-41d4-a716-446655440600',
        'pending',
        'received',
        'Sistema Automático',
        NULL,
        'Pedido recebido automaticamente do sistema de pedidos'
    );

-- Create a sample ingredient delivery
INSERT INTO ingredient_deliveries (id, tenant_id, supplier, delivery_date, invoice_number, total_cost, items, received_by, quality_approved, notes) VALUES (
    '550e8400-e29b-41d4-a716-446655440700',
    '550e8400-e29b-41d4-a716-446655440000',
    'Fresh Produce Inc',
    CURRENT_DATE,
    'INV-2024-001',
    250.00,
    '[
        {
            "inventoryItemId": "550e8400-e29b-41d4-a716-446655440402",
            "itemName": "Lettuce",
            "quantity": 2000,
            "unit": "g",
            "costPerUnit": 0.008,
            "qualityCheck": "passed",
            "notes": "Fresh and crisp"
        },
        {
            "inventoryItemId": "550e8400-e29b-41d4-a716-446655440403",
            "itemName": "Tomato", 
            "quantity": 3000,
            "unit": "g",
            "costPerUnit": 0.012,
            "qualityCheck": "passed",
            "notes": "Good ripeness"
        }
    ]'::jsonb,
    '550e8400-e29b-41d4-a716-446655440001', -- Admin user
    true,
    'Delivery received in good condition'
);

-- Update inventory based on the delivery
UPDATE inventory_items 
SET 
    current_stock = current_stock + 2000,
    last_updated = NOW()
WHERE id = '550e8400-e29b-41d4-a716-446655440402';

UPDATE inventory_items 
SET 
    current_stock = current_stock + 3000,
    last_updated = NOW()
WHERE id = '550e8400-e29b-41d4-a716-446655440403';

-- Record the inventory updates
INSERT INTO inventory_updates (tenant_id, inventory_item_id, type, quantity, reason, performed_by, timestamp) VALUES 
    (
        '550e8400-e29b-41d4-a716-446655440000',
        '550e8400-e29b-41d4-a716-446655440402',
        'delivery',
        2000,
        'Fresh Produce Inc delivery - INV-2024-001',
        '550e8400-e29b-41d4-a716-446655440001',
        NOW()
    ),
    (
        '550e8400-e29b-41d4-a716-446655440000',
        '550e8400-e29b-41d4-a716-446655440403',
        'delivery',
        3000,
        'Fresh Produce Inc delivery - INV-2024-001',
        '550e8400-e29b-41d4-a716-446655440001',
        NOW()
    );