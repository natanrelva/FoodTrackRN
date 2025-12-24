-- Comprehensive seed data matching frontend mock data
-- This replaces and extends the existing seed data

-- Clear existing data (in correct order due to foreign keys)
DELETE FROM outbox_events;
DELETE FROM domain_events;
DELETE FROM event_snapshots;
DELETE FROM event_subscriptions;
DELETE FROM station_assignments;
DELETE FROM kitchen_orders;
DELETE FROM production_contracts;
DELETE FROM recipes;
DELETE FROM notifications;
DELETE FROM orders;
DELETE FROM customers;
DELETE FROM products;
DELETE FROM categories;
DELETE FROM users;
DELETE FROM tenants;

-- Insert sample tenant
INSERT INTO tenants (id, name, slug, email, phone, address, settings, subscription) VALUES 
(
    '550e8400-e29b-41d4-a716-446655440000',
    'Burger Palace',
    'burger-palace',
    'admin@burgerpalace.com',
    '(11) 3333-4444',
    '{"street": "Rua dos Restaurantes, 123", "city": "São Paulo", "state": "SP", "zipCode": "01234-567", "neighborhood": "Centro"}',
    '{"theme": "red", "currency": "BRL", "timezone": "America/Sao_Paulo", "language": "pt-BR"}',
    '{"plan": "premium", "status": "active", "expires_at": "2025-12-31T23:59:59Z"}'
);

-- Insert admin user
INSERT INTO users (id, tenant_id, email, password, name, role, permissions) VALUES 
(
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440000',
    'admin@burgerpalace.com',
    '$2b$10$rOzJaHq.xvjZjKqY5s5Jj.5J5J5J5J5J5J5J5J5J5J5J5J5J5J5J5J', -- password: admin123
    'Administrador',
    'admin',
    '["orders:read", "orders:write", "products:read", "products:write", "analytics:read", "users:read", "users:write"]'
);

-- Insert categories
INSERT INTO categories (id, tenant_id, name, description, icon, color, sort_order) VALUES 
('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440000', 'Lanches', 'Hambúrguers e sanduíches', 'burger', '#FF6B35', 1),
('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440000', 'Pizzas', 'Pizzas tradicionais e especiais', 'pizza', '#FF8E53', 2),
('550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440000', 'Pratos Principais', 'Pratos elaborados', 'utensils', '#FF9F40', 3),
('550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440000', 'Saladas', 'Saladas frescas e saudáveis', 'leaf', '#4ECDC4', 4),
('550e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440000', 'Acompanhamentos', 'Batatas, anéis de cebola', 'french-fries', '#45B7D1', 5),
('550e8400-e29b-41d4-a716-446655440015', '550e8400-e29b-41d4-a716-446655440000', 'Bebidas', 'Refrigerantes, sucos e águas', 'glass', '#96CEB4', 6),
('550e8400-e29b-41d4-a716-446655440016', '550e8400-e29b-41d4-a716-446655440000', 'Sobremesas', 'Doces e sobremesas', 'cake', '#FFEAA7', 7);

