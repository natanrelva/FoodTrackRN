const { DatabaseConnection } = require('../shared/dist/database');

async function checkConstraints() {
  try {
    const db = DatabaseConnection.getInstance();
    const client = await db.connect();
    
    console.log('Checking order status constraints...');
    const result = await client.query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conname LIKE '%orders_status%'
    `);
    
    console.log('Order status constraints:');
    result.rows.forEach(row => {
      console.log(`- ${row.conname}: ${row.definition}`);
    });
    
    // Also check what the current Order model expects
    console.log('\nChecking orders table structure...');
    const tableResult = await client.query('SELECT * FROM orders LIMIT 1');
    
    console.log('Orders table columns:');
    if (tableResult.fields) {
      tableResult.fields.forEach(field => {
        console.log(`- ${field.name}`);
      });
    }
    
    client.release();
  } catch (error) {
    console.error('Check failed:', error.message);
    process.exit(1);
  }
}

checkConstraints();