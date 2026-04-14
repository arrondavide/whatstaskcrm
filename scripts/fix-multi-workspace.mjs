import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

try {
  // Drop the unique constraint on auth_uid alone
  await sql.unsafe(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_auth_uid_unique`);
  await sql.unsafe(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_auth_uid_key`);

  // Add unique constraint on (tenant_id, auth_uid) instead
  await sql.unsafe(`ALTER TABLE users ADD CONSTRAINT users_tenant_auth_uid UNIQUE (tenant_id, auth_uid)`);

  console.log('Multi-workspace migration applied successfully');
} catch (e) {
  console.error('Error:', e.message);
}

await sql.end();
