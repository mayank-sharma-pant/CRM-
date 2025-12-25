// Simple script to check .env file format
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '.env');

console.log('🔍 Checking .env file...\n');

if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found!');
  console.log('\n💡 Create .env file from .env.example:');
  console.log('   copy .env.example .env');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const lines = envContent.split('\n');

console.log('📄 .env file found!\n');

// Check for DATABASE_URL
const dbUrlLine = lines.find(line => line.startsWith('DATABASE_URL'));
if (!dbUrlLine) {
  console.error('❌ DATABASE_URL not found in .env file!');
  process.exit(1);
}

console.log('✅ DATABASE_URL found:');
console.log('   ' + dbUrlLine.replace(/:[^:@]+@/, ':****@')); // Hide password

// Check format
const dbUrlMatch = dbUrlLine.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
if (!dbUrlMatch) {
  console.error('\n❌ DATABASE_URL format is incorrect!');
  console.log('\n💡 Correct format:');
  console.log('   DATABASE_URL=postgresql://postgres:PASSWORD@localhost:5432/local_service_crm');
  process.exit(1);
}

const [, user, password, host, port, database] = dbUrlMatch;

console.log('\n📋 Connection Details:');
console.log('   User:', user);
console.log('   Password:', password ? '***' + password.slice(-2) : '(empty)');
console.log('   Host:', host);
console.log('   Port:', port);
console.log('   Database:', database);

// Check if password is placeholder
if (password === 'password' || password === 'YOUR_PASSWORD' || password.includes('change')) {
  console.log('\n⚠️  WARNING: Password looks like a placeholder!');
  console.log('   Update it with your actual PostgreSQL password.');
}

// Check database name
if (database !== 'local_service_crm') {
  console.log('\n⚠️  WARNING: Database name is not "local_service_crm"');
  console.log('   Make sure the database exists!');
}

console.log('\n✅ .env file format looks correct!');
console.log('\n💡 Next step: Run "npm run test-db" to test the connection');

