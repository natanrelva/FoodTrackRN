-- Insert demo tenant
INSERT INTO tenants (id, name, slug, email, phone, address, settings, subscription) VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'Restaurante Demo',
    'restaurante-demo',
    'contato@restaurantedemo.com',
    '(11) 99999-9999',
    '{
        "street": "Rua das Flores",
        "number": "123",
        "complement": "Loja 1",
        "neighborhood": "Centro",
        "city": "São Paulo",
        "state": "SP",
        "zipCode": "01234-567"
    }',
    '{
        "currency": "BRL",
        "timezone": "America/Sao_Paulo",
        "businessHours": {
            "monday": {"open": "08:00", "close": "22:00"},
            "tuesday": {"open": "08:00", "close": "22:00"},
            "wednesday": {"open": "08:00", "close": "22:00"},
            "thursday": {"open": "08:00", "close": "22:00"},
            "friday": {"open": "08:00", "close": "23:00"},
            "saturday": {"open": "08:00", "close": "23:00"},
            "sunday": {"open": "10:00", "close": "20:00"}
        }
    }',
    '{
        "plan": "premium",
        "status": "active",
        "expiresAt": "2025-12-31T23:59:59Z"
    }'
);

-- Insert demo admin user (password: admin123)
INSERT INTO users (id, tenant_id, email, password, name, role, permissions, is_active) VALUES (
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440000',
    'admin@restaurantedemo.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/A5/jF3kkS', -- admin123
    'Administrador',
    'admin',
    '["*"]',
    true
);

-- Insert categories
INSERT INTO categories (id, tenant_id, name, description, icon, color, sort_order) VALUES 
    ('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440000', 'Lanches', 'Hambúrgueres, sanduíches e pizzas', '🍔', '#FF6B35', 1),
    ('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440000', 'Bebidas', 'Refrigerantes, sucos e águas', '🥤', '#4ECDC4', 2),
    ('550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440000', 'Acompanhamentos', 'Batatas, saladas e porções', '🍟', '#45B7D1', 3),
    ('550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440000', 'Sobremesas', 'Doces, sorvetes e bolos', '🍨', '#F7DC6F', 4),
    ('550e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440000', 'Saudável', 'Saladas, grelhados e opções light', '🥗', '#58D68D', 5);

-- Insert demo products
INSERT INTO products (id, tenant_id, name, description, price, image, category, stock, active, extras, tags, preparation_time) VALUES 
    (
        '550e8400-e29b-41d4-a716-446655440020',
        '550e8400-e29b-41d4-a716-446655440000',
        'X-Burger Clássico',
        'Hambúrguer suculento, queijo cheddar, alface, tomate e molho especial',
        24.90,
        'https://images.unsplash.com/photo-1688246780164-00c01647e78c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXJnZXIlMjBmb29kfGVufDF8fHx8MTc2NTM0NjYyOHww&ixlib=rb-4.1.0&q=80&w=1080',
        'lanches',
        50,
        true,
        '[{"name": "Bacon", "price": 5.00}, {"name": "Cheddar Extra", "price": 4.00}, {"name": "Ovo", "price": 3.00}]',
        '["hamburguer", "classico", "popular"]',
        15
    ),
    (
        '550e8400-e29b-41d4-a716-446655440021',
        '550e8400-e29b-41d4-a716-446655440000',
        'Pizza Margherita',
        'Molho de tomate, mussarela, manjericão fresco e azeite',
        42.00,
        'https://images.unsplash.com/photo-1544982503-9f984c14501a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwaXp6YSUyMHNsaWNlfGVufDF8fHx8MTc2NTM1NDA4NHww&ixlib=rb-4.1.0&q=80&w=1080',
        'lanches',
        30,
        true,
        '[{"name": "Borda Recheada", "price": 8.00}, {"name": "Azeitonas", "price": 3.00}]',
        '["pizza", "italiana", "vegetariana"]',
        25
    ),
    (
        '550e8400-e29b-41d4-a716-446655440022',
        '550e8400-e29b-41d4-a716-446655440000',
        'Refrigerante Lata',
        'Coca-Cola, Guaraná ou Sprite - 350ml gelada',
        5.50,
        'https://images.unsplash.com/photo-1735643434124-f51889fa1f8c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzb2RhJTIwZHJpbmt8ZW58MXx8fHwxNzY1Mzg1OTYyfDA&ixlib=rb-4.1.0&q=80&w=1080',
        'bebidas',
        100,
        true,
        '[]',
        '["refrigerante", "gelado"]',
        1
    ),
    (
        '550e8400-e29b-41d4-a716-446655440023',
        '550e8400-e29b-41d4-a716-446655440000',
        'Batata Frita Grande',
        'Porção generosa de batatas crocantes com sal especial',
        16.00,
        'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmVuY2glMjBmcmllc3xlbnwxfHx8fDE3NjUzODM2NTB8MA&ixlib=rb-4.1.0&q=80&w=1080',
        'acompanhamentos',
        80,
        true,
        '[{"name": "Molho Cheddar", "price": 4.00}, {"name": "Molho Barbecue", "price": 3.00}]',
        '["batata", "frita", "porcao"]',
        10
    ),
    (
        '550e8400-e29b-41d4-a716-446655440024',
        '550e8400-e29b-41d4-a716-446655440000',
        'Sorvete Artesanal',
        'Duas bolas de sorvete artesanal - sabores variados',
        12.00,
        'https://images.unsplash.com/photo-1673551494246-0ea345ddbf86?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpY2UlMjBjcmVhbSUyMGRlc3NlcnR8ZW58MXx8fHwxNzY1Mzg3MzUxfDA&ixlib=rb-4.1.0&q=80&w=1080',
        'sobremesas',
        25,
        true,
        '[{"name": "Cobertura Chocolate", "price": 3.00}, {"name": "Granulado", "price": 2.00}]',
        '["sorvete", "artesanal", "gelado"]',
        5
    ),
    (
        '550e8400-e29b-41d4-a716-446655440025',
        '550e8400-e29b-41d4-a716-446655440000',
        'Salada Caesar',
        'Alface romana, croutons, parmesão e molho caesar',
        22.00,
        'https://images.unsplash.com/photo-1692780941487-505d5d908aa6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzYWxhZCUyMGhlYWx0aHl8ZW58MXx8fHwxNzY1MzEzOTYxfDA&ixlib=rb-4.1.0&q=80&w=1080',
        'saudavel',
        40,
        true,
        '[{"name": "Frango Grelhado", "price": 8.00}, {"name": "Camarão", "price": 12.00}]',
        '["salada", "saudavel", "caesar"]',
        8
    );

-- Insert demo customer
INSERT INTO customers (id, tenant_id, name, email, phone, address, preferences) VALUES (
    '550e8400-e29b-41d4-a716-446655440030',
    '550e8400-e29b-41d4-a716-446655440000',
    'João Silva',
    'joao@email.com',
    '(11) 98765-4321',
    '{
        "street": "Rua das Palmeiras",
        "number": "456",
        "complement": "Apto 101",
        "neighborhood": "Jardim América",
        "city": "São Paulo",
        "state": "SP",
        "zipCode": "01234-567",
        "coordinates": {"lat": -23.5505, "lng": -46.6333}
    }',
    '{
        "notifications": true,
        "marketing": false
    }'
);