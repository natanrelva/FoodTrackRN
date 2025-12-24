const { DatabaseConnection } = require('../shared/dist/database');

async function fixOrderStatusConstraint() {
  try {
    const db = DatabaseConnection.getInstance();
    const client = await db.connect();
    
    console.log('Dropping old constraint...');
    await client.query('ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check');
    
    console.log('Adding new constraint with correct status values...');
    await client.query(`
      ALTER TABLE orders 
      ADD CONSTRAINT orders_status_check 
      CHECK (status IN ('draft', 'confirmed', 'in_preparation', 'ready', 'delivering', 'delivered', 'cancelled'))
    `);
    
    console.log('✅ Order status constraint updated successfully!');
    
    client.release();
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    process.exit(1);
  }
}

fixOrderStatusConstraint();