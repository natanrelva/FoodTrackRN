const { DatabaseConnection } = require('../shared/dist/database');

async function fixKitchenStatusConstraint() {
  try {
    const db = DatabaseConnection.getInstance();
    const client = await db.connect();
    
    console.log('Dropping old constraint...');
    await client.query('ALTER TABLE kitchen_orders DROP CONSTRAINT IF EXISTS kitchen_orders_status_check');
    
    console.log('Updating existing kitchen orders with old status values...');
    await client.query(`UPDATE kitchen_orders SET status = 'preparing' WHERE status = 'in_preparation'`);
    await client.query(`UPDATE kitchen_orders SET status = 'failed' WHERE status = 'on_hold'`);
    
    console.log('Adding new constraint with correct status values...');
    await client.query(`
      ALTER TABLE kitchen_orders 
      ADD CONSTRAINT kitchen_orders_status_check 
      CHECK (status IN ('pending', 'assigned', 'preparing', 'ready', 'completed', 'failed'))
    `);
    
    console.log('✅ Kitchen orders status constraint updated successfully!');
    
    client.release();
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    process.exit(1);
  }
}

fixKitchenStatusConstraint();