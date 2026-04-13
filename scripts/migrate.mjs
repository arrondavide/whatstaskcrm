import postgres from 'postgres';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL, { prepare: false });
const migration = fs.readFileSync('src/db/migrations/0001_search_vector_trigger.sql', 'utf8');

try {
  await sql.unsafe(migration);
  console.log('Search vector migration applied successfully');
} catch (e) {
  console.error('Error:', e.message);
}

await sql.end();
