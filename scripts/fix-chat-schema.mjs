import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

try {
  await sql.unsafe(`ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false`);
  await sql.unsafe(`ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS created_by TEXT`);
  console.log('Chat schema updated successfully');
} catch (e) {
  console.error('Error:', e.message);
}

await sql.end();
