// Quick script to test database connection
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful!');
    console.log('Current time:', result.rows[0].now);
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection failed!');
    console.error('Error:', error.message);
    console.error('\n💡 Tips:');
    console.error('1. Check your DATABASE_URL in .env file');
    console.error('2. Make sure PostgreSQL is running');
    console.error('3. Verify the password is correct');
    console.error('4. Ensure database "local_service_crm" exists');
    await pool.end();
    process.exit(1);
  }
}

testConnection();

