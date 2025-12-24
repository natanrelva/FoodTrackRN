const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'foodtrack_dev',
  user: process.env.DB_USER || 'foodtrack',
  password: process.env.DB_PASSWORD || 'foodtrack123',
});

async function runMigrations() {
  try {
    console.log('🔄 Executando migrations...');

    // Create migrations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Get list of migration files
    const migrationsDir = __dirname;
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      // Check if migration was already executed
      const result = await pool.query(
        'SELECT id FROM migrations WHERE filename = $1',
        [file]
      );

      if (result.rows.length > 0) {
        console.log(`⏭️  Pulando ${file} (já executado)`);
        continue;
      }

      console.log(`🔄 Executando ${file}...`);

      // Read and execute migration
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      await pool.query(sql);

      // Mark migration as executed
      await pool.query(
        'INSERT INTO migrations (filename) VALUES ($1)',
        [file]
      );

      console.log(`✅ ${file} executado com sucesso`);
    }

    console.log('🎉 Todas as migrations foram executadas!');
  } catch (error) {
    console.error('❌ Erro ao executar migrations:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();