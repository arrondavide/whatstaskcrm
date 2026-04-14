import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

try {
  // Record Links
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS record_links (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      source_record_id UUID NOT NULL REFERENCES records(id) ON DELETE CASCADE,
      target_record_id UUID NOT NULL REFERENCES records(id) ON DELETE CASCADE,
      link_type TEXT DEFAULT 'related',
      created_by TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `);
  await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_record_links_source ON record_links(source_record_id)`);
  await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_record_links_target ON record_links(target_record_id)`);

  // Record Revisions
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS record_revisions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      record_id UUID NOT NULL REFERENCES records(id) ON DELETE CASCADE,
      version INT NOT NULL,
      data JSONB NOT NULL,
      changes JSONB,
      changed_by TEXT NOT NULL,
      changed_by_name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `);
  await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_revisions_record ON record_revisions(record_id, version)`);

  // Record Comments
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS record_comments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      record_id UUID NOT NULL REFERENCES records(id) ON DELETE CASCADE,
      parent_id UUID,
      content TEXT NOT NULL,
      author_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      edited BOOLEAN DEFAULT false,
      deleted BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `);
  await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_comments_record ON record_comments(record_id, created_at)`);

  console.log('Data power tables created successfully');
} catch (e) {
  console.error('Error:', e.message);
}

await sql.end();
