const { DatabaseConnection } = require('../shared/dist/database');

async function updateOrderStatuses() {
  try {
    const db = DatabaseConnection.getInstance();
    const client = await db.connect();
    
    console.log('Checking existing order statuses...');
    const statusResult = await client.query('SELECT status, COUNT(*) as count FROM orders GROUP BY status');
    
    console.log('Current status distribution:');
    statusResult.rows.forEach(row => {
      console.log(`- ${row.status}: ${row.count}`);
    });
    
    console.log('Updating pending orders to draft...');
    const updateResult = await client.query(`UPDATE orders SET status = 'draft' WHERE status = 'pending'`);
    console.log(`Updated ${updateResult.rowCount} orders`);
    
    console.log('Updating preparing orders to in_preparation...');
    const updateResult2 = await client.query(`UPDATE orders SET status = 'in_preparation' WHERE status = 'preparing'`);
    console.log(`Updated ${updateResult2.rowCount} orders`);
    
    console.log('✅ Order statuses updated successfully!');
    
    client.release();
  } catch (error) {
    console.error('❌ Update failed:', error.message);
    process.exit(1);
  }
}

updateOrderStatuses();