// Quick script to view database information
import pool from './config/database.js';

async function viewDatabase() {
  try {
    console.log('📊 Database Information\n');

    // Get database name
    const dbResult = await pool.query('SELECT current_database()');
    console.log('Database:', dbResult.rows[0].current_database);

    // Get data directory
    const dataDirResult = await pool.query('SHOW data_directory');
    console.log('Data Directory:', dataDirResult.rows[0].data_directory);

    // List all tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('\n📋 Tables in database:');
    tablesResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`);
    });

    // Count records in each table
    console.log('\n📈 Record Counts:');
    for (const row of tablesResult.rows) {
      try {
        const countResult = await pool.query(`SELECT COUNT(*) FROM ${row.table_name}`);
        console.log(`   ${row.table_name}: ${countResult.rows[0].count} records`);
      } catch (err) {
        // Skip if can't count
      }
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

viewDatabase();

