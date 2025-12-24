const { DatabaseConnection } = require('../shared/dist/database');

async function fixKitchenTables() {
  try {
    const db = DatabaseConnection.getInstance();
    const client = await db.connect();
    
    console.log('Adding missing columns to kitchen_orders...');
    
    // Add missing columns
    await client.query(`
      ALTER TABLE kitchen_orders 
      ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE CASCADE
    `);
    
    await client.query(`
      ALTER TABLE kitchen_orders 
      ADD COLUMN IF NOT EXISTS priority VARCHAR(10) NOT NULL DEFAULT 'normal' 
      CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
    `);
    
    await client.query(`
      ALTER TABLE kitchen_orders 
      ADD COLUMN IF NOT EXISTS estimated_completion_time TIMESTAMP WITH TIME ZONE
    `);
    
    console.log('✅ Missing columns added');
    
    // Add unique constraints (ignore if they already exist)
    try {
      await client.query('ALTER TABLE kitchen_orders ADD CONSTRAINT kitchen_orders_contract_unique UNIQUE (contract_id)');
    } catch (e) {
      console.log('Contract unique constraint already exists');
    }
    
    try {
      await client.query('ALTER TABLE kitchen_orders ADD CONSTRAINT kitchen_orders_order_unique UNIQUE (order_id)');
    } catch (e) {
      console.log('Order unique constraint already exists');
    }
    
    console.log('✅ Constraints processed');
    
    // Create indexes
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
    
    console.log('🎉 Kitchen tables fixed successfully!');
    
    client.release();
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    process.exit(1);
  }
}

fixKitchenTables();