-- Insert products (matching frontend mock data)
INSERT INTO products (id, tenant_id, name, description, price, image, category, stock, active, preparation_time) VALUES 
(
    '550e8400-e29b-41d4-a716-446655440020',
    '550e8400-e29b-41d4-a716-446655440000',
    'Pizza Margherita',
    'Molho de tomate, mussarela, manjericão e azeite',
    45.90,
    'pizza-margherita.jpg',
    'Pizzas',
    25,
    true,
    45
),
(
    '550e8400-e29b-41d4-a716-446655440021',
    '550e8400-e29b-41d4-a716-446655440000',
    'Hambúrguer Artesanal',
    'Pão brioche, blend 180g, queijo cheddar, alface e tomate',
    35.00,
    'burger-artesanal.jpg',
    'Lanches',
    30,
    true,
    25
),
(
    '550e8400-e29b-41d4-a716-446655440022',
    '550e8400-e29b-41d4-a716-446655440000',
    'Risoto de Camarão',
    'Arroz arbóreo, camarões, alho-poró e parmesão',
    68.00,
    'risoto-camarao.jpg',
    'Pratos Principais',
    15,
    true,
    35
),
(
    '550e8400-e29b-41d4-a716-446655440023',
    '550e8400-e29b-41d4-a716-446655440000',
    'Salada Caesar',
    'Alface romana, croutons, parmesão e molho caesar',
    28.00,
    'salada-caesar.jpg',
    'Saladas',
    20,
    true,
    15
),
(
    '550e8400-e29b-41d4-a716-446655440024',
    '550e8400-e29b-41d4-a716-446655440000',
    'Batata Frita',
    'Batatas fritas crocantes com sal especial',
    15.00,
    'batata-frita.jpg',
    'Acompanhamentos',
    50,
    true,
    10
),
(
    '550e8400-e29b-41d4-a716-446655440025',
    '550e8400-e29b-41d4-a716-446655440000',
    'Refrigerante 2L',
    'Refrigerante gelado 2 litros',
    10.00,
    'refrigerante-2l.jpg',
    'Bebidas',
    40,
    true,
    2
);

-- Insert sample customers
INSERT INTO customers (id, tenant_id, name, email, phone, address) VALUES 
(
    '550e8400-e29b-41d4-a716-446655440030',
    '550e8400-e29b-41d4-a716-446655440000',
    'João Silva',
    'joao.silva@email.com',
    '(11) 98765-4321',
    '{"street": "Rua das Flores, 123", "neighborhood": "Centro", "city": "São Paulo", "state": "SP", "zipCode": "01234-567"}'
),
(
    '550e8400-e29b-41d4-a716-446655440031',
    '550e8400-e29b-41d4-a716-446655440000',
    'Maria Santos',
    'maria.santos@email.com',
    '(11) 97654-3210',
    '{"street": "Av. Principal, 456", "neighborhood": "Jardim", "city": "São Paulo", "state": "SP", "zipCode": "02345-678"}'
),
(
    '550e8400-e29b-41d4-a716-446655440032',
    '550e8400-e29b-41d4-a716-446655440000',
    'Carlos Oliveira',
    'carlos.oliveira@email.com',
    '(11) 96543-2109',
    '{"street": "Rua dos Comerciantes, 789", "neighborhood": "Vila Nova", "city": "São Paulo", "state": "SP", "zipCode": "03456-789"}'
),
(
    '550e8400-e29b-41d4-a716-446655440033',
    '550e8400-e29b-41d4-a716-446655440000',
    'Ana Paula',
    'ana.paula@email.com',
    '(11) 95432-1098',
    '{"street": "Travessa das Palmeiras, 321", "neighborhood": "Bosque", "city": "São Paulo", "state": "SP", "zipCode": "04567-890"}'
);

-- Insert sample orders (matching frontend mock data)
INSERT INTO orders (id, tenant_id, number, customer_id, items, status, channel, payment, delivery, subtotal, total, created_at) VALUES 
(
    '550e8400-e29b-41d4-a716-446655440040',
    '550e8400-e29b-41d4-a716-446655440000',
    '#1234',
    '550e8400-e29b-41d4-a716-446655440030',
    '[
        {"id": "550e8400-e29b-41d4-a716-446655440020", "name": "Pizza Margherita", "quantity": 1, "price": 45.90, "extras": ["Borda recheada"]},
        {"id": "550e8400-e29b-41d4-a716-446655440025", "name": "Refrigerante 2L", "quantity": 1, "price": 10.00, "extras": []}
    ]',
    'preparing',
    'whatsapp',
    '{"method": "pix", "status": "confirmed", "amount": 55.90}',
    '{"type": "delivery", "address": "Rua das Flores, 123 - Centro", "fee": 0}',
    55.90,
    55.90,
    NOW() - INTERVAL '10 minutes'
),
(
    '550e8400-e29b-41d4-a716-446655440041',
    '550e8400-e29b-41d4-a716-446655440000',
    '#1235',
    '550e8400-e29b-41d4-a716-446655440031',
    '[
        {"id": "550e8400-e29b-41d4-a716-446655440021", "name": "Hambúrguer Artesanal", "quantity": 2, "price": 35.00, "extras": []},
        {"id": "550e8400-e29b-41d4-a716-446655440024", "name": "Batata Frita", "quantity": 1, "price": 15.00, "extras": []}
    ]',
    'ready',
    'instagram',
    '{"method": "credit", "status": "confirmed", "amount": 85.00}',
    '{"type": "pickup", "address": "", "fee": 0}',
    85.00,
    85.00,
    NOW() - INTERVAL '30 minutes'
),
(
    '550e8400-e29b-41d4-a716-446655440042',
    '550e8400-e29b-41d4-a716-446655440000',
    '#1236',
    '550e8400-e29b-41d4-a716-446655440032',
    '[
        {"id": "550e8400-e29b-41d4-a716-446655440022", "name": "Risoto de Camarão", "quantity": 1, "price": 68.00, "extras": []},
        {"id": "550e8400-e29b-41d4-a716-446655440025", "name": "Refrigerante 2L", "quantity": 1, "price": 10.00, "extras": []}
    ]',
    'delivering',
    'website',
    '{"method": "pix", "status": "confirmed", "amount": 78.00}',
    '{"type": "delivery", "address": "Rua dos Comerciantes, 789 - Vila Nova", "fee": 0}',
    78.00,
    78.00,
    NOW() - INTERVAL '60 minutes'
),
(
    '550e8400-e29b-41d4-a716-446655440043',
    '550e8400-e29b-41d4-a716-446655440000',
    '#1237',
    '550e8400-e29b-41d4-a716-446655440033',
    '[
        {"id": "550e8400-e29b-41d4-a716-446655440023", "name": "Salada Caesar", "quantity": 1, "price": 28.00, "extras": []}
    ]',
    'pending',
    'ifood',
    '{"method": "credit", "status": "pending", "amount": 28.00}',
    '{"type": "delivery", "address": "Travessa das Palmeiras, 321 - Bosque", "fee": 0}',
    28.00,
    28.00,
    NOW() - INTERVAL '5 minutes'
);

