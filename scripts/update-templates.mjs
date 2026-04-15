import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

try {
  await sql.unsafe(`ALTER TABLE templates ADD COLUMN IF NOT EXISTS blocks JSONB DEFAULT '[]'`);
  await sql.unsafe(`ALTER TABLE templates ADD COLUMN IF NOT EXISTS styles JSONB DEFAULT '{}'`);
  console.log('Templates schema updated');
} catch (e) {
  console.error('Error:', e.message);
}

await sql.end();
