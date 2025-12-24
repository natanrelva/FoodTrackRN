const { DatabaseConnection } = require('../shared/dist/database');

async function runKitchenMigration() {
  try {
    const db = DatabaseConnection.getInstance();
    const client = await db.connect();
    
    console.log('Creating stations table...');
    await client.query(`
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
      )
    `);
    console.log('✅ Stations table created');
    
    console.log('Creating kitchen_orders table...');
    await client.query(`
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
      )
    `);
    console.log('✅ Kitchen orders table created');
    
    console.log('Creating kitchen_order_items table...');
    await client.query(`
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
      )
    `);
    console.log('✅ Kitchen order items table created');
    
    console.log('Creating indexes...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_kitchen_orders_tenant_id ON kitchen_orders(tenant_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_kitchen_orders_status ON kitchen_orders(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_kitchen_orders_priority ON kitchen_orders(priority)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_kitchen_orders_assigned_station ON kitchen_orders(assigned_station)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_kitchen_orders_contract_id ON kitchen_orders(contract_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_kitchen_orders_order_id ON kitchen_orders(order_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_kitchen_order_items_kitchen_order_id ON kitchen_order_items(kitchen_order_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_kitchen_order_items_product_id ON kitchen_order_items(product_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_stations_tenant_id ON stations(tenant_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_stations_type ON stations(type)');
    console.log('✅ Indexes created');
    
    console.log('Creating default stations...');
    const tenants = await client.query('SELECT id FROM tenants');
    
    for (const tenant of tenants.rows) {
      const stations = [
        { name: 'Grill Station', type: 'grill', capacity: 3 },
        { name: 'Fryer Station', type: 'fryer', capacity: 2 },
        { name: 'Assembly Station', type: 'assembly', capacity: 4 },
        { name: 'Cold Station', type: 'cold', capacity: 2 }
      ];
      
      for (const station of stations) {
        await client.query(`
          INSERT INTO stations (tenant_id, name, type, capacity, current_load, active) 
          VALUES ($1, $2, $3, $4, 0, true) 
          ON CONFLICT (tenant_id, name) DO NOTHING
        `, [tenant.id, station.name, station.type, station.capacity]);
      }
    }
    
    console.log('✅ Default stations created');
    console.log('🎉 Kitchen migration completed successfully!');
    
    client.release();
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runKitchenMigration();