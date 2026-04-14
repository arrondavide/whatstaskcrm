import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

try {
  // Allow authenticated users to upload files
  await sql.unsafe(`
    CREATE POLICY "Allow authenticated uploads"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'files');
  `);

  // Allow authenticated users to read files
  await sql.unsafe(`
    CREATE POLICY "Allow authenticated reads"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'files');
  `);

  // Allow public reads (for public URLs to work)
  await sql.unsafe(`
    CREATE POLICY "Allow public reads"
    ON storage.objects FOR SELECT
    TO anon
    USING (bucket_id = 'files');
  `);

  // Allow authenticated users to delete their own files
  await sql.unsafe(`
    CREATE POLICY "Allow authenticated deletes"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'files');
  `);

  console.log('Storage RLS policies created successfully');
} catch (e) {
  console.error('Error:', e.message);
}

await sql.end();