-- Insert sample recipes (matching kitchen mock data)
INSERT INTO recipes (id, tenant_id, dish_id, name, description, ingredients, instructions, preparation_time, cooking_time, difficulty, allergens) VALUES 
(
    '550e8400-e29b-41d4-a716-446655440050',
    '550e8400-e29b-41d4-a716-446655440000',
    '550e8400-e29b-41d4-a716-446655440021',
    'Hambúrguer Artesanal',
    'Receita do hambúrguer artesanal da casa',
    '[
        {"name": "Carne moída", "quantity": 180, "unit": "g", "isOptional": false},
        {"name": "Pão brioche", "quantity": 1, "unit": "pcs", "isOptional": false},
        {"name": "Queijo cheddar", "quantity": 1, "unit": "fatia", "isOptional": false},
        {"name": "Alface", "quantity": 2, "unit": "folhas", "isOptional": false},
        {"name": "Tomate", "quantity": 2, "unit": "fatias", "isOptional": false}
    ]',
    '[
        {"stepNumber": 1, "instruction": "Formar hambúrguer com a carne moída", "duration": 3},
        {"stepNumber": 2, "instruction": "Grelhar por 4 minutos de cada lado", "duration": 8},
        {"stepNumber": 3, "instruction": "Tostar o pão", "duration": 2},
        {"stepNumber": 4, "instruction": "Montar o hambúrguer", "duration": 2}
    ]',
    10,
    15,
    'medium',
    '["glúten", "lactose"]'
),
(
    '550e8400-e29b-41d4-a716-446655440051',
    '550e8400-e29b-41d4-a716-446655440000',
    '550e8400-e29b-41d4-a716-446655440023',
    'Salada Caesar',
    'Receita da salada caesar tradicional',
    '[
        {"name": "Alface romana", "quantity": 200, "unit": "g", "isOptional": false},
        {"name": "Queijo parmesão", "quantity": 50, "unit": "g", "isOptional": false},
        {"name": "Croutons", "quantity": 30, "unit": "g", "isOptional": false},
        {"name": "Molho caesar", "quantity": 60, "unit": "ml", "isOptional": false}
    ]',
    '[
        {"stepNumber": 1, "instruction": "Lavar e secar a alface", "duration": 3},
        {"stepNumber": 2, "instruction": "Cortar a alface em pedaços", "duration": 2},
        {"stepNumber": 3, "instruction": "Adicionar molho e misturar", "duration": 2},
        {"stepNumber": 4, "instruction": "Finalizar com parmesão e croutons", "duration": 3}
    ]',
    10,
    5,
    'easy',
    '["lactose", "glúten"]'
),
(
    '550e8400-e29b-41d4-a716-446655440052',
    '550e8400-e29b-41d4-a716-446655440000',
    '550e8400-e29b-41d4-a716-446655440020',
    'Pizza Margherita',
    'Receita da pizza margherita tradicional',
    '[
        {"name": "Massa de pizza", "quantity": 250, "unit": "g", "isOptional": false},
        {"name": "Molho de tomate", "quantity": 80, "unit": "ml", "isOptional": false},
        {"name": "Mussarela fresca", "quantity": 125, "unit": "g", "isOptional": false},
        {"name": "Manjericão fresco", "quantity": 10, "unit": "folhas", "isOptional": false},
        {"name": "Azeite extra virgem", "quantity": 15, "unit": "ml", "isOptional": false}
    ]',
    '[
        {"stepNumber": 1, "instruction": "Pré-aquecer forno a 250°C", "duration": 15},
        {"stepNumber": 2, "instruction": "Abrir a massa", "duration": 5},
        {"stepNumber": 3, "instruction": "Espalhar molho de tomate", "duration": 2},
        {"stepNumber": 4, "instruction": "Adicionar mussarela", "duration": 3},
        {"stepNumber": 5, "instruction": "Assar por 12-15 minutos", "duration": 15},
        {"stepNumber": 6, "instruction": "Finalizar com manjericão e azeite", "duration": 2}
    ]',
    25,
    20,
    'hard',
    '["glúten", "lactose"]'
);

-- Insert sample production contracts
INSERT INTO production_contracts (id, tenant_id, order_id, contract_data, priority, estimated_completion_time, status) VALUES 
(
    '550e8400-e29b-41d4-a716-446655440060',
    '550e8400-e29b-41d4-a716-446655440000',
    '550e8400-e29b-41d4-a716-446655440040',
    '{
        "items": [
            {
                "productionItemId": "550e8400-e29b-41d4-a716-446655440070",
                "productId": "550e8400-e29b-41d4-a716-446655440020",
                "recipeId": "550e8400-e29b-41d4-a716-446655440052",
                "quantity": 1,
                "modifications": ["Borda recheada"]
            }
        ]
    }',
    'high',
    NOW() + INTERVAL '45 minutes',
    'in_preparation'
);

-- Insert sample kitchen orders
INSERT INTO kitchen_orders (id, tenant_id, contract_id, assigned_station, status, started_at) VALUES 
(
    '550e8400-e29b-41d4-a716-446655440080',
    '550e8400-e29b-41d4-a716-446655440000',
    '550e8400-e29b-41d4-a716-446655440060',
    'pizza-station-01',
    'in_preparation',
    NOW() - INTERVAL '5 minutes'
);

-- Insert event subscriptions for system integration
INSERT INTO event_subscriptions (subscription_name, event_type, handler_name, is_active) VALUES 
('order-to-kitchen-handler', 'OrderConfirmed', 'ProductionContractHandler', true),
('kitchen-to-order-handler', 'KitchenOrderReady', 'OrderStatusHandler', true),
('product-availability-handler', 'ProductUpdated', 'AvailabilityHandler', true),
('analytics-handler', 'OrderCreated', 'AnalyticsHandler', true);