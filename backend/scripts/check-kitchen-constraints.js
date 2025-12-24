const { DatabaseConnection } = require('../shared/dist/database');

async function checkKitchenConstraints() {
  try {
    const db = DatabaseConnection.getInstance();
    const client = await db.connect();
    
    console.log('Checking kitchen orders status constraint...');
    const result = await client.query(`
      SELECT pg_get_constraintdef(oid) as definition 
      FROM pg_constraint 
      WHERE conname = 'kitchen_orders_status_check'
    `);
    
    console.log('Kitchen orders status constraint:');
    if (result.rows.length > 0) {
      console.log(result.rows[0].definition);
    } else {
      console.log('No constraint found');
    }
    
    // Also check what statuses are currently in the table
    console.log('\nCurrent kitchen order statuses:');
    const statusResult = await client.query('SELECT status, COUNT(*) as count FROM kitchen_orders GROUP BY status');
    statusResult.rows.forEach(row => {
      console.log(`- ${row.status}: ${row.count}`);
    });
    
    client.release();
  } catch (error) {
    console.error('❌ Check failed:', error.message);
    process.exit(1);
  }
}

checkKitchenConstraints